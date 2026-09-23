import uuid
from datetime import date, datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis
from app.models.workspace import Membership, RoleEnum, Workspace


@pytest.mark.asyncio
async def test_cross_workspace_access_denial(client: AsyncClient, db_session: AsyncSession):
    """
    Negative test for security and isolation:
    1. Workspace A has user Alice and Analysis A1.
    2. Workspace B has user Bob.
    3. Bob attempts to access Analysis A1.
    4. Assert Bob receives 404/403 access denial.
    """
    now = datetime.now(timezone.utc)
    ws_a_id = uuid.uuid4()
    ws_b_id = uuid.uuid4()
    alice_id = "user-alice"
    bob_id = "user-bob"

    ws_a = Workspace(id=ws_a_id, name="Workspace Alpha")
    ws_b = Workspace(id=ws_b_id, name="Workspace Beta")

    mem_alice = Membership(workspace_id=ws_a_id, user_id=alice_id, role=RoleEnum.ANALYST.value)
    mem_bob = Membership(workspace_id=ws_b_id, user_id=bob_id, role=RoleEnum.ANALYST.value)

    analysis_a = Analysis(
        id=uuid.uuid4(),
        workspace_id=ws_a_id,
        aoi_snapshot={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        baseline_start=date(2024, 1, 1),
        baseline_end=date(2024, 2, 1),
        comparison_start=date(2025, 1, 1),
        comparison_end=date(2025, 2, 1),
        requested_layers=["vegetation"],
        configuration_id="test-v1",
        status="queued",
        created_by=alice_id,
        created_at=now,
        updated_at=now,
    )

    db_session.add_all([ws_a, ws_b, mem_alice, mem_bob, analysis_a])
    await db_session.commit()

    # Bob (member of Workspace B) attempts to read Analysis A1 using his valid credentials & Workspace B context
    headers_bob = {
        "Authorization": f"Bearer dev-user:{bob_id}",
        "X-Workspace-ID": str(ws_b_id),
    }
    response = await client.get(f"/api/v1/analyses/{analysis_a.id}", headers=headers_bob)

    # Scoping must reject access (404 Not Found to prevent data-existence leakage)
    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"].lower()

    # Bob also cannot forge a header to claim Workspace A
    headers_bob_forged = {
        "Authorization": f"Bearer dev-user:{bob_id}",
        "X-Workspace-ID": str(ws_a_id),
    }
    response_forged = await client.get(
        f"/api/v1/analyses/{analysis_a.id}", headers=headers_bob_forged
    )
    assert response_forged.status_code == 403
    assert "not an authorized member" in response_forged.json()["error"]["message"].lower()
