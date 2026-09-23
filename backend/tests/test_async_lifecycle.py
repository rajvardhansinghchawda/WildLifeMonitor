import json

import pytest
import redis.asyncio as aioredis
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.outbox import Outbox
from app.workers.analysis_worker import AnalysisWorker
from app.workers.dispatcher import REDIS_ANALYSES_QUEUE, dispatch_pending_outbox_messages

SAMPLE_AOI = {
    "type": "Polygon",
    "coordinates": [
        [
            [79.20, 21.60],
            [79.30, 21.60],
            [79.30, 21.70],
            [79.20, 21.70],
            [79.20, 21.60],
        ]
    ],
}


@pytest.mark.asyncio
async def test_full_async_lifecycle_queued_to_succeeded(
    async_client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        # Clear outbox table and Redis test queue for clean test isolation
        from sqlalchemy import delete

        await db_session.execute(delete(Outbox))
        await db_session.commit()
        await redis_client.delete(REDIS_ANALYSES_QUEUE)

        payload = {
            "aoi": SAMPLE_AOI,
            "baseline": {"start": "2024-01-01", "end": "2024-03-01"},
            "comparison": {"start": "2025-01-01", "end": "2025-03-01"},
            "layers": ["vegetation"],
            "configuration_id": "mvp-v1",
        }

        # 1. Submit analysis
        resp = await async_client.post("/api/v1/analyses", json=payload, headers=auth_headers)
        assert resp.status_code == 202
        data = resp.json()
        analysis_id = data["analysis_id"]
        assert data["status"] == "queued"
        assert resp.headers["Location"] == f"/api/v1/analyses/{analysis_id}"

        # 2. Verify transactional outbox row persisted with published_at IS NULL
        outbox_stmt = select(Outbox).where(Outbox.message["analysis_id"].astext == analysis_id)
        outbox_res = await db_session.execute(outbox_stmt)
        outbox_row = outbox_res.scalar_one_or_none()
        assert outbox_row is not None
        assert outbox_row.published_at is None

        # 3. Run dispatcher to publish outbox row to Redis
        dispatched_count = await dispatch_pending_outbox_messages(db_session, redis_client)
        assert dispatched_count >= 1

        # Check outbox is now marked published
        await db_session.refresh(outbox_row)
        assert outbox_row.published_at is not None
        assert outbox_row.status == "published"

        # 4. Check message in Redis queue
        queued_item = await redis_client.lpop(REDIS_ANALYSES_QUEUE)
        assert queued_item is not None
        msg_dict = json.loads(queued_item)
        assert msg_dict["analysis_id"] == analysis_id

        # 5. Worker processes message
        worker = AnalysisWorker(worker_id="test-worker-1", lease_seconds=10)
        success = await worker.execute_job_message(db_session, msg_dict)
        assert success is True

        # 6. Poll GET /api/v1/analyses/{id} to verify database status is succeeded
        status_resp = await async_client.get(
            f"/api/v1/analyses/{analysis_id}", headers=auth_headers
        )
        assert status_resp.status_code == 200
        status_data = status_resp.json()
        assert status_data["status"] == "succeeded"
        assert status_data["stage"] == "completed"
        assert status_data["completed_layers"] == 1
        assert status_data["total_layers"] == 1
        assert len(status_data["layers"]) == 1
        assert status_data["layers"][0]["status"] == "ready"

    finally:
        await redis_client.aclose()


@pytest.mark.asyncio
async def test_active_job_limits_enforced(async_client: AsyncClient, auth_headers: dict):
    payload = {
        "aoi": SAMPLE_AOI,
        "baseline": {"start": "2024-01-01", "end": "2024-03-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-03-01"},
        "layers": ["vegetation"],
        "configuration_id": "mvp-v1",
    }

    # First job: OK
    resp1 = await async_client.post("/api/v1/analyses", json=payload, headers=auth_headers)
    assert resp1.status_code == 202

    # Second job: OK (limit is 2)
    resp2 = await async_client.post("/api/v1/analyses", json=payload, headers=auth_headers)
    assert resp2.status_code == 202

    # Third job: must be rejected with 429 RATELIMITED
    resp3 = await async_client.post("/api/v1/analyses", json=payload, headers=auth_headers)
    assert resp3.status_code == 429
    err = resp3.json()["error"]
    assert err["code"] == "RATELIMITED"


@pytest.mark.asyncio
async def test_cooperative_cancellation_flow(
    async_client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    payload = {
        "aoi": SAMPLE_AOI,
        "baseline": {"start": "2024-01-01", "end": "2024-03-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-03-01"},
        "layers": ["vegetation"],
        "configuration_id": "mvp-v1",
    }

    # Submit job
    resp = await async_client.post("/api/v1/analyses", json=payload, headers=auth_headers)
    assert resp.status_code == 202
    analysis_id = resp.json()["analysis_id"]

    # Request cancellation while queued
    cancel_resp = await async_client.post(
        f"/api/v1/analyses/{analysis_id}/cancel", headers=auth_headers
    )
    assert cancel_resp.status_code == 202

    # Worker attempts to execute, notices cancel_requested, marks cancelled
    worker = AnalysisWorker(worker_id="test-worker-cancel")
    success = await worker.execute_job_message(db_session, {"analysis_id": analysis_id})
    assert success is True

    # Verify status is cancelled
    status_resp = await async_client.get(f"/api/v1/analyses/{analysis_id}", headers=auth_headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "cancelled"

    # Attempting to cancel already-terminal analysis returns 409
    cancel_again = await async_client.post(
        f"/api/v1/analyses/{analysis_id}/cancel", headers=auth_headers
    )
    assert cancel_again.status_code == 409
    assert cancel_again.json()["error"]["code"] == "ANALYSISALREADYTERMINAL"
