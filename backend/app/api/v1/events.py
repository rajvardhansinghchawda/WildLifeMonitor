from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import WorkspaceContext, require_role
from app.models.workspace import RoleEnum
from app.schemas.event import EventDetailResponse, EventVerificationUpdateRequest

router = APIRouter(prefix="/events", tags=["Events"])


@router.get(
    "/{event_id}", response_model=EventDetailResponse, status_code=status.HTTP_501_NOT_IMPLEMENTED
)
async def get_event(
    event_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
):
    """Stub for event detail retrieval (implemented in Phase 3)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Event details implemented in Phase 3."
    )


@router.patch("/{event_id}/verification", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def update_event_verification(
    event_id: str,
    request: EventVerificationUpdateRequest,
    context: WorkspaceContext = Depends(require_role(RoleEnum.ANALYST)),
):
    """Stub for event verification update (implemented in Phase 5)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Verification update implemented in Phase 5.",
    )
