import time
import uuid

import pytest
from httpx import AsyncClient

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
async def test_idempotency_replay_success(async_client: AsyncClient, auth_headers: dict):
    idempotency_key = f"idemp-{uuid.uuid4()}"
    payload = {
        "aoi": SAMPLE_AOI,
        "baseline": {"start": "2024-01-01", "end": "2024-03-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-03-01"},
        "layers": ["vegetation"],
        "configuration_id": "mvp-v1",
    }
    headers = {**auth_headers, "Idempotency-Key": idempotency_key}

    # Initial submission
    resp1 = await async_client.post("/api/v1/analyses", json=payload, headers=headers)
    assert resp1.status_code == 202
    data1 = resp1.json()
    analysis_id_1 = data1["analysis_id"]

    # Replay identical payload with same key
    resp2 = await async_client.post("/api/v1/analyses", json=payload, headers=headers)
    assert resp2.status_code == 202
    data2 = resp2.json()
    analysis_id_2 = data2["analysis_id"]

    # Must replay the exact same analysis_id
    assert analysis_id_1 == analysis_id_2


@pytest.mark.asyncio
async def test_idempotency_conflict_different_payload(
    async_client: AsyncClient, auth_headers: dict
):
    idempotency_key = f"idemp-conflict-{uuid.uuid4()}"
    payload1 = {
        "aoi": SAMPLE_AOI,
        "baseline": {"start": "2024-01-01", "end": "2024-03-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-03-01"},
        "layers": ["vegetation"],
        "configuration_id": "mvp-v1",
    }
    headers = {**auth_headers, "Idempotency-Key": idempotency_key}

    # First submission
    resp1 = await async_client.post("/api/v1/analyses", json=payload1, headers=headers)
    assert resp1.status_code == 202

    # Second submission: altered dates
    payload2 = {
        "aoi": SAMPLE_AOI,
        "baseline": {"start": "2024-01-15", "end": "2024-03-15"},
        "comparison": {"start": "2025-01-15", "end": "2025-03-15"},
        "layers": ["vegetation"],
        "configuration_id": "mvp-v1",
    }
    resp2 = await async_client.post("/api/v1/analyses", json=payload2, headers=headers)
    assert resp2.status_code == 409
    err = resp2.json()["error"]
    assert err["code"] == "IDEMPOTENCYCONFLICT"


@pytest.mark.asyncio
async def test_idempotency_reservation_released_on_downstream_failure(
    async_client: AsyncClient, auth_headers: dict
):
    """Regression: a request that reserves an Idempotency-Key but then fails for an
    unrelated reason (e.g. MAX_ACTIVE_JOBS_PER_WORKSPACE) must not leave that key
    stuck 'in_flight' in Redis. Without releasing it, IdempotencyStore.get_or_reserve
    polls for up to wait_timeout_sec (5s) on every retry with that key before giving
    up and proceeding anyway, defeating both the 202 submission latency target
    (dsabackendoptimisation.md) and the idempotency guarantee itself.
    """
    payload = {
        "aoi": SAMPLE_AOI,
        "baseline": {"start": "2024-01-01", "end": "2024-03-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-03-01"},
        "layers": ["vegetation"],
        "configuration_id": "mvp-v1",
    }

    # Fill the workspace's active-job limit (default MAX_ACTIVE_JOBS_PER_WORKSPACE=2)
    # with unrelated requests so the next submission is rejected by the rate limiter.
    resp1 = await async_client.post("/api/v1/analyses", json=payload, headers=auth_headers)
    assert resp1.status_code == 202
    resp2 = await async_client.post("/api/v1/analyses", json=payload, headers=auth_headers)
    assert resp2.status_code == 202

    idempotency_key = f"idemp-rate-limited-{uuid.uuid4()}"
    headers = {**auth_headers, "Idempotency-Key": idempotency_key}

    # This reserves the idempotency key, then fails on the active-job-limit check.
    resp3 = await async_client.post("/api/v1/analyses", json=payload, headers=headers)
    assert resp3.status_code == 429
    assert resp3.json()["error"]["code"] == "RATELIMITED"

    # Immediate retry with the same key must fail fast (reservation released), not
    # block for ~wait_timeout_sec waiting on a reservation nothing will ever complete.
    start = time.monotonic()
    resp4 = await async_client.post("/api/v1/analyses", json=payload, headers=headers)
    elapsed = time.monotonic() - start

    assert resp4.status_code == 429
    assert resp4.json()["error"]["code"] == "RATELIMITED"
    assert elapsed < 2.0, (
        f"Retry took {elapsed:.2f}s — the idempotency reservation from the failed "
        "request was likely not released, forcing this retry to wait out the "
        "get_or_reserve poll timeout."
    )
