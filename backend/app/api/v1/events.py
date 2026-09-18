import uuid
from datetime import datetime, timezone
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictException, ValidationException
from app.core.security import WorkspaceContext, require_role
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.event import ChangeEvent, VerificationStatusEnum
from app.models.verification import Verification
from app.models.workspace import RoleEnum
from app.schemas.event import (
    EventDetailResponse,
    EventProperties,
    EventVerificationUpdateRequest,
    VerificationRecordSchema,
)

router = APIRouter(prefix="/events", tags=["Events"])

ALLOWED_VERIFICATION_STATUSES = {
    VerificationStatusEnum.PENDINGFIELDVERIFICATION.value,
    VerificationStatusEnum.INVESTIGATING.value,
    VerificationStatusEnum.VERIFIEDCHANGE.value,
    VerificationStatusEnum.DISMISSED.value,
    VerificationStatusEnum.INCONCLUSIVE.value,
}


@router.get("/{event_id}", response_model=EventDetailResponse)
async def get_event(
    event_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
    db: AsyncSession = Depends(get_db),
) -> EventDetailResponse:
    """Retrieve detailed GeoJSON representation of a single ChangeEvent including verification history."""
    try:
        parsed_id = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid event identifier."
        )

    query = (
        select(ChangeEvent)
        .options(selectinload(ChangeEvent.verifications))
        .where(
            ChangeEvent.id == parsed_id,
            ChangeEvent.workspace_id == uuid.UUID(context.workspace_id),
        )
    )
    res = await db.execute(query)
    evt = res.scalar_one_or_none()
    if not evt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found in workspace."
        )

    evt_any: Any = evt
    shapely_geom = to_shape(evt_any.geom)

    # Format verification records
    verification_schemas: List[VerificationRecordSchema] = []
    for ver in sorted(evt_any.verifications, key=lambda v: v.created_at, reverse=True):
        verification_schemas.append(
            VerificationRecordSchema(
                id=str(ver.id),
                actor_id=str(ver.actor_id),
                from_status=str(ver.from_status),
                to_status=str(ver.to_status),
                notes=ver.notes,
                record_version=int(ver.record_version),
                created_at=ver.created_at.isoformat(),
            )
        )

    latest_ver = verification_schemas[0] if verification_schemas else None

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
        nearest_known_road_distance_m=evt_any.nearest_known_road_distance_m,
        nearest_known_settlement_distance_m=evt_any.nearest_known_settlement_distance_m,
        context_source=evt_any.context_source,
        status=evt_any.status,
        method_version=evt_any.method_version,
        record_version=evt_any.record_version,
        latest_verification=latest_ver,
        verifications=verification_schemas,
    )

    return EventDetailResponse(
        type="Feature",
        id=str(evt_any.id),
        geometry=dict(mapping(shapely_geom)),
        properties=properties,
    )


@router.patch("/{event_id}/verification", response_model=EventDetailResponse)
async def update_event_verification(
    event_id: str,
    request: EventVerificationUpdateRequest,
    context: WorkspaceContext = Depends(require_role(RoleEnum.ANALYST)),
    db: AsyncSession = Depends(get_db),
) -> EventDetailResponse:
    """Record a field verification or status review decision on a ChangeEvent.

    Contractual rules (spec.md & superpower.md):
    - Allowed states: pendingfieldverification, investigating, verifiedchange, dismissed, inconclusive.
    - Notes are strictly mandatory for 'dismissed' and 'inconclusive' transitions.
    - Optimistic concurrency: expected_record_version must match current record_version; returns 409 VERSIONCONFLICT on mismatch.
    - Writes a Verification row (actor, from_status, to_status, notes, record_version) and an AuditLog row.
    - A verified event means the reviewer confirmed the recorded change under the workflow; it does NOT confirm cause, illegality, or species impact.
    """
    try:
        parsed_id = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid event identifier."
        )

    # 1. Validate target status
    if request.status not in ALLOWED_VERIFICATION_STATUSES:
        raise ValidationException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="INVALIDSTATUS",
            message=f"Invalid verification status '{request.status}'. Allowed states: {sorted(ALLOWED_VERIFICATION_STATUSES)}.",
            details={"allowed_statuses": sorted(ALLOWED_VERIFICATION_STATUSES)},
        )

    # 2. Enforce notes requirement for dismissed and inconclusive
    if request.status in (
        VerificationStatusEnum.DISMISSED.value,
        VerificationStatusEnum.INCONCLUSIVE.value,
    ):
        if not request.notes or not request.notes.strip():
            raise ValidationException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                error_code="NOTESREQUIRED",
                message=f"Investigator notes are strictly required when transitioning event to '{request.status}'.",
                details={"status": request.status},
            )

    # 3. Fetch event in caller's workspace
    query = (
        select(ChangeEvent)
        .options(selectinload(ChangeEvent.verifications))
        .where(
            ChangeEvent.id == parsed_id,
            ChangeEvent.workspace_id == uuid.UUID(context.workspace_id),
        )
    )
    res = await db.execute(query)
    evt = res.scalar_one_or_none()
    if not evt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found in workspace."
        )

    # 4. Optimistic locking check
    if evt.record_version != request.expected_record_version:
        raise ConflictException(
            error_code="VERSIONCONFLICT",
            message=f"Record version mismatch for event '{event_id}'. Current version is {evt.record_version}, expected {request.expected_record_version}.",
            details={
                "current_version": evt.record_version,
                "expected_version": request.expected_record_version,
            },
        )

    # 5. Apply update atomically: mutate event, add Verification, add AuditLog
    evt_any: Any = evt
    old_status = str(evt_any.status)
    new_version = int(evt_any.record_version) + 1

    evt_any.status = request.status
    evt_any.record_version = new_version
    evt_any.updated_at = datetime.now(timezone.utc)

    # Verification row
    verification = Verification(
        id=uuid.uuid4(),
        event_id=evt.id,
        actor_id=context.principal.user_id,
        from_status=old_status,
        to_status=request.status,
        notes=request.notes.strip() if request.notes else None,
        decision=request.status,
        record_version=new_version,
        created_at=datetime.now(timezone.utc),
    )
    db.add(verification)

    # AuditLog row
    audit_log = AuditLog(
        id=uuid.uuid4(),
        workspace_id=uuid.UUID(context.workspace_id),
        actor_id=context.principal.user_id,
        action="event.verification.updated",
        target_type="ChangeEvent",
        target_id=str(evt.id),
        payload={
            "from_status": old_status,
            "to_status": request.status,
            "record_version": new_version,
            "notes": request.notes.strip() if request.notes else None,
        },
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit_log)

    await db.commit()
    db.expire_all()

    # Re-fetch event with verifications for clean response
    return await get_event(event_id=event_id, context=context, db=db)
