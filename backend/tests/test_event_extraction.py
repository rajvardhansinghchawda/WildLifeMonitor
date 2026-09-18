import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.analysis_repository import AnalysisRepository
from app.services.event_extraction_service import EventExtractionService
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
async def test_idempotent_event_extraction(
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
):
    analysis_repo = AnalysisRepository()
    analysis, _ = await analysis_repo.create_analysis_with_layers_and_outbox(
        session=db_session,
        workspace_id=test_workspace,
        created_by="test-user",
        aoi_snapshot=SAMPLE_AOI,
        baseline_start=datetime.now(timezone.utc).date(),
        baseline_end=datetime.now(timezone.utc).date(),
        comparison_start=datetime.now(timezone.utc).date(),
        comparison_end=datetime.now(timezone.utc).date(),
        requested_layers=["vegetation"],
        configuration_id="mvp-v1",
    )
    analysis_id = analysis.id
    layer_id = None
    await db_session.commit()

    event_service = EventExtractionService()

    raw_events = [
        {
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [[79.24, 21.64], [79.25, 21.64], [79.25, 21.65], [79.24, 21.65], [79.24, 21.64]]
                ],
            },
            "changetype": "vegetationlosscandidate",
            "affectedareaha": 1.25,
            "meanndvichange": -0.25,
            "validpixelfraction": 0.95,
            "qualitylabel": "usable",
        }
    ]

    # First extraction run
    events_run_1 = await event_service.persist_events_idempotent(
        session=db_session,
        workspace_id=test_workspace,
        analysis_id=analysis_id,
        layer_id=layer_id,
        raw_events=raw_events,
        method_version="vegetation-v1",
    )
    await db_session.commit()
    assert len(events_run_1) == 1

    # Second extraction run (simulating worker retry of same attempt)
    events_run_2 = await event_service.persist_events_idempotent(
        session=db_session,
        workspace_id=test_workspace,
        analysis_id=analysis_id,
        layer_id=layer_id,
        raw_events=raw_events,
        method_version="vegetation-v1",
    )
    await db_session.commit()
    assert len(events_run_2) == 1

    # Invariant: Total persisted events in DB must remain exactly 1 (no duplicate creation)
    count = await event_service.count_events_for_analysis(db_session, analysis_id)
    assert count == 1


@pytest.mark.asyncio
async def test_metric_to_manifest_consistency(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Verify that result manifest metrics, layer metrics, and event metrics originate from the same run."""
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

    # 2. Worker execution
    worker = AnalysisWorker(worker_id="test-veg-worker")
    success = await worker.execute_job_message(db_session, {"analysis_id": analysis_id})
    assert success is True

    # 3. Fetch results manifest
    manifest_resp = await client.get(
        f"/api/v1/analyses/{analysis_id}/results", headers=auth_headers
    )
    assert manifest_resp.status_code == 200
    manifest = manifest_resp.json()

    assert manifest["status"] == "succeeded"
    assert len(manifest["layers"]) == 1
    veg_layer = manifest["layers"][0]
    assert veg_layer["type"] == "vegetation"
    assert veg_layer["status"] == "ready"
    assert "meanndvichange" in veg_layer["metrics"]
    assert "vegetationlossareaha" in veg_layer["metrics"]
    assert "validpixelfraction" in veg_layer["metrics"]

    # 4. Fetch events
    events_resp = await client.get(f"/api/v1/analyses/{analysis_id}/events", headers=auth_headers)
    assert events_resp.status_code == 200
    events_data = events_resp.json()
    assert events_data["type"] == "FeatureCollection"
    assert len(events_data["features"]) >= 1

    first_event = events_data["features"][0]
    # Check metric consistency: event has matching method_version and non-empty properties
    props = first_event["properties"]
    assert props["method_version"] == "vegetation-v1"
    assert props["change_type"] == "vegetationlosscandidate"
    assert props["affected_area_ha"] > 0
    assert props["mean_ndvi_change"] < 0
