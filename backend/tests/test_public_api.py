import datetime
import uuid
import pytest
from httpx import AsyncClient
from geoalchemy2.shape import from_shape
from shapely.geometry import box
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis, AnalysisLayer, JobStatusEnum, LayerStatusEnum
from app.models.area import ProtectedArea
from app.models.event import ChangeEvent, VerificationStatusEnum
from app.models.workspace import Workspace


@pytest.mark.asyncio
async def test_public_overview(client: AsyncClient):
    response = await client.get("/api/v1/public/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["system_status"] == "operational"
    assert data["demonstration_mode"] is True
    assert "vegetation-v1" in data["enabled_methods"]
    assert len(data["data_sources"]) >= 3


@pytest.mark.asyncio
async def test_public_demonstrations_and_events(client: AsyncClient, db_session: AsyncSession):
    # Seed a test protected area and demonstration in the isolated test DB
    ws_id = uuid.uuid4()
    workspace = Workspace(id=ws_id, name="Public Demo Test")
    db_session.add(workspace)

    area_id = uuid.uuid4()
    area = ProtectedArea(
        id=area_id,
        slug="test-sanctuary",
        name="Test Wildlife Sanctuary",
        country="India",
        area_km2=250.0,
        centroid_lat=21.5,
        centroid_lon=79.0,
        boundary=from_shape(box(78.9, 21.4, 79.1, 21.6), srid=4326),
        analysis_aoi=from_shape(box(78.9, 21.4, 79.1, 21.6), srid=4326),
    )
    db_session.add(area)

    analysis_id = uuid.uuid4()
    analysis = Analysis(
        id=analysis_id,
        workspace_id=ws_id,
        area_id=area_id,
        aoi_snapshot={"type": "Polygon", "coordinates": [[[78.9, 21.4], [79.1, 21.4], [79.1, 21.6], [78.9, 21.6], [78.9, 21.4]]]},
        baseline_start=datetime.date(2024, 1, 1),
        baseline_end=datetime.date(2024, 1, 31),
        comparison_start=datetime.date(2025, 1, 1),
        comparison_end=datetime.date(2025, 1, 31),
        requested_layers=["vegetation"],
        configuration_id="test-demo",
        status=JobStatusEnum.SUCCEEDED.value,
        stage="completed",
        created_by="system:test",
    )
    db_session.add(analysis)

    layer_id = uuid.uuid4()
    layer = AnalysisLayer(
        id=layer_id,
        analysis_id=analysis_id,
        layer_type="vegetation",
        status=LayerStatusEnum.READY.value,
        method_version="vegetation-v1",
        metrics={"vegetation_loss_candidate_ha": 12.5},
    )
    db_session.add(layer)

    event_id = uuid.uuid4()
    event = ChangeEvent(
        id=event_id,
        workspace_id=ws_id,
        analysis_id=analysis_id,
        layer_id=layer_id,
        geom=from_shape(box(78.95, 21.45, 78.97, 21.47), srid=4326),
        change_type="vegetation_loss",
        affected_area_ha=12.5,
        mean_ndvi_change=-0.25,
        priority_score=0.82,
        status=VerificationStatusEnum.PENDINGFIELDVERIFICATION.value,
        method_version="v1.0",
        nearest_known_road_distance_m=500.0,
    )
    db_session.add(event)
    await db_session.commit()

    # Query list demonstrations
    response = await client.get("/api/v1/public/demonstrations")
    assert response.status_code == 200
    data = response.json()
    assert data["is_curated_demo"] is True
    assert len(data["items"]) >= 1

    matched = next((item for item in data["items"] if item["id"] == str(analysis_id)), None)
    assert matched is not None
    assert matched["area_name"] == "Test Wildlife Sanctuary"
    assert matched["read_only"] is True

    # Query demonstration detail
    detail_res = await client.get(f"/api/v1/public/demonstrations/{analysis_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == str(analysis_id)
    assert len(detail["layers"]) == 1

    # Query events
    events_res = await client.get(f"/api/v1/public/demonstrations/{analysis_id}/events")
    assert events_res.status_code == 200
    events_data = events_res.json()
    assert len(events_data["items"]) == 1
    ev_item = events_data["items"][0]
    assert ev_item["priority_band"] == "CRITICAL"
    assert ev_item["generalized_coordinates"]["lat"] == 21.46
    assert ev_item["read_only"] is True
    assert "security_notice" in ev_item


@pytest.mark.asyncio
async def test_public_demonstration_not_found(client: AsyncClient):
    random_id = str(uuid.uuid4())
    response = await client.get(f"/api/v1/public/demonstrations/{random_id}")
    assert response.status_code == 404
