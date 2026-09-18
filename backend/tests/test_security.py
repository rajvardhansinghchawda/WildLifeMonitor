import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workspace import Membership, RoleEnum, Workspace


@pytest.mark.asyncio
async def test_security_unauthenticated_without_membership(
    client: AsyncClient, db_session: AsyncSession
):
    """User without a membership in any workspace is rejected with 403."""
    # POST /api/v1/analyses requires Analyst role in an authorized workspace
    payload = {
        "aoi": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        "baseline": {"start": "2024-01-01", "end": "2024-02-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-02-01"},
        "layers": ["vegetation"],
        "configuration_id": "test-v1",
    }
    # dev-user-no-membership has no Membership rows in DB
    headers = {"Authorization": "Bearer dev-user:user-with-no-workspace"}
    response = await client.post("/api/v1/analyses", json=payload, headers=headers)
    assert response.status_code == 403
    assert "no workspace memberships" in response.json()["error"]["message"]


@pytest.mark.asyncio
async def test_security_role_hierarchy(client: AsyncClient, db_session: AsyncSession):
    """Viewer cannot perform an Analyst action (POST /api/v1/analyses)."""
    # 1. Create Workspace and a VIEWER membership
    ws_id = uuid.uuid4()
    user_id = "viewer-user-01"
    ws = Workspace(id=ws_id, name="Test Wildlife Zone", settings={})
    membership = Membership(workspace_id=ws_id, user_id=user_id, role=RoleEnum.VIEWER.value)
    db_session.add_all([ws, membership])
    await db_session.commit()

    payload = {
        "aoi": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        "baseline": {"start": "2024-01-01", "end": "2024-02-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-02-01"},
        "layers": ["vegetation"],
        "configuration_id": "test-v1",
    }
    headers = {
        "Authorization": f"Bearer dev-user:{user_id}",
        "X-Workspace-ID": str(ws_id),
    }

    # Attempt submission as Viewer
    response = await client.post("/api/v1/analyses", json=payload, headers=headers)
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["error"]["message"]
