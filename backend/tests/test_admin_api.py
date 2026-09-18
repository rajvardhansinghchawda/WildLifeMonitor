import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.workspace import Membership, RoleEnum, Workspace


@pytest.fixture
async def admin_workspace(db_session: AsyncSession):
    ws_id = uuid.uuid4()
    ws = Workspace(
        id=ws_id,
        name="Admin Unit Test Workspace",
        settings={
            "priority_weights": {"magnitude": 0.50, "sensitivity": 0.30, "context": 0.20},
            "context_buffer_km": 5.0,
        },
    )
    db_session.add(ws)
    await db_session.flush()

    # Add admin membership for test actor
    admin_mem = Membership(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        user_id="test-admin-actor",
        role=RoleEnum.ADMIN.value,
    )
    # Add analyst membership
    analyst_mem = Membership(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        user_id="test-field-analyst",
        role=RoleEnum.ANALYST.value,
    )
    db_session.add_all([admin_mem, analyst_mem])

    # Add an audit log
    audit = AuditLog(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        actor_id="test-admin-actor",
        action="TEST_ACTION",
        target_type="Workspace",
        target_id=str(ws_id),
        payload={"note": "Automated test"},
    )
    db_session.add(audit)
    await db_session.commit()
    return ws_id


@pytest.mark.asyncio
async def test_admin_telemetry(client: AsyncClient, admin_workspace: uuid.UUID):
    headers = {
        "Authorization": "Bearer dev-user:test-admin-actor",
        "X-Workspace-ID": str(admin_workspace),
    }
    response = await client.get("/api/v1/admin/telemetry", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert len(data["throughput_latency_series"]) == 24
    assert len(data["status_distribution"]) == 4
    assert len(data["service_heartbeats"]) >= 5


@pytest.mark.asyncio
async def test_admin_members(client: AsyncClient, admin_workspace: uuid.UUID):
    headers = {
        "Authorization": "Bearer dev-user:test-admin-actor",
        "X-Workspace-ID": str(admin_workspace),
    }
    response = await client.get("/api/v1/admin/members", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 2
    assert len(data["role_distribution"]) == 3

    # Update member role
    patch_res = await client.patch(
        "/api/v1/admin/members/test-field-analyst",
        headers=headers,
        json={"role": "viewer", "is_active": True},
    )
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["role"] == "viewer"


@pytest.mark.asyncio
async def test_admin_settings_get_and_put(client: AsyncClient, admin_workspace: uuid.UUID):
    headers = {
        "Authorization": "Bearer dev-user:test-admin-actor",
        "X-Workspace-ID": str(admin_workspace),
    }
    # GET settings
    get_res = await client.get("/api/v1/admin/settings", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["scientific_weights"]["magnitude"] == 0.50

    # PUT invalid weights (sum != 1.0)
    bad_put = await client.put(
        "/api/v1/admin/settings",
        headers=headers,
        json={
            "magnitude_weight": 0.80,
            "sensitivity_weight": 0.80,
            "context_weight": 0.20,
            "context_buffer_km": 5.0,
            "max_cloud_cover_percent": 20,
            "ndvi_loss_threshold": -0.25,
        },
    )
    assert bad_put.status_code == 400

    # PUT valid weights
    valid_put = await client.put(
        "/api/v1/admin/settings",
        headers=headers,
        json={
            "magnitude_weight": 0.40,
            "sensitivity_weight": 0.35,
            "context_weight": 0.25,
            "context_buffer_km": 6.5,
            "max_cloud_cover_percent": 15,
            "ndvi_loss_threshold": -0.30,
        },
    )
    assert valid_put.status_code == 200
    updated_settings = valid_put.json()["settings"]
    assert updated_settings["priority_weights"]["magnitude"] == 0.40
    assert updated_settings["context_buffer_km"] == 6.5


@pytest.mark.asyncio
async def test_admin_audit_logs(client: AsyncClient, admin_workspace: uuid.UUID):
    headers = {
        "Authorization": "Bearer dev-user:test-admin-actor",
        "X-Workspace-ID": str(admin_workspace),
    }
    response = await client.get("/api/v1/admin/audit-logs", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert data["items"][0]["action"] is not None
