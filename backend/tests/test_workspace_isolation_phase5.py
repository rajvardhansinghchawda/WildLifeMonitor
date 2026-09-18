import uuid
from datetime import date

import pytest
from geoalchemy2.shape import from_shape
from httpx import AsyncClient
from shapely.geometry import Polygon
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis, AnalysisLayer
from app.models.event import ChangeEvent
from app.models.workspace import Membership, RoleEnum, Workspace


@pytest.mark.asyncio
async def test_cross_workspace_denial_for_phase5_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
):
    """Verify strict cross-workspace denial for every Phase 5 endpoint."""
    # 1. Create a second, isolated workspace and foreign user
    foreign_ws = Workspace(id=uuid.uuid4(), name="Foreign Conservancy")
    db_session.add(foreign_ws)
    foreign_user_id = f"foreign-user-{uuid.uuid4().hex[:6]}"
    membership = Membership(
        id=uuid.uuid4(),
        workspace_id=foreign_ws.id,
        user_id=foreign_user_id,
        role=RoleEnum.ANALYST.value,
    )
    db_session.add(membership)

    # 2. Create resource in test_workspace (Workspace A)
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

    layer = AnalysisLayer(
        id=uuid.uuid4(),
        analysis_id=analysis.id,
        layer_type="vegetation",
        status="ready",
    )
    db_session.add(layer)

    poly = Polygon(
        [[79.24, 21.64], [79.241, 21.64], [79.241, 21.641], [79.24, 21.641], [79.24, 21.64]]
    )
    evt = ChangeEvent(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        analysis_id=analysis.id,
        geom=from_shape(poly, srid=4326),
        change_type="vegetationlosscandidate",
        affected_area_ha=1.5,
        status="pendingfieldverification",
        method_version="vegetation-v1",
        record_version=1,
    )
    db_session.add(evt)
    await db_session.commit()

    # Foreign caller headers (Workspace B)
    foreign_headers = {
        "Authorization": f"Bearer dev-user:{foreign_user_id}",
        "X-Workspace-ID": str(foreign_ws.id),
    }

    # Negative Test 1: Cross-workspace PATCH /events/{id}/verification
    resp1 = await client.patch(
        f"/api/v1/events/{evt.id}/verification",
        headers=foreign_headers,
        json={"status": "investigating", "expected_record_version": 1},
    )
    assert resp1.status_code == 404

    # Negative Test 2: Cross-workspace GET /events/{id}
    resp2 = await client.get(f"/api/v1/events/{evt.id}", headers=foreign_headers)
    assert resp2.status_code == 404

    # Negative Test 3: Cross-workspace GET /analyses/{id}/layers/{layer_id}/access
    resp3 = await client.get(
        f"/api/v1/analyses/{analysis.id}/layers/{layer.id}/access",
        headers=foreign_headers,
    )
    assert resp3.status_code == 404

    # Negative Test 4: Cross-workspace GET /analyses/{id}/events
    resp4 = await client.get(
        f"/api/v1/analyses/{analysis.id}/events",
        headers=foreign_headers,
    )
    assert resp4.status_code == 404

    # Negative Test 5: Cross-workspace GET /analyses/{id}/events/export
    resp5 = await client.get(
        f"/api/v1/analyses/{analysis.id}/events/export",
        headers=foreign_headers,
    )
    assert resp5.status_code == 404

    # Negative Test 6: Unauthenticated / Invalid Workspace capabilities access
    unauth_headers = {
        "Authorization": "Bearer dev-user:intruder",
        "X-Workspace-ID": str(uuid.uuid4()),  # Non-existent workspace
    }
    resp6 = await client.get("/api/v1/capabilities", headers=unauth_headers)
    assert resp6.status_code in (401, 403)
