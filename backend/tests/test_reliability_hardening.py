import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException, ConflictException
from app.models.analysis import Analysis
from app.models.artifact import Artifact
from app.models.job_attempt import JobAttempt
from app.services.artifact_cleanup_service import ArtifactCleanupService
from app.services.idempotency_store import IdempotencyStore
from app.services.provider_rate_limiter import ProviderRateLimiter, RateLimiterTimeoutError
from app.services.scientific_cache import (
    ScientificCache,
    canonicalize_ring,
    compute_canonical_aoi_hash,
)


@pytest.mark.asyncio
async def test_canonicalize_ring_ccw_and_vertex_rotation():
    """Verify polygon ring canonicalization: CCW orientation and lexicographical start vertex."""
    # CW square: (0,0) -> (0,1) -> (1,1) -> (1,0) -> (0,0)
    cw_square = [[0.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, 0.0], [0.0, 0.0]]
    # Canonical exterior should be CCW: (0,0) -> (1,0) -> (1,1) -> (0,1) -> (0,0)
    ccw_result = canonicalize_ring(cw_square, ccw=True)
    assert ccw_result[0] == (0.0, 0.0)
    assert ccw_result[1] == (1.0, 0.0)
    assert ccw_result[-1] == (0.0, 0.0)

    # CW interior hole should remain CW
    cw_hole = [[0.2, 0.2], [0.2, 0.8], [0.8, 0.8], [0.8, 0.2], [0.2, 0.2]]
    cw_result = canonicalize_ring(cw_hole, ccw=False)
    assert cw_result[0] == (0.2, 0.2)
    assert cw_result[-1] == (0.2, 0.2)


