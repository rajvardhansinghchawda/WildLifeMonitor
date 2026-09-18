import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import WorkspaceContext, require_role
from app.db.session import get_db
from app.models.event import ChangeEvent
from app.models.workspace import RoleEnum
from app.schemas.event import (
    EventDetailResponse,
    EventProperties,
    EventVerificationUpdateRequest,
)

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/{event_id}", response_model=EventDetailResponse)
async def get_event(
    event_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
    db: AsyncSession = Depends(get_db),
) -> EventDetailResponse:
    """Retrieve detailed GeoJSON representation of a single ChangeEvent."""
    try:
        parsed_id = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid event identifier."
        )

    query = select(ChangeEvent).where(
        ChangeEvent.id == parsed_id,
        ChangeEvent.workspace_id == uuid.UUID(context.workspace_id),
    )
    res = await db.execute(query)
    evt = res.scalar_one_or_none()
    if not evt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found in workspace."
        )

    evt_any: Any = evt
    shapely_geom = to_shape(evt_any.geom)
    properties = EventProperties(
        analysis_id=str(evt_any.analysis_id),
        change_type=evt_any.change_type,
        affected_area_ha=evt_any.affected_area_ha,
        mean_ndvi_change=evt_any.mean_ndvi_change,
        valid_pixel_fraction=evt_any.valid_pixel_fraction,
        quality_label=evt_any.quality_label,
        source_confidence=evt_any.source_confidence,
        priority_score=evt_any.priority_score,
        priority_method_version=evt_any.priority_method_version,
        status=evt_any.status,
        method_version=evt_any.method_version,
        record_version=evt_any.record_version,
    )

    return EventDetailResponse(
        type="Feature",
        id=str(evt_any.id),
        geometry=dict(mapping(shapely_geom)),
        properties=properties,
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
