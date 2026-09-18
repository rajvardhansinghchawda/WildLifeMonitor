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
