import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException
from app.core.security import ReadScope, get_read_scope
from app.db.session import get_db
from app.models.analysis import Analysis
from app.models.area import ProtectedArea
from app.models.event import ChangeEvent
from app.schemas.portal import HotspotItem, HotspotListResponse
from app.services import portal_queries as pq
from app.services.hotspot_summarizer import HotspotSummarizerService

router = APIRouter(prefix="/hotspots", tags=["Hotspots"])

SORTS = {"area", "priority", "date"}


async def _resolve_area_id(db: AsyncSession, ref: str) -> Optional[uuid.UUID]:
    try:
        return uuid.UUID(ref)
    except ValueError:
        area = (
            await db.execute(select(ProtectedArea.id).where(ProtectedArea.slug == ref))
        ).scalar_one_or_none()
        return area


@router.get("", response_model=HotspotListResponse)
async def list_hotspots(
    area_id: Optional[str] = Query(None, description="Protected-area id or slug"),
    analysis_id: Optional[str] = Query(None),
    change_type: Optional[str] = Query(None),
    layer_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="Verification status"),
    severity: Optional[str] = Query(None, description="low | medium | high | critical"),
    min_area_ha: Optional[float] = Query(None, ge=0),
    sort: str = Query("area", description="area | priority | date"),
    include_geometry: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Change events (hotspots) across the caller's analyses and curated real analyses.

    Only the newest completed analysis per area is included, so re-running an area never
    duplicates events. Pass `analysis_id` to inspect one specific run.
    """
    sort = sort if sort in SORTS else "area"
    analyses: Dict[uuid.UUID, Analysis] = {}

    if analysis_id:
        try:
            aid = uuid.UUID(analysis_id)
        except ValueError:
            raise NotFoundException(message="Invalid analysis identifier.")
        found = (
            await db.execute(
                select(Analysis).where(
                    Analysis.id == aid, Analysis.workspace_id.in_(scope.workspace_ids)
                )
            )
        ).scalar_one_or_none()
        if found is None:
            raise NotFoundException(message="Analysis not found.")
        analyses[found.id] = found  # type: ignore[index]
    else:
        area_uuid = await _resolve_area_id(db, area_id) if area_id else None
        if area_id and area_uuid is None:
            return HotspotListResponse(items=[], total=0, limit=limit, offset=offset)
        latest = await pq.latest_analyses_by_area(
            db, scope.workspace_ids, [area_uuid] if area_uuid else None
        )
        for analysis in latest.values():
            analyses[analysis.id] = analysis  # type: ignore[index]
        if not area_id:
            custom = (
                (
                    await db.execute(
                        select(Analysis).where(
                            Analysis.area_id.is_(None),
                            Analysis.workspace_id.in_(scope.workspace_ids),
                            Analysis.status.in_(pq.TERMINAL_OK),
                        )
                    )
                )
                .scalars()
                .all()
            )
            for analysis in custom:
                analyses[analysis.id] = analysis  # type: ignore[index]

    if not analyses:
        return HotspotListResponse(items=[], total=0, limit=limit, offset=offset)

    conditions: List[Any] = [ChangeEvent.analysis_id.in_(list(analyses.keys()))]
    if change_type:
        conditions.append(ChangeEvent.change_type == change_type)
    if status:
        conditions.append(ChangeEvent.status == status)
    if min_area_ha is not None:
        conditions.append(ChangeEvent.affected_area_ha >= min_area_ha)
    events = (await db.execute(select(ChangeEvent).where(*conditions))).scalars().all()

    area_names = {
        row[0]: row[1] for row in (await db.execute(select(ProtectedArea.id, ProtectedArea.name))).all()
    }
    curated = await pq.public_workspace_ids(db)

    items: List[HotspotItem] = []
    for event in events:
        analysis = analyses[event.analysis_id]  # type: ignore[index]
        item = pq.build_hotspot(
            event,
            analysis,
            area_names.get(analysis.area_id) if analysis.area_id else None,
            curated,
            read_only=analysis.workspace_id != scope.own_workspace_id,
            include_geometry=include_geometry,
        )
        if layer_type and item.layer_type != layer_type:
            continue
        if severity and item.severity != severity.lower():
            continue
        items.append(item)

    if sort == "priority":
        items.sort(key=lambda i: (i.priority_score is None, -(i.priority_score or 0.0)))
    elif sort == "date":
        items.sort(key=lambda i: i.detected_at, reverse=True)
    else:
        items.sort(key=lambda i: -i.affected_area_ha)

    total = len(items)
    return HotspotListResponse(
        items=items[offset : offset + limit], total=total, limit=limit, offset=offset
    )


@router.get("/{hotspot_id}")
async def get_hotspot(
    hotspot_id: str,
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """One hotspot with geometry, verification history and layer provenance."""
    try:
        eid = uuid.UUID(hotspot_id)
    except ValueError:
        raise NotFoundException(message="Invalid hotspot identifier.")
    event = (
        await db.execute(
            select(ChangeEvent)
            .options(selectinload(ChangeEvent.verifications))
            .where(ChangeEvent.id == eid, ChangeEvent.workspace_id.in_(scope.workspace_ids))
        )
    ).scalar_one_or_none()
    if event is None:
        raise NotFoundException(message="Hotspot not found.")
    analysis = (
        await db.execute(
            select(Analysis).options(selectinload(Analysis.layers)).where(Analysis.id == event.analysis_id)
        )
    ).scalar_one()
    area_name = None
    if analysis.area_id:
        area_name = (
            await db.execute(select(ProtectedArea.name).where(ProtectedArea.id == analysis.area_id))
        ).scalar_one_or_none()
    curated = await pq.public_workspace_ids(db)
    item = pq.build_hotspot(
        event,
        analysis,
        area_name,
        curated,
        read_only=analysis.workspace_id != scope.own_workspace_id,
        include_geometry=True,
    )
    layer = next((lyr for lyr in analysis.layers if lyr.id == event.layer_id), None)
    verifications = [
        {
            "id": str(v.id),
            "actor_id": str(v.actor_id),
            "from_status": v.from_status,
            "to_status": v.to_status,
            "notes": v.notes,
            "record_version": v.record_version,
            "created_at": v.created_at.isoformat(),
        }
        for v in sorted(event.verifications, key=lambda x: x.created_at, reverse=True)
    ]
    return {
        **item.model_dump(),
        "verifications": verifications,
        "layer_provenance": dict(layer.provenance or {}) if layer else {},  # type: ignore[arg-type]
        "layer_warnings": list(layer.warnings or []) if layer else [],  # type: ignore[arg-type]
    }


@router.get("/{hotspot_id}/summary")
async def get_hotspot_summary(
    hotspot_id: str,
    lang: str = Query("en", description="en | hinglish | hi"),
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Natural language field intelligence summary for a hotspot, synthesized via LLM or deterministic engine."""
    try:
        eid = uuid.UUID(hotspot_id)
    except ValueError:
        raise NotFoundException(message="Invalid hotspot identifier.")
    event = (
        await db.execute(
            select(ChangeEvent).where(
                ChangeEvent.id == eid, ChangeEvent.workspace_id.in_(scope.workspace_ids)
            )
        )
    ).scalar_one_or_none()
    if event is None:
        raise NotFoundException(message="Hotspot not found.")
    analysis = (
        await db.execute(select(Analysis).where(Analysis.id == event.analysis_id))
    ).scalar_one()
    area_name = None
    if analysis.area_id:
        area_name = (
            await db.execute(select(ProtectedArea.name).where(ProtectedArea.id == analysis.area_id))
        ).scalar_one_or_none()
    curated = await pq.public_workspace_ids(db)
    item = pq.build_hotspot(
        event,
        analysis,
        area_name,
        curated,
        read_only=analysis.workspace_id != scope.own_workspace_id,
        include_geometry=False,
    )
    telemetry = item.model_dump()
    return await HotspotSummarizerService.generate_summary(telemetry, lang=lang)
