import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.schemas.health import HealthLiveResponse, HealthReadyResponse

router = APIRouter(tags=["Health"])


@router.get("/health/live", response_model=HealthLiveResponse)
async def health_live():
    """Liveness probe to verify that the FastAPI process is running."""
    return HealthLiveResponse(status="ok")


@router.get("/health/ready", response_model=HealthReadyResponse)
async def health_ready(response: Response, db: AsyncSession = Depends(get_db)):
    """
    Readiness probe verifying core dependencies:
    - PostgreSQL database connectivity
    - Redis connectivity
    Returns 200 if both are healthy, 503 if any core dependency fails.
    """
    dependencies = {}
    is_healthy = True

    # 1. Check Database
    try:
        await db.execute(text("SELECT 1"))
        dependencies["database"] = "healthy"
    except Exception as exc:
        dependencies["database"] = f"unhealthy: {str(exc)}"
        is_healthy = False

    # 2. Check Redis
    try:
        r = aioredis.from_url(settings.REDIS_URL, socket_timeout=2)
        await r.ping()
        await r.aclose()
        dependencies["redis"] = "healthy"
    except Exception as exc:
        dependencies["redis"] = f"unhealthy: {str(exc)}"
        is_healthy = False

    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthReadyResponse(status="unhealthy", dependencies=dependencies)

    return HealthReadyResponse(status="ok", dependencies=dependencies)
