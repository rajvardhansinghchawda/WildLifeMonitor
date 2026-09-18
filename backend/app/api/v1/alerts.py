import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException, NotFoundException
from app.core.security import ReadScope, WorkspaceContext, get_read_scope, require_role
from app.db.session import get_db
from app.models.alert import Alert, AlertStatusEnum
from app.models.area import ProtectedArea
from app.models.workspace import RoleEnum
from app.schemas.portal import AlertItem, AlertListResponse, AlertUpdateRequest

router = APIRouter(prefix="/alerts", tags=["Alerts"])

VALID_STATUSES = {s.value for s in AlertStatusEnum}


def _to_item(alert: Alert, area_name: Optional[str], own_ws: uuid.UUID) -> AlertItem:
    return AlertItem(
        id=str(alert.id),
        event_id=str(alert.event_id),
        analysis_id=str(alert.analysis_id),
        area_id=str(alert.area_id) if alert.area_id else None,
        area_name=area_name,
        title=str(alert.title),
        message=str(alert.message),
        severity=str(alert.severity),
        status=str(alert.status),
        triggered_at=alert.triggered_at.isoformat(),
        read_only=alert.workspace_id != own_ws,
    )


@router.get("", response_model=AlertListResponse)
async def list_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    area_id: Optional[uuid.UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Alerts derived from real change events (own workspace + curated read-only alerts)."""
    conditions: List = [Alert.workspace_id.in_(scope.workspace_ids)]
    if status:
        conditions.append(Alert.status == status)
    if severity:
        conditions.append(Alert.severity == severity)
    if area_id:
        conditions.append(Alert.area_id == area_id)

    total = (await db.execute(select(func.count(Alert.id)).where(*conditions))).scalar_one()
    unread = (
        await db.execute(
            select(func.count(Alert.id)).where(
                Alert.workspace_id == scope.own_workspace_id,
                Alert.status == AlertStatusEnum.UNREAD.value,
            )
        )
    ).scalar_one()
    alerts = (
        (
            await db.execute(
                select(Alert)
                .where(*conditions)
                .order_by(Alert.triggered_at.desc(), Alert.id)
                .limit(limit)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )
    names = {
        row[0]: row[1]
        for row in (await db.execute(select(ProtectedArea.id, ProtectedArea.name))).all()
    }
    return AlertListResponse(
        items=[_to_item(a, names.get(a.area_id) if a.area_id else None, scope.own_workspace_id) for a in alerts],
        total=int(total),
        unread_count=int(unread),
    )


@router.patch("/{alert_id}", response_model=AlertItem)
async def update_alert(
    alert_id: str,
    request: AlertUpdateRequest,
    context: WorkspaceContext = Depends(require_role(RoleEnum.ANALYST)),
    db: AsyncSession = Depends(get_db),
):
    """Acknowledge or dismiss an alert in the caller's own workspace."""
    if request.status not in VALID_STATUSES:
        raise AppException(
            status_code=422,
            error_code="INVALIDSTATUS",
            message=f"Status must be one of {sorted(VALID_STATUSES)}.",
        )
    try:
        aid = uuid.UUID(alert_id)
    except ValueError:
        raise NotFoundException(message="Invalid alert identifier.")
    own_ws = uuid.UUID(context.workspace_id)
    alert = (
        await db.execute(select(Alert).where(Alert.id == aid, Alert.workspace_id == own_ws))
    ).scalar_one_or_none()
    if alert is None:
        raise NotFoundException(message="Alert not found in your workspace.")
    alert.status = request.status
    await db.commit()
    await db.refresh(alert)
    area_name = None
    if alert.area_id:
        area_name = (
            await db.execute(select(ProtectedArea.name).where(ProtectedArea.id == alert.area_id))
        ).scalar_one_or_none()
    return _to_item(alert, area_name, own_ws)
