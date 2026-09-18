import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis
from app.models.workspace import Membership, RoleEnum, Workspace


@pytest.mark.asyncio
async def test_persistence_roundtrip(client: AsyncClient, db_session: AsyncSession):
    """
    End-to-end Phase 1 acceptance test:
    1. Create Workspace + Membership (Analyst role).
    2. Authenticate as that member via dev auth mode.
    3. Submit POST /api/v1/analyses.
    4. Assert 202 Accepted response with Location header.
    5. Query PostgreSQL directly to assert the Analysis row exists and is scoped to the workspace.
    """
    workspace_id = uuid.uuid4()
    user_id = "analyst-field-01"

    workspace = Workspace(
        id=workspace_id,
        name="Pench Tiger Reserve Workspace",
        settings={"default_crs": "EPSG:4326"},
    )
    membership = Membership(
        workspace_id=workspace_id,
        user_id=user_id,
        role=RoleEnum.ANALYST.value,
    )
    db_session.add_all([workspace, membership])
    await db_session.commit()

    aoi_geojson = {
        "type": "Polygon",
        "coordinates": [
            [
                [79.20, 21.60],
                [79.30, 21.60],
                [79.30, 21.70],
                [79.20, 21.70],
                [79.20, 21.60],
            ]
        ],
    }
    payload = {
        "aoi": aoi_geojson,
        "baseline": {"start": "2024-01-01", "end": "2024-04-01"},
        "comparison": {"start": "2025-01-01", "end": "2025-04-01"},
        "layers": ["vegetation", "water"],
        "configuration_id": "mvp-v1",
    }
    headers = {
        "Authorization": f"Bearer dev-user:{user_id}",
        "X-Workspace-ID": str(workspace_id),
        "Idempotency-Key": "test-key-101",
    }

    # Execute request
    response = await client.post("/api/v1/analyses", json=payload, headers=headers)
    assert response.status_code == 202
    data = response.json()
    assert "analysis_id" in data
    assert data["status"] == "queued"
    analysis_id = data["analysis_id"]

    # Verify Location header
    assert response.headers.get("Location") == f"/api/v1/analyses/{analysis_id}"

    # Verify persistent database row
    stmt = select(Analysis).where(Analysis.id == uuid.UUID(analysis_id))
    result = await db_session.execute(stmt)
    persisted_analysis = result.scalar_one_or_none()

    assert persisted_analysis is not None
    assert persisted_analysis.workspace_id == workspace_id
    assert persisted_analysis.created_by == user_id
    assert persisted_analysis.status == "queued"
    assert persisted_analysis.configuration_id == "mvp-v1"
    assert persisted_analysis.idempotency_key == "test-key-101"
    assert persisted_analysis.requested_layers == ["vegetation", "water"]
    assert persisted_analysis.aoi_snapshot == aoi_geojson
