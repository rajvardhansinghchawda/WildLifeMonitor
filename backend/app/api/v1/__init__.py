from fastapi import APIRouter

from app.api.v1.analyses import router as analyses_router
from app.api.v1.capabilities import router as capabilities_router
from app.api.v1.events import router as events_router
from app.api.v1.health import router as health_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(analyses_router)
api_v1_router.include_router(events_router)
api_v1_router.include_router(capabilities_router)
