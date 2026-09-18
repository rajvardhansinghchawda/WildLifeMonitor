from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.security import WorkspaceContext, require_role
from app.models.workspace import RoleEnum
from app.schemas.capability import CapabilitiesResponse, SystemLimits

router = APIRouter(prefix="/capabilities", tags=["Capabilities"])


@router.get("", response_model=CapabilitiesResponse)
async def get_capabilities(
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
):
    """Returns deployment capabilities and system limits.

    Serves as single source of truth for clients, scoped to authorized workspace members.
    """
    methods = ["vegetation", "water", "builtup"]
    if settings.GFW_ENABLED:
        methods.append("forestalerts")

    return CapabilitiesResponse(
        enabled_methods=methods,
        limits=SystemLimits(
            maximum_aoi_km2=settings.MAX_AOI_KM2,
            maximum_geometry_vertices=settings.MAX_AOI_VERTICES,
            maximum_observation_window_days=180,
            maximum_active_jobs_per_workspace=settings.MAX_ACTIVE_JOBS_PER_WORKSPACE,
            default_event_page_size=50,
            maximum_event_page_size=100,
        ),
    )