def test_scientific_cache_canonical_aoi_hash_stability():
    """Verify that different rotations/winding of the same geometry yield identical canonical hashes."""
    aoi_1 = {
        "type": "Polygon",
        "coordinates": [[[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]],
    }
    # Same geometry started from a different vertex and reversed (CW)
    aoi_2 = {
        "type": "Polygon",
        "coordinates": [[[1.0, 1.0], [0.0, 1.0], [0.0, 0.0], [1.0, 0.0], [1.0, 1.0]]],
    }
    hash_1 = compute_canonical_aoi_hash(aoi_1)
    hash_2 = compute_canonical_aoi_hash(aoi_2)
    assert hash_1 == hash_2


@pytest.mark.asyncio
async def test_scientific_cache_key_generation_and_storage():
    """Verify scientific cache key construction and Redis storage/retrieval."""
    cache = ScientificCache()
    ws_id = uuid.uuid4()
    aoi = {
        "type": "Polygon",
        "coordinates": [[[79.2, 21.6], [79.3, 21.6], [79.3, 21.7], [79.2, 21.7], [79.2, 21.6]]],
    }

    cache_key = cache.build_cache_key(
        workspace_id=ws_id,
        aoi=aoi,
        baseline_start="2024-01-01",
        baseline_end="2024-04-01",
        comparison_start="2025-01-01",
        comparison_end="2025-04-01",
        requested_layers=["vegetation"],
        dataset_revision="s2-l2a-v1",
        method_version="vegetation-v1",
    )
    assert cache_key.startswith("sci:")

    # Initial get -> None
    assert await cache.get_cached_result(cache_key) is None

    # Store result
    manifest = {"analysis_id": str(uuid.uuid4()), "status": "succeeded", "result": "clean"}
    await cache.set_cached_result(cache_key, manifest, ttl_seconds=60)

    # Retrieved result
    retrieved = await cache.get_cached_result(cache_key)
    assert retrieved is not None
    assert retrieved["status"] == "succeeded"
    assert retrieved["analysis_id"] == manifest["analysis_id"]


@pytest.mark.asyncio
async def test_idempotency_store_replay_and_conflict():
    """Verify IdempotencyStore replay on identical payload and 409 conflict on payload mismatch."""
    store = IdempotencyStore()
    ws_id = uuid.uuid4()
    key = f"idem-test-{uuid.uuid4().hex[:8]}"

    payload_a = {"layers": ["vegetation"], "threshold": 0.3}
    payload_b = {"layers": ["vegetation", "water"], "threshold": 0.5}

    # 1. Fresh key: returns None
    cached = await store.get_or_reserve(ws_id, key, payload_a, ttl_seconds=60)
    assert cached is None

    # 2. Save response
    response_data = {"analysis_id": str(uuid.uuid4()), "status": "queued"}
    await store.save_response(ws_id, key, payload_a, response_data, ttl_seconds=60)

    # 3. Same key + same payload: returns cached response
    replay = await store.get_or_reserve(ws_id, key, payload_a, ttl_seconds=60)
    assert replay is not None
    assert replay["analysis_id"] == response_data["analysis_id"]

    # 4. Same key + different payload: raises ConflictException
    with pytest.raises(ConflictException) as exc_info:
        await store.get_or_reserve(ws_id, key, payload_b, ttl_seconds=60)
    assert exc_info.value.error_code == "IDEMPOTENCYCONFLICT"


@pytest.mark.asyncio
async def test_provider_rate_limiter_semaphore_and_refresh_lock():
    """Verify distributed semaphore slot acquisition and shared token refresh lock."""
    limiter = ProviderRateLimiter()
    provider = f"prov-{uuid.uuid4().hex[:6]}"

    # Test lease acquisition with max_concurrent=1
    lease_1 = await limiter.acquire_lease(provider, max_concurrent=1, wait_timeout_sec=1.0)
    assert lease_1 is not None

    # Second acquisition should time out
    with pytest.raises(RateLimiterTimeoutError):
        await limiter.acquire_lease(provider, max_concurrent=1, wait_timeout_sec=0.5)

    # Release lease 1
    await limiter.release_lease(provider, lease_1)

    # Now second lease can be acquired
    lease_2 = await limiter.acquire_lease(provider, max_concurrent=1, wait_timeout_sec=1.0)
    assert lease_2 is not None
    await limiter.release_lease(provider, lease_2)

    # Test shared token refresh lock
    acquired_1 = await limiter.acquire_token_refresh_lock(provider, lock_ttl_sec=5)
    assert acquired_1 is True

    # Second caller cannot acquire while held
    acquired_2 = await limiter.acquire_token_refresh_lock(provider, lock_ttl_sec=5)
    assert acquired_2 is False

    await limiter.release_token_refresh_lock(provider)

    acquired_3 = await limiter.acquire_token_refresh_lock(provider, lock_ttl_sec=5)
    assert acquired_3 is True
    await limiter.release_token_refresh_lock(provider)


@pytest.mark.asyncio
async def test_provider_rate_limiter_non_retryable_error():
    """Verify non-retryable errors are raised immediately without retry loop."""
    limiter = ProviderRateLimiter()
    provider = f"prov-err-{uuid.uuid4().hex[:6]}"
    call_count = 0

    async def failing_op():
        nonlocal call_count
        call_count += 1
        raise AppException(
            status_code=401,
            error_code="INVALIDCREDENTIALS",
            message="Invalid provider API credentials.",
            retryable=False,
        )

    with pytest.raises(AppException) as exc:
        await limiter.execute_with_retry_and_rate_limit(
            provider_name=provider,
            operation=failing_op,
            max_retries=3,
        )

    assert exc.value.error_code == "INVALIDCREDENTIALS"
    assert call_count == 1  # No retries for non-retryable error


@pytest.mark.asyncio
async def test_artifact_cleanup_service(
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
):
    """Verify ArtifactCleanupService removes abandoned failed attempt artifacts older than cutoff."""
    cleanup_service = ArtifactCleanupService()

    # 1. Failed analysis older than 48 hours
    old_failed_analysis = Analysis(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        status="failed",
        stage="processinglayers",
        configuration_id="mvp-v1",
        requested_layers=["vegetation"],
        aoi_snapshot={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]},
        baseline_start=date(2024, 1, 1),
        baseline_end=date(2024, 4, 1),
        comparison_start=date(2025, 1, 1),
        comparison_end=date(2025, 4, 1),
        created_by="test-analyst",
    )
    db_session.add(old_failed_analysis)

    # 2. Succeeded analysis older than 48 hours (should NOT be deleted)
    succeeded_analysis = Analysis(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        status="succeeded",
        stage="completed",
        configuration_id="mvp-v1",
        requested_layers=["vegetation"],
        aoi_snapshot={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]},
        baseline_start=date(2024, 1, 1),
        baseline_end=date(2024, 4, 1),
        comparison_start=date(2025, 1, 1),
        comparison_end=date(2025, 4, 1),
        created_by="test-analyst",
    )
    db_session.add(succeeded_analysis)
    await db_session.flush()

    # Job attempts
    failed_attempt = JobAttempt(
        id=uuid.uuid4(),
        analysis_id=old_failed_analysis.id,
        attempt_number=1,
        worker_id="worker-old",
        fencing_token=1,
        status="failed",
    )
    db_session.add(failed_attempt)

    succeeded_attempt = JobAttempt(
        id=uuid.uuid4(),
        analysis_id=succeeded_analysis.id,
        attempt_number=1,
        worker_id="worker-good",
        fencing_token=2,
        status="succeeded",
    )
    db_session.add(succeeded_attempt)
    await db_session.flush()

    # Create artifacts
    old_time = datetime.now(timezone.utc) - timedelta(hours=48)
    abandoned_art = Artifact(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        analysis_id=old_failed_analysis.id,
        attempt_id=failed_attempt.id,
        object_key=f"abandoned/{uuid.uuid4().hex}.tif",
        checksum_sha256="dummychecksumabandoned",
        byte_size=1024,
        media_type="image/tiff",
        artifact_metadata={"artifact_type": "geotiff", "storage_tier": "hot"},
        created_at=old_time,
    )
    db_session.add(abandoned_art)

    valid_art = Artifact(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        analysis_id=succeeded_analysis.id,
        attempt_id=succeeded_attempt.id,
        object_key=f"valid/{uuid.uuid4().hex}.tif",
        checksum_sha256="dummychecksumvalid",
        byte_size=2048,
        media_type="image/tiff",
        artifact_metadata={"artifact_type": "geotiff", "storage_tier": "hot"},
        created_at=old_time,
    )
    db_session.add(valid_art)
    await db_session.commit()

    # Run cleanup with grace period 24 hours
    res = await cleanup_service.cleanup_abandoned_artifacts(db_session, grace_period_hours=24)
    assert res["deleted_artifacts"] >= 1

    # Verify abandoned_art is gone, valid_art remains
    check_abandoned = await db_session.get(Artifact, abandoned_art.id)
    check_valid = await db_session.get(Artifact, valid_art.id)
    assert check_abandoned is None
    assert check_valid is not None


@pytest.mark.asyncio
async def test_metrics_endpoint(client: AsyncClient):
    """Verify /metrics returns Prometheus text exposition with all registered metric families."""
    resp = await client.get("/metrics")
    assert resp.status_code == 200
    text = resp.text
    assert "codeniti_http_requests_total" in text
    assert "codeniti_queue_depth" in text
    assert "codeniti_job_duration_seconds" in text
    assert "codeniti_provider_latency_seconds" in text
    assert "codeniti_provider_throttles_total" in text
    assert "codeniti_valid_data_coverage_fraction" in text
    assert "codeniti_cache_hits_total" in text
    assert "codeniti_worker_heartbeat_age_seconds" in text
    assert "codeniti_artifact_publication_failures_total" in text
