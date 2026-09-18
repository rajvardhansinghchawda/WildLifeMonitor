from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.analyses import router as analyses_router
from app.api.v1.areas import router as areas_router
from app.api.v1.auth import router as auth_router
from app.api.v1.capabilities import router as capabilities_router
from app.api.v1.events import router as events_router
from app.api.v1.health import router as health_router
from app.api.v1.hotspots import router as hotspots_router
from app.api.v1.public import router as public_router
from app.api.v1.reports import router as reports_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(public_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(areas_router)
api_v1_router.include_router(hotspots_router)
api_v1_router.include_router(alerts_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(analyses_router)
api_v1_router.include_router(events_router)
api_v1_router.include_router(capabilities_router)

