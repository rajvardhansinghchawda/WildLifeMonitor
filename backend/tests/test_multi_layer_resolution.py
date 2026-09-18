import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.workers.analysis_worker import AnalysisWorker

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
async def test_all_layers_succeed_resolves_succeeded(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Verify that requesting vegetation, water, and builtup layers produces 3 independent ready layers and a succeeded job."""
    payload = {
        "aoi": SAMPLE_AOI,
        "baseline": {"start": "2024-01-01", "end": "2024-03-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-03-01"},
        "layers": ["vegetation", "water", "builtup"],
        "configuration_id": "test-multi-layer-v1",
    }

    # 1. Submit multi-layer analysis
    resp = await client.post("/api/v1/analyses", json=payload, headers=auth_headers)
    assert resp.status_code == 202
    analysis_id = resp.json()["analysis_id"]

    # 2. Worker execution
    worker = AnalysisWorker(worker_id="test-multi-worker")
    success = await worker.execute_job_message(db_session, {"analysis_id": analysis_id})
    assert success is True

    # 3. Check result manifest
    res_resp = await client.get(f"/api/v1/analyses/{analysis_id}/results", headers=auth_headers)
    assert res_resp.status_code == 200
    manifest = res_resp.json()

    assert manifest["status"] == "succeeded"
    assert len(manifest["layers"]) == 3

    layer_types = {layer["type"]: layer["status"] for layer in manifest["layers"]}
    assert layer_types["vegetation"] == "ready"
    assert layer_types["water"] == "ready"
    assert layer_types["builtup"] == "ready"


@pytest.mark.asyncio
async def test_independent_layer_failure_resolves_partial(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Independent Failure Isolation (systemdesign.md):

    Forcing one layer's provider to fail (via fail-water test injection) leaves other layers intact
    and the parent job resolves to 'partial'.
    """
    payload = {
        "aoi": SAMPLE_AOI,
        "baseline": {"start": "2024-01-01", "end": "2024-03-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-03-01"},
        "layers": ["vegetation", "water", "builtup"],
        "configuration_id": "fail-water",  # Triggers water provider injected failure
    }

    # 1. Submit
    resp = await client.post("/api/v1/analyses", json=payload, headers=auth_headers)
    assert resp.status_code == 202
    analysis_id = resp.json()["analysis_id"]

    # 2. Worker execution
    worker = AnalysisWorker(worker_id="test-partial-worker")
    success = await worker.execute_job_message(db_session, {"analysis_id": analysis_id})
    assert success is True

    # 3. Check result manifest
    res_resp = await client.get(f"/api/v1/analyses/{analysis_id}/results", headers=auth_headers)
    assert res_resp.status_code == 200
    manifest = res_resp.json()

    # Job status must be partial (not failed, not succeeded)
    assert manifest["status"] == "partial"
    assert len(manifest["layers"]) == 3

    layer_types = {layer["type"]: layer["status"] for layer in manifest["layers"]}
    assert layer_types["vegetation"] == "ready"
    assert layer_types["water"] == "failed"  # Injected failure isolated to water
    assert layer_types["builtup"] == "ready"  # Builtup proceeded unaffected


@pytest.mark.asyncio
async def test_gfw_disabled_reports_explicit_unsupported(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """GFW Invariant (systemdesign.md):

    With GFW_ENABLED=false, the provider must report an explicit 'unsupported' capability/layer state
    with a clear reason — never a silent omission.
    """
    payload = {
        "aoi": SAMPLE_AOI,
        "baseline": {"start": "2024-01-01", "end": "2024-03-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-03-01"},
        "layers": ["vegetation", "forestalerts"],
        "configuration_id": "test-gfw-unsupported",
    }

    resp = await client.post("/api/v1/analyses", json=payload, headers=auth_headers)
    assert resp.status_code == 202
    analysis_id = resp.json()["analysis_id"]

    worker = AnalysisWorker(worker_id="test-gfw-worker")
    success = await worker.execute_job_message(db_session, {"analysis_id": analysis_id})
    assert success is True

    # Check status endpoint
    status_resp = await client.get(f"/api/v1/analyses/{analysis_id}", headers=auth_headers)
    assert status_resp.status_code == 200
    job_status = status_resp.json()

    # One ready (veg) + one unsupported (forestalerts) -> partial job resolution
    assert job_status["status"] == "partial"
    layers = {item["type"]: item for item in job_status["layers"]}
    assert layers["vegetation"]["status"] == "ready"
    assert layers["forestalerts"]["status"] == "unsupported"
    assert "disabled" in str(layers["forestalerts"]["error_details"]).lower()
