from unittest.mock import patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_live(client: AsyncClient):
    """GET /health/live returns 200 OK without dependencies."""
    response = await client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_health_ready_success(client: AsyncClient):
    """GET /health/ready returns 200 when database and redis respond."""
    response = await client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["dependencies"]["database"] == "healthy"
    assert data["dependencies"]["redis"] == "healthy"


@pytest.mark.asyncio
async def test_health_ready_database_failure(client: AsyncClient):
    """GET /health/ready returns 503 when database is down."""
    with patch(
        "sqlalchemy.ext.asyncio.AsyncSession.execute",
        side_effect=Exception("Database connection lost"),
    ):
        response = await client.get("/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert "unhealthy" in data["dependencies"]["database"]
