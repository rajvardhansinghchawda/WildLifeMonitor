import uuid
from datetime import date

import pytest
from geoalchemy2.shape import from_shape
from httpx import AsyncClient
from shapely.geometry import Polygon
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis
from app.models.audit import AuditLog
from app.models.event import ChangeEvent, VerificationStatusEnum
from app.models.verification import Verification


@pytest.mark.asyncio
async def test_verification_valid_state_transitions(
    client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
    auth_headers: dict,
):
    """Analyst transitions event: pendingfieldverification -> investigating -> verifiedchange."""
    # 1. Setup analysis and event
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
        affected_area_ha=1.8,
        mean_ndvi_change=-0.22,
        status=VerificationStatusEnum.PENDINGFIELDVERIFICATION.value,
        method_version="vegetation-v1",
        record_version=1,
    )
    db_session.add(evt)
    await db_session.commit()

    # Step A: Transition to 'investigating'
    resp_inv = await client.patch(
        f"/api/v1/events/{evt.id}/verification",
        headers=auth_headers,
        json={
            "status": "investigating",
            "expected_record_version": 1,
            "notes": "Assigned to ranger team for drone survey.",
        },
    )
    assert resp_inv.status_code == 200, resp_inv.text
    body_inv = resp_inv.json()
    assert body_inv["properties"]["status"] == "investigating"
    assert body_inv["properties"]["record_version"] == 2
    assert (
        body_inv["properties"]["latest_verification"]["notes"]
        == "Assigned to ranger team for drone survey."
    )

    # Step B: Transition from 'investigating' to 'verifiedchange'
    resp_ver = await client.patch(
        f"/api/v1/events/{evt.id}/verification",
        headers=auth_headers,
        json={
            "status": "verifiedchange",
            "expected_record_version": 2,
            "notes": "Field survey confirmed canopy thinning matching detection.",
        },
    )
    assert resp_ver.status_code == 200, resp_ver.text
    body_ver = resp_ver.json()
    assert body_ver["properties"]["status"] == "verifiedchange"
    assert body_ver["properties"]["record_version"] == 3

    # Step C: Read back via GET /events/{id}
    resp_get = await client.get(f"/api/v1/events/{evt.id}", headers=auth_headers)
    assert resp_get.status_code == 200
    body_get = resp_get.json()
    assert body_get["properties"]["status"] == "verifiedchange"
    assert body_get["properties"]["record_version"] == 3
    assert len(body_get["properties"]["verifications"]) == 2

    # Step D: Verify audit_logs and verifications tables in DB
    v_res = await db_session.execute(select(Verification).where(Verification.event_id == evt.id))
    ver_rows = list(v_res.scalars().all())
    assert len(ver_rows) == 2

    a_res = await db_session.execute(select(AuditLog).where(AuditLog.target_id == str(evt.id)))
    audit_rows = list(a_res.scalars().all())
    assert len(audit_rows) == 2
    assert audit_rows[0].action == "event.verification.updated"


@pytest.mark.asyncio
async def test_verification_notes_required_for_dismissed_and_inconclusive(
    client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
    auth_headers: dict,
):
    """Contract: Dismissed and inconclusive transitions strictly require notes."""
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
        affected_area_ha=1.0,
        status="pendingfieldverification",
        method_version="vegetation-v1",
        record_version=1,
    )
    db_session.add(evt)
    await db_session.commit()

    # Attempt 1: Dismissed without notes -> rejected with 422
    resp_no_notes = await client.patch(
        f"/api/v1/events/{evt.id}/verification",
        headers=auth_headers,
        json={"status": "dismissed", "expected_record_version": 1, "notes": ""},
    )
    assert resp_no_notes.status_code == 422
    assert "NOTESREQUIRED" in resp_no_notes.text

    # Attempt 2: Inconclusive without notes -> rejected with 422
    resp_inconclusive_no_notes = await client.patch(
        f"/api/v1/events/{evt.id}/verification",
        headers=auth_headers,
        json={"status": "inconclusive", "expected_record_version": 1, "notes": "   "},
    )
    assert resp_inconclusive_no_notes.status_code == 422
    assert "NOTESREQUIRED" in resp_inconclusive_no_notes.text

    # Attempt 3: Dismissed WITH notes -> accepted with 200
    resp_with_notes = await client.patch(
        f"/api/v1/events/{evt.id}/verification",
        headers=auth_headers,
        json={
            "status": "dismissed",
            "expected_record_version": 1,
            "notes": "Verified as seasonal agricultural crop rotation, not deforestation.",
        },
    )
    assert resp_with_notes.status_code == 200
    assert resp_with_notes.json()["properties"]["status"] == "dismissed"


@pytest.mark.asyncio
async def test_verification_optimistic_concurrency_conflict(
    client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
    auth_headers: dict,
):
    """Contract: Version mismatch returns 409 VERSIONCONFLICT and does not apply update."""
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
        affected_area_ha=1.0,
        status="pendingfieldverification",
        method_version="vegetation-v1",
        record_version=5,  # current version is 5
    )
    db_session.add(evt)
    await db_session.commit()

    # Stale expected_record_version = 4
    resp = await client.patch(
        f"/api/v1/events/{evt.id}/verification",
        headers=auth_headers,
        json={
            "status": "investigating",
            "expected_record_version": 4,
            "notes": "Late update from another tab.",
        },
    )
    assert resp.status_code == 409
    data = resp.json()
    assert data["error"]["code"] == "VERSIONCONFLICT"
    assert data["error"]["details"]["current_version"] == 5
    assert data["error"]["details"]["expected_version"] == 4

    # Ensure event in DB is unaltered
    await db_session.refresh(evt)
    assert evt.record_version == 5
    assert evt.status == "pendingfieldverification"
