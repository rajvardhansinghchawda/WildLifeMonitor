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
async def test_result_manifest_field_completeness_against_spec(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Verify result-manifest field-completeness test against spec.md's required-fields list.

    Required fields (spec.md lines 137-146):
    - Analysis identity: ID, state, configuration.
    - Input snapshot: AOI and requested periods.
    - Layers: Status, metrics, quality, artifact references.
    - Provenance: Sources, method versions, effective observations.
    - Warnings: Structured codes and human-readable explanations.
    - Attribution: Layer-specific source text.
    - Events: Counts and navigation URL.
    """
    payload = {
        "aoi": SAMPLE_AOI,
        "baseline": {"start": "2024-01-01", "end": "2024-03-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-03-01"},
        "layers": ["vegetation"],
        "configuration_id": "mvp-v1",
    }

    # 1. Submit
    submit_resp = await client.post("/api/v1/analyses", json=payload, headers=auth_headers)
    assert submit_resp.status_code == 202
    analysis_id = submit_resp.json()["analysis_id"]

    # 2. Before execution, GET /results must return 409 ANALYSISNOTREADY
    not_ready_resp = await client.get(
        f"/api/v1/analyses/{analysis_id}/results", headers=auth_headers
    )
    assert not_ready_resp.status_code == 409
    assert not_ready_resp.json()["error"]["code"] == "ANALYSISNOTREADY"

    # 3. Worker executes analysis
    worker = AnalysisWorker(worker_id="manifest-test-worker")
    success = await worker.execute_job_message(db_session, {"analysis_id": analysis_id})
    assert success is True

    # 4. Fetch result manifest
    res = await client.get(f"/api/v1/analyses/{analysis_id}/results", headers=auth_headers)
    assert res.status_code == 200
    manifest = res.json()

    # --- Spec Required Field Checks ---
    # 1. Analysis identity
    assert "analysis_id" in manifest
    assert manifest["analysis_id"] == analysis_id
    assert "status" in manifest
    assert manifest["status"] in ["succeeded", "partial"]
    assert "configuration_id" in manifest
    assert manifest["configuration_id"] == "mvp-v1"

    # 2. Input snapshot
    assert "input_snapshot" in manifest
    input_snap = manifest["input_snapshot"]
    assert "aoi" in input_snap
    assert "baseline" in input_snap
    assert "comparison" in input_snap
    assert "layers" in input_snap
    assert input_snap["layers"] == ["vegetation"]

    # 3. Layers with status, metrics, quality, artifact references
    assert "layers" in manifest
    assert len(manifest["layers"]) >= 1
    for layer in manifest["layers"]:
        assert "type" in layer
        assert "status" in layer
        assert "quality_label" in layer
        assert "metrics" in layer
        assert "artifacts" in layer
        assert "method_version" in layer
        # Artifact references must have storage_uri and checksum
        for art in layer["artifacts"]:
            assert "storage_uri" in art
            assert "checksum" in art

    # 4. Provenance: Sources, method versions, effective observations
    assert "provenance" in manifest
    prov = manifest["provenance"]
    assert "sources" in prov
    assert "method_versions" in prov
    assert "effective_observations" in prov
    assert "attribution" in prov

    # 5. Warnings
    assert "warnings" in manifest
    assert isinstance(manifest["warnings"], list)

    # 6. Attribution
    assert "attribution" in manifest
    assert isinstance(manifest["attribution"], dict)
    assert "vegetation" in manifest["attribution"]

    # 7. Events: Counts and navigation URL
    assert "event_count" in manifest
    assert isinstance(manifest["event_count"], int)
    assert "events_url" in manifest
    assert manifest["events_url"] == f"/api/v1/analyses/{analysis_id}/events"
