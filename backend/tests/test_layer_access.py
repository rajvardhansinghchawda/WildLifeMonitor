import uuid
from datetime import date, datetime, timezone

import pytest
from geoalchemy2.shape import from_shape
from httpx import AsyncClient
from shapely.geometry import Polygon
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis, AnalysisLayer
from app.models.artifact import Artifact
from app.models.event import ChangeEvent
from app.models.job_attempt import JobAttempt


@pytest.mark.asyncio
async def test_layer_access_descriptor_and_readiness_enforcement(
    client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
    auth_headers: dict,
):
    """Contract: GET /analyses/{id}/layers/{layer_id}/access.

    - 409 LAYERNOTREADY if layer is not ready.
    - Expiry-aware short-lived presigned descriptor if ready.
    """
    analysis = Analysis(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        status="running",
        stage="processinglayers",
        configuration_id="mvp-v1",
        requested_layers=["vegetation", "water"],
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

    pending_layer = AnalysisLayer(
        id=uuid.uuid4(),
        analysis_id=analysis.id,
        layer_type="water",
        status="running",
    )
    ready_layer = AnalysisLayer(
        id=uuid.uuid4(),
        analysis_id=analysis.id,
        layer_type="vegetation",
        status="ready",
    )
    db_session.add(pending_layer)
    db_session.add(ready_layer)

    attempt = JobAttempt(
        id=uuid.uuid4(),
        analysis_id=analysis.id,
        attempt_number=1,
        status="running",
        fencing_token=1,
    )
    db_session.add(attempt)
    await db_session.flush()

    # Add display artifact for ready layer
    artifact = Artifact(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        analysis_id=analysis.id,
        attempt_id=attempt.id,
        layer_id=ready_layer.id,
        object_key=f"{analysis.id}/attempt1/vegetation_change.tif",
        checksum_sha256="0" * 64,
        media_type="image/tiff",
        byte_size=1024,
        artifact_metadata={"artifact_type": "vegetation_cog"},
    )
    db_session.add(artifact)
    await db_session.commit()

    # 1. Non-ready layer returns 409 LAYERNOTREADY
    resp_pending = await client.get(
        f"/api/v1/analyses/{analysis.id}/layers/{pending_layer.id}/access",
        headers=auth_headers,
    )
    assert resp_pending.status_code == 409
    data_pending = resp_pending.json()
    assert data_pending["error"]["code"] == "LAYERNOTREADY"

    # 2. Ready layer returns 200 with authorized short-lived descriptor
    resp_ready = await client.get(
        f"/api/v1/analyses/{analysis.id}/layers/{ready_layer.id}/access",
        headers=auth_headers,
    )
    assert resp_ready.status_code == 200, resp_ready.text
    data_ready = resp_ready.json()
    assert data_ready["layer_id"] == str(ready_layer.id)
    assert data_ready["layer_type"] == "vegetation"

    descriptor = data_ready["access_descriptor"]
    assert "url" in descriptor
    assert descriptor["url"].startswith("http")
    assert descriptor["media_type"] == "image/tiff"
    assert descriptor["byte_size"] == 1024
    assert descriptor["expires_in_seconds"] == 900

    expires_at = datetime.fromisoformat(descriptor["expires_at"])
    now_utc = datetime.now(timezone.utc)
    # Must expire roughly 15 minutes in the future (>14 minutes)
    diff_sec = (expires_at - now_utc).total_seconds()
    assert 800 < diff_sec <= 900


@pytest.mark.asyncio
async def test_authorized_geojson_export(
    client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
    auth_headers: dict,
):
    """Verify GET /analyses/{id}/events/export returns complete FeatureCollection with provenance."""
    analysis = Analysis(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        status="succeeded",
        stage="completed",
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

    poly = Polygon(
        [[79.24, 21.64], [79.241, 21.64], [79.241, 21.641], [79.24, 21.641], [79.24, 21.64]]
    )
    evt = ChangeEvent(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        analysis_id=analysis.id,
        geom=from_shape(poly, srid=4326),
        change_type="vegetationlosscandidate",
        affected_area_ha=2.4,
        mean_ndvi_change=-0.28,
        priority_score=65.0,
        priority_method_version="priority-v1",
        status="verifiedchange",
        method_version="vegetation-v1",
        record_version=2,
    )
    db_session.add(evt)
    await db_session.commit()

    resp = await client.get(f"/api/v1/analyses/{analysis.id}/events/export", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["type"] == "FeatureCollection"
    assert data["analysis_id"] == str(analysis.id)
    assert data["total_features"] == 1

    feature = data["features"][0]
    assert feature["id"] == str(evt.id)
    props = feature["properties"]
    assert props["status"] == "verifiedchange"
    assert props["priority_score"] == 65.0

    provenance = props["provenance"]
    assert provenance["method_version"] == "vegetation-v1"
    assert "baseline_period" in provenance
    assert "comparison_period" in provenance
    assert "attribution" in provenance
    assert "exported_at" in provenance
