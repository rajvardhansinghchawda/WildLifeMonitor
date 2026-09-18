import uuid
from datetime import date

import pytest
from geoalchemy2.shape import from_shape
from shapely.geometry import Polygon
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis
from app.models.event import ChangeEvent
from app.models.workspace import Workspace
from app.services.priority_service import PriorityService


def test_priority_score_is_null_when_conservation_zones_missing():
    """Contract: superpower.md 'Missing required components produce a null score.

    Do not treat missing context as zero pressure.'
    """
    service = PriorityService()
    event_geom = {
        "type": "Polygon",
        "coordinates": [
            [[79.24, 21.64], [79.241, 21.64], [79.241, 21.641], [79.24, 21.641], [79.24, 21.64]]
        ],
    }

    # No conservation zone config provided
    result = service.compute_priority(
        event_geom_dict=event_geom,
        affected_area_ha=2.5,
        mean_ndvi_change=-0.35,
        conservation_zones=None,
        pressure_indicators={"features": []},
    )

    assert result.priority_score is None
    assert result.priority_method_version == "priority-v1"
    assert result.components is not None
    assert result.components["sensitivity"] is None
    assert result.components["magnitude"] is not None


def test_priority_score_is_null_when_context_missing():
    """Contract: Missing context indicators must produce null score, never treat as 0 pressure."""
    service = PriorityService()
    event_geom = {
        "type": "Polygon",
        "coordinates": [
            [[79.24, 21.64], [79.241, 21.64], [79.241, 21.641], [79.24, 21.641], [79.24, 21.64]]
        ],
    }

    # Conservation zone provided, but no pressure context
    result = service.compute_priority(
        event_geom_dict=event_geom,
        affected_area_ha=1.0,
        mean_ndvi_change=-0.20,
        conservation_zones=[{"geometry": event_geom}],
        pressure_indicators=None,
        context_distances=None,
    )

    assert result.priority_score is None
    assert result.components is not None
    assert result.components["sensitivity"] == 1.0
    assert result.components["context"] is None


def test_priority_score_accurate_calculation_and_weights():
    """Verify exact formula: round((0.50 * magnitude + 0.30 * sensitivity + 0.20 * context) * 100, 1)."""
    service = PriorityService()
    event_geom = {
        "type": "Polygon",
        "coordinates": [
            [[79.24, 21.64], [79.241, 21.64], [79.241, 21.641], [79.24, 21.641], [79.24, 21.64]]
        ],
    }

    # Case 1: Intersects conservation zone (sensitivity=1.0), near road (dist=0km -> context=1.0),
    # 10ha area + -0.5 ndvi (magnitude=1.0)
    result = service.compute_priority(
        event_geom_dict=event_geom,
        affected_area_ha=10.0,
        mean_ndvi_change=-0.5,
        conservation_zones=[{"geometry": event_geom}],
        context_distances={"nearest_road_distance_km": 0.0},
    )

    assert result.components["magnitude"] == 1.0
    assert result.components["sensitivity"] == 1.0
    assert result.components["context"] == 1.0
    assert result.priority_score == 100.0

    # Case 2: Outside conservation zone (sensitivity=0.0), far from roads (dist=10km -> context=0.0),
    # 5ha area, no ndvi change specified (magnitude=0.5)
    result2 = service.compute_priority(
        event_geom_dict=event_geom,
        affected_area_ha=5.0,
        mean_ndvi_change=None,
        conservation_zones=[
            {
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[80.0, 22.0], [80.1, 22.0], [80.1, 22.1], [80.0, 22.0]]],
                }
            }
        ],
        context_distances={"nearest_road_distance_km": 15.0},
    )

    assert result2.components["magnitude"] == 0.5
    assert result2.components["sensitivity"] == 0.0
    assert result2.components["context"] == 0.0
    # 0.50 * 0.50 = 0.25 * 100 = 25.0
    assert result2.priority_score == 25.0


@pytest.mark.asyncio
async def test_attach_priority_scores_in_database(
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
):
    """Verify that attach_priority_scores_to_events updates database rows based on workspace settings."""
    service = PriorityService()

    # 1. Workspace without conservation zones
    analysis = Analysis(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        status="running",
        stage="finalizing",
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
        affected_area_ha=2.0,
        mean_ndvi_change=-0.25,
        status="pendingfieldverification",
        method_version="vegetation-v1",
        record_version=1,
    )
    db_session.add(evt)
    await db_session.commit()

    # Run attachment: workspace has no conservation zones -> priority_score must remain None
    updated = await service.attach_priority_scores_to_events(
        session=db_session,
        analysis_id=analysis.id,
        workspace_id=test_workspace,
    )
    assert updated == 1

    await db_session.refresh(evt)
    assert evt.priority_score is None
    assert evt.priority_method_version == "priority-v1"

    # 2. Update workspace settings to include conservation zone and pressure indicators
    ws = await db_session.get(Workspace, test_workspace)
    assert ws is not None
    ws.settings = {
        "conservation_zones": [
            {
                "name": "Buffer Zone A",
                "geometry": poly.__geo_interface__,
            }
        ],
        "pressure_indicators": {
            "features": [
                {
                    "name": "Access Track 1",
                    "geometry": poly.__geo_interface__,
                }
            ]
        },
    }
    await db_session.commit()

    # Re-run attachment: now should have computed priority score
    updated2 = await service.attach_priority_scores_to_events(
        session=db_session,
        analysis_id=analysis.id,
        workspace_id=test_workspace,
    )
    assert updated2 == 1

    await db_session.refresh(evt)
    assert evt.priority_score is not None
    assert evt.priority_score > 0.0
    assert evt.priority_method_version == "priority-v1"
