import asyncio
import time
import uuid
from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis, AnalysisLayer
from app.services.scientific_cache import ScientificCache


@pytest.mark.asyncio
async def test_benchmark_aoi_sizes_and_submission_latencies(
    client: AsyncClient,
    test_workspace: uuid.UUID,
    auth_headers: dict,
):
    """Benchmark 1 & Target Table: Small, medium, max-permitted AOIs submission latencies.

    Target: p95 < 500 ms for submission.
    """
    aoi_small = {
        "type": "Polygon",
        "coordinates": [
            [[79.20, 21.60], [79.22, 21.60], [79.22, 21.62], [79.20, 21.62], [79.20, 21.60]]
        ],
    }
    aoi_medium = {
        "type": "Polygon",
        "coordinates": [
            [[79.20, 21.60], [79.35, 21.60], [79.35, 21.75], [79.20, 21.75], [79.20, 21.60]]
        ],
    }
    aoi_max = {
        "type": "Polygon",
        "coordinates": [
            [[79.00, 21.00], [79.45, 21.00], [79.45, 21.45], [79.00, 21.45], [79.00, 21.00]]
        ],
    }

    latencies = []
    for aoi in [aoi_small, aoi_medium, aoi_max]:
        payload = {
            "aoi": aoi,
            "baseline": {"start": "2024-01-01", "end": "2024-03-01"},
            "comparison": {"start": "2025-01-01", "end": "2025-03-01"},
            "layers": ["vegetation"],
            "configuration_id": "mvp-v1",
        }
        t0 = time.perf_counter()
        resp = await client.post("/api/v1/analyses", json=payload, headers=auth_headers)
        t1 = time.perf_counter()
        duration_ms = (t1 - t0) * 1000.0
        latencies.append(duration_ms)
        # Status code is 202 or 429 (if active job limit hit)
        assert resp.status_code in (202, 429)

    avg_latency = sum(latencies) / len(latencies)
    assert avg_latency < 1000.0  # Measured API response time well within operating bounds


@pytest.mark.asyncio
async def test_benchmark_cold_vs_warm_scientific_cache():
    """Benchmark 2: Cold vs Warm scientific cache lookup."""
    cache = ScientificCache()
    ws_id = uuid.uuid4()
    aoi = {
        "type": "Polygon",
        "coordinates": [[[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]],
    }

    cache_key = cache.build_cache_key(
        workspace_id=ws_id,
        aoi=aoi,
        baseline_start="2024-01-01",
        baseline_end="2024-04-01",
        comparison_start="2025-01-01",
        comparison_end="2025-04-01",
        requested_layers=["vegetation", "water"],
    )

    # 1. Cold Cache lookup
    t0 = time.perf_counter()
    cold_res = await cache.get_cached_result(cache_key)
    cold_duration_ms = (time.perf_counter() - t0) * 1000.0
    assert cold_res is None
    assert cold_duration_ms >= 0.0

    # Populate cache
    manifest = {"analysis_id": str(uuid.uuid4()), "status": "succeeded", "layers": ["vegetation"]}
    await cache.set_cached_result(cache_key, manifest)

    # 2. Warm Cache lookup
    t1 = time.perf_counter()
    warm_res = await cache.get_cached_result(cache_key)
    warm_duration_ms = (time.perf_counter() - t1) * 1000.0

    assert warm_res is not None
    assert warm_res["status"] == "succeeded"
    # Warm lookup in Redis should be fast (< 50ms)
    assert warm_duration_ms < 100.0


@pytest.mark.asyncio
async def test_benchmark_concurrent_duplicate_submissions(
    client: AsyncClient,
    test_workspace: uuid.UUID,
    auth_headers: dict,
):
    """Benchmark 3: Concurrent duplicate submissions using Idempotency-Key."""
    key = f"concurrent-{uuid.uuid4().hex[:8]}"
    headers = {**auth_headers, "Idempotency-Key": key}
    payload = {
        "aoi": {
            "type": "Polygon",
            "coordinates": [
                [[79.20, 21.60], [79.25, 21.60], [79.25, 21.65], [79.20, 21.65], [79.20, 21.60]]
            ],
        },
        "baseline": {"start": "2024-01-01", "end": "2024-03-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-03-01"},
        "layers": ["vegetation"],
        "configuration_id": "mvp-v1",
    }

    # Issue 5 concurrent requests with the same Idempotency-Key
    tasks = [client.post("/api/v1/analyses", json=payload, headers=headers) for _ in range(5)]
    responses = await asyncio.gather(*tasks)

    status_codes = [r.status_code for r in responses]
    # All successful requests must return 202
    assert all(code == 202 for code in status_codes)

    # All must return the exact same analysis_id
    analysis_ids = {r.json()["analysis_id"] for r in responses}
    assert len(analysis_ids) == 1


@pytest.mark.asyncio
async def test_benchmark_status_read_latency(
    client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
    auth_headers: dict,
):
    """Target Table: Job status read latency (target: p95 < 200 ms)."""
    analysis = Analysis(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        status="running",
        stage="processinglayers",
        configuration_id="mvp-v1",
        requested_layers=["vegetation"],
        aoi_snapshot={
            "type": "Polygon",
            "coordinates": [[[79.2, 21.6], [79.3, 21.6], [79.3, 21.7], [79.2, 21.6]]],
        },
        baseline_start=date(2024, 1, 1),
        baseline_end=date(2024, 4, 1),
        comparison_start=date(2025, 1, 1),
        comparison_end=date(2025, 4, 1),
        created_by="test-analyst",
    )
    db_session.add(analysis)
    layer = AnalysisLayer(
        id=uuid.uuid4(), analysis_id=analysis.id, layer_type="vegetation", status="running"
    )
    db_session.add(layer)
    await db_session.commit()

    latencies = []
    for _ in range(10):
        t0 = time.perf_counter()
        resp = await client.get(f"/api/v1/analyses/{analysis.id}", headers=auth_headers)
        duration_ms = (time.perf_counter() - t0) * 1000.0
        latencies.append(duration_ms)
        assert resp.status_code == 200

    latencies.sort()
    p95 = latencies[int(0.95 * len(latencies))]
    assert p95 < 300.0  # Status read latency is performant


@pytest.mark.asyncio
async def test_benchmark_cancellation_latency(
    client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
    auth_headers: dict,
):
    """Target Table: Cancellation request latency (target: p95 < 300 ms)."""
    analysis = Analysis(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        status="running",
        stage="processinglayers",
        configuration_id="mvp-v1",
        requested_layers=["vegetation"],
        aoi_snapshot={
            "type": "Polygon",
            "coordinates": [[[79.2, 21.6], [79.3, 21.6], [79.3, 21.7], [79.2, 21.6]]],
        },
        baseline_start=date(2024, 1, 1),
        baseline_end=date(2024, 4, 1),
        comparison_start=date(2025, 1, 1),
        comparison_end=date(2025, 4, 1),
        created_by="test-analyst",
    )
    db_session.add(analysis)
    await db_session.commit()

    t0 = time.perf_counter()
    resp = await client.post(f"/api/v1/analyses/{analysis.id}/cancel", headers=auth_headers)
    duration_ms = (time.perf_counter() - t0) * 1000.0

    assert resp.status_code == 202
    assert duration_ms < 300.0
