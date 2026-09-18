"""End-to-End API Verification Harness.

Exercises and validates all platform endpoints across all 3 portals:
Public, Investigator, and Admin.
"""

import json
import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.models.workspace import RoleEnum


@pytest.mark.asyncio
async def test_e2e_full_api_surface(client: AsyncClient, db_session):
    """Test every major API endpoint across all system domains."""
    headers = {
        "Authorization": "Bearer dev-user:admin-01",
        "X-Workspace-ID": "00000000-0000-0000-0000-000000000001",
    }

    # 1. Root & Health
    resp = await client.get("/health")
    assert resp.status_code == 200, f"/health returned {resp.status_code}"
    health_data = resp.json()
    assert health_data["status"] in ["healthy", "degraded", "operational"]

    # 2. Public Portal Endpoints (Unauthenticated)
    pub_overview = await client.get("/api/v1/public/overview")
    assert pub_overview.status_code == 200
    assert "system_status" in pub_overview.json()

    pub_demos = await client.get("/api/v1/public/demonstrations")
    assert pub_demos.status_code == 200
    assert isinstance(pub_demos.json(), list)

    pub_events = await client.get("/api/v1/public/demonstrations/pench-tiger-reserve/events")
    assert pub_events.status_code in [200, 404]

    # 3. Admin Portal Endpoints
    adm_telemetry = await client.get("/api/v1/admin/telemetry", headers=headers)
    assert adm_telemetry.status_code == 200
    tel_data = adm_telemetry.json()
    assert "kpis" in tel_data
    assert "throughput_latency_series" in tel_data
    assert "status_distribution" in tel_data

    adm_members = await client.get("/api/v1/admin/members", headers=headers)
    assert adm_members.status_code == 200
    mem_data = adm_members.json()
    assert "items" in mem_data
    assert "role_distribution" in mem_data

    # Test PATCH member role
    adm_patch = await client.patch(
        "/api/v1/admin/members/ranger-marcus",
        json={"role": "ANALYST", "is_active": True},
        headers=headers,
    )
    assert adm_patch.status_code in [200, 404]

    adm_settings = await client.get("/api/v1/admin/settings", headers=headers)
    assert adm_settings.status_code == 200
    sett_data = adm_settings.json()
    assert "scientific_weights" in sett_data
    assert "limits" in sett_data

    # Test PUT settings
    adm_put_sett = await client.put(
        "/api/v1/admin/settings",
        json={
            "magnitude_weight": 0.50,
            "sensitivity_weight": 0.30,
            "context_weight": 0.20,
            "context_buffer_km": 5.0,
            "max_cloud_cover_percent": 20,
            "ndvi_loss_threshold": -0.25,
        },
        headers=headers,
    )
    assert adm_put_sett.status_code == 200

    adm_audit = await client.get("/api/v1/admin/audit-logs", headers=headers)
    assert adm_audit.status_code == 200
    assert "items" in adm_audit.json()

    # 4. Investigator Portal Endpoints
    analyses_resp = await client.get("/api/v1/analyses", headers=headers)
    assert analyses_resp.status_code == 200

    areas_resp = await client.get("/api/v1/areas", headers=headers)
    assert areas_resp.status_code == 200

    hotspots_resp = await client.get("/api/v1/hotspots", headers=headers)
    assert hotspots_resp.status_code == 200

    alerts_resp = await client.get("/api/v1/alerts", headers=headers)
    assert alerts_resp.status_code == 200

    reports_resp = await client.get("/api/v1/reports", headers=headers)
    assert reports_resp.status_code == 200
