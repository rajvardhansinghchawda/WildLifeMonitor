import datetime
import uuid
import pytest
from geoalchemy2.shape import from_shape
from httpx import AsyncClient
from shapely.geometry import Point
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis, JobStatusEnum
from app.models.area import ProtectedArea
from app.models.event import ChangeEvent, VerificationStatusEnum
from app.models.workspace import Workspace
from app.services.hotspot_summarizer import (
    HotspotSummarizerService,
    build_deterministic_summary,
)


def test_build_deterministic_summary_english():
    telemetry = {
        "area_name": "Pench National Park",
        "place_name": "Kurai Wildlife Range",
        "affected_area_ha": 1.9,
        "change_label": "Vegetation loss candidate",
        "severity": "critical",
        "baseline_value": 0.742,
        "comparison_value": 0.458,
        "mean_ndvi_change": -0.284,
        "sensor": "Sentinel-2",
        "nearest_known_road_distance_m": 1200.0,
        "nearest_known_settlement_distance_m": 4800.0,
        "priority_score": 82.0,
        "coordinates": {"lat": 21.8423, "lon": 79.2842},
    }
    summary = build_deterministic_summary(telemetry, lang="en")
    assert "Vegetation loss candidate" in summary["headline"]
    assert "Kurai Wildlife Range, Pench National Park" in summary["headline"]
    assert "1.9 ha" in summary["short_summary"]
    assert "82/100" in summary["short_summary"]
    assert "Incident Synopsis" in summary["full_brief"]
    assert "Ecological & Spectral Impact" in summary["full_brief"]
    assert "Corridor Proximity & Patrol Access" in summary["full_brief"]
    assert len(summary["key_takeaways"]) == 3
    assert summary["source"] == "deterministic_engine"


def test_build_deterministic_summary_hinglish():
    telemetry = {
        "area_name": "Pench National Park",
        "place_name": "Kurai Wildlife Range",
        "affected_area_ha": 1.9,
        "change_label": "Vegetation loss candidate",
        "severity": "critical",
        "baseline_value": 0.742,
        "comparison_value": 0.458,
        "mean_ndvi_change": -0.284,
        "sensor": "Sentinel-2",
        "nearest_known_road_distance_m": 1200.0,
        "nearest_known_settlement_distance_m": 4800.0,
        "priority_score": 82.0,
        "coordinates": {"lat": 21.8423, "lon": 79.2842},
    }
    summary = build_deterministic_summary(telemetry, lang="hinglish")
    assert "Kurai Wildlife Range, Pench National Park" in summary["headline"]
    assert "detect hua hai" in summary["short_summary"]
    assert "patrol corridor" in summary["short_summary"]
    assert len(summary["key_takeaways"]) == 3
    assert summary["language"] == "hinglish"


@pytest.mark.asyncio
async def test_hotspot_summary_endpoint(
    client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
    auth_headers: dict,
):
    ws_id = test_workspace

    area_id = uuid.uuid4()
    area = ProtectedArea(
        id=area_id,
        slug="pench-summary-test",
        name="Pench Tiger Reserve",
        country="India",
        area_km2=1180.0,
        centroid_lat=21.65,
        centroid_lon=79.25,
        boundary=from_shape(Point(79.25, 21.65).buffer(0.1), srid=4326),
        analysis_aoi=from_shape(Point(79.25, 21.65).buffer(0.1), srid=4326),
    )
    db_session.add(area)

    analysis_id = uuid.uuid4()
    analysis = Analysis(
        id=analysis_id,
        workspace_id=ws_id,
        area_id=area_id,
        aoi_snapshot={"type": "Point", "coordinates": [79.25, 21.65]},
        baseline_start=datetime.date(2024, 1, 1),
        baseline_end=datetime.date(2024, 1, 31),
        comparison_start=datetime.date(2025, 1, 1),
        comparison_end=datetime.date(2025, 1, 31),
        requested_layers=["vegetation"],
        configuration_id="summary-test",
        status=JobStatusEnum.SUCCEEDED.value,
        created_by="test-analyst",
    )
    db_session.add(analysis)

    event_id = uuid.uuid4()
    event = ChangeEvent(
        id=event_id,
        analysis_id=analysis_id,
        workspace_id=ws_id,
        change_type="vegetation_loss",
        status=VerificationStatusEnum.PENDINGFIELDVERIFICATION.value,
        affected_area_ha=2.45,
        geom=from_shape(Point(79.28, 21.84).buffer(0.01), srid=4326),
        mean_ndvi_change=-0.36,
        properties={
            "baseline_mean": 0.78,
            "comparison_mean": 0.42,
            "priority_components": {"magnitude": 0.9, "sensitivity": 0.85, "context": 0.9},
        },
        nearest_known_road_distance_m=850.0,
        nearest_known_settlement_distance_m=3200.0,
        priority_score=88.5,
        method_version="vegetation-v1",
        record_version=1,
    )
    db_session.add(event)
    await db_session.commit()

    resp = await client.get(
        f"/api/v1/hotspots/{event_id}/summary?lang=en", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "headline" in data
    assert "short_summary" in data
    assert "full_brief" in data
    assert "key_takeaways" in data
    assert len(data["key_takeaways"]) == 3
    assert data["confidence"] == "high"
    assert data["source"] in ("groq_llm", "deterministic_engine")

    # Hinglish query
    resp_hi = await client.get(
        f"/api/v1/hotspots/{event_id}/summary?lang=hinglish", headers=auth_headers
    )
    assert resp_hi.status_code == 200
    data_hi = resp_hi.json()
    assert data_hi["language"] == "hinglish"
