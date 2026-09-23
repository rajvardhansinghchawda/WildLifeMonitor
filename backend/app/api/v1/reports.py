import csv
import hashlib
import io
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppException, NotFoundException
from app.core.security import ReadScope, WorkspaceContext, get_read_scope, require_role
from app.db.session import get_db
from app.models.analysis import Analysis
from app.models.area import ProtectedArea
from app.models.event import ChangeEvent
from app.models.report import Report
from app.models.workspace import RoleEnum
from app.schemas.portal import (
    ReportCreateRequest,
    ReportDownloadResponse,
    ReportItem,
    ReportListResponse,
)
from app.services import portal_queries as pq
from app.services.artifact_service import ArtifactService

router = APIRouter(prefix="/reports", tags=["Reports"])
artifact_service = ArtifactService()

FORMATS = {"csv": ("text/csv", "csv"), "geojson": ("application/geo+json", "geojson")}
CSV_COLUMNS = [
    "event_id",
    "analysis_id",
    "area",
    "change_type",
    "change_label",
    "severity",
    "affected_area_ha",
    "mean_ndvi_change",
    "priority_score",
    "verification_status",
    "lat",
    "lon",
    "baseline_window",
    "comparison_window",
    "method_version",
    "sensor",
    "nearest_known_road_distance_m",
    "nearest_known_settlement_distance_m",
    "context_source",
    "quality_label",
    "valid_pixel_fraction",
]


def _item(report: Report, area_name: Optional[str]) -> ReportItem:
    return ReportItem(
        id=str(report.id),
        title=str(report.title),
        format=str(report.format),
        area_id=str(report.area_id) if report.area_id else None,
        area_name=area_name,
        analysis_id=str(report.analysis_id) if report.analysis_id else None,
        status=str(report.status),
        byte_size=int(report.byte_size),  # type: ignore[arg-type]
        event_count=int(report.event_count),  # type: ignore[arg-type]
        created_at=report.created_at.isoformat(),
        error=report.error,  # type: ignore[arg-type]
    )


@router.get("", response_model=ReportListResponse)
async def list_reports(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
    db: AsyncSession = Depends(get_db),
):
    ws = uuid.UUID(context.workspace_id)
    total = (
        await db.execute(select(func.count(Report.id)).where(Report.workspace_id == ws))
    ).scalar_one()
    reports = (
        (
            await db.execute(
                select(Report)
                .where(Report.workspace_id == ws)
                .order_by(Report.created_at.desc())
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
    return ReportListResponse(
        items=[_item(r, names.get(r.area_id) if r.area_id else None) for r in reports],
        total=int(total),
    )


@router.post("", response_model=ReportItem, status_code=status.HTTP_201_CREATED)
async def create_report(
    request: ReportCreateRequest,
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Generate a CSV / GeoJSON export of real change events for an area or one analysis."""
    fmt = request.format.lower()
    if fmt not in FORMATS:
        raise AppException(
            status_code=422,
            error_code="UNSUPPORTEDFORMAT",
            message="Supported report formats: csv, geojson.",
            details={"supported": sorted(FORMATS)},
        )
    if not request.area_id and not request.analysis_id:
        raise AppException(
            status_code=422,
            error_code="INVALIDREQUEST",
            message="Provide area_id or analysis_id.",
        )
    if scope.context.role not in (RoleEnum.ANALYST.value, RoleEnum.ADMIN.value):
        raise AppException(
            status_code=403, error_code="FORBIDDEN", message="Analyst role required."
        )

    analyses: Dict[uuid.UUID, Analysis] = {}
    area: Optional[ProtectedArea] = None
    if request.analysis_id:
        try:
            aid = uuid.UUID(request.analysis_id)
        except ValueError:
            raise NotFoundException(message="Invalid analysis identifier.")
        analysis = (
            await db.execute(
                select(Analysis).where(
                    Analysis.id == aid, Analysis.workspace_id.in_(scope.workspace_ids)
                )
            )
        ).scalar_one_or_none()
        if analysis is None:
            raise NotFoundException(message="Analysis not found.")
        analyses[analysis.id] = analysis  # type: ignore[index]
        if analysis.area_id:
            area = await db.get(ProtectedArea, analysis.area_id)
    else:
        try:
            area_uuid = uuid.UUID(str(request.area_id))
        except ValueError:
            raise NotFoundException(message="Invalid area identifier.")
        area = await db.get(ProtectedArea, area_uuid)
        if area is None:
            raise NotFoundException(message="Protected area not found.")
        analyses = await pq.latest_analyses_by_area(db, scope.workspace_ids, [area_uuid])
        analyses = {a.id: a for a in analyses.values()}  # type: ignore[misc]

    events: List[ChangeEvent] = []
    if analyses:
        events = list(
            (
                await db.execute(
                    select(ChangeEvent)
                    .where(ChangeEvent.analysis_id.in_(list(analyses.keys())))
                    .order_by(ChangeEvent.affected_area_ha.desc())
                )
            )
            .scalars()
            .all()
        )
    curated = await pq.public_workspace_ids(db)
    rows = []
    for event in events:
        analysis = analyses[event.analysis_id]  # type: ignore[index]
        rows.append(
            (
                pq.build_hotspot(
                    event,
                    analysis,
                    str(area.name) if area else None,
                    curated,
                    read_only=analysis.workspace_id != scope.own_workspace_id,
                    include_geometry=True,
                ),
                analysis,
            )
        )

    generated_at = datetime.now(timezone.utc)
    if fmt == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(CSV_COLUMNS)
        for item, _analysis in rows:
            writer.writerow(
                [
                    item.id,
                    item.analysis_id,
                    item.area_name or "",
                    item.change_type,
                    item.change_label,
                    item.severity,
                    item.affected_area_ha,
                    "" if item.mean_ndvi_change is None else item.mean_ndvi_change,
                    "" if item.priority_score is None else item.priority_score,
                    item.status,
                    round(item.coordinates.lat, 6),
                    round(item.coordinates.lon, 6),
                    item.baseline_window,
                    item.comparison_window,
                    item.method_version,
                    item.sensor or "",
                    "" if item.nearest_known_road_distance_m is None else item.nearest_known_road_distance_m,
                    ""
                    if item.nearest_known_settlement_distance_m is None
                    else item.nearest_known_settlement_distance_m,
                    item.context_source or "",
                    item.quality_label or "",
                    "" if item.valid_pixel_fraction is None else item.valid_pixel_fraction,
                ]
            )
        buffer.write(
            "\n# Satellite-derived change candidates — not proof of cause. "
            "Contains modified Copernicus Sentinel data; Dynamic World (CC-BY 4.0); "
            "© OpenStreetMap contributors (ODbL).\n"
        )
        content = buffer.getvalue().encode("utf-8")
    else:
        features: List[Dict[str, Any]] = []
        for item, _analysis in rows:
            props = item.model_dump(exclude={"geometry"})
            features.append({"type": "Feature", "id": item.id, "geometry": item.geometry, "properties": props})
        content = json.dumps(
            {
                "type": "FeatureCollection",
                "generated_at": generated_at.isoformat(),
                "attribution": (
                    "Contains modified Copernicus Sentinel data; Dynamic World (CC-BY 4.0); "
                    "© OpenStreetMap contributors (ODbL)."
                ),
                "disclaimer": "Satellite-derived change candidates — not proof of cause.",
                "features": features,
            }
        ).encode("utf-8")

    report_id = uuid.uuid4()
    media_type, ext = FORMATS[fmt]
    key = f"reports/{scope.own_workspace_id}/{report_id}.{ext}"
    client = artifact_service._get_s3_client()
    artifact_service._ensure_bucket_exists(client, settings.OBJECT_STORAGE_BUCKET)
    client.put_object(
        Bucket=settings.OBJECT_STORAGE_BUCKET,
        Key=key,
        Body=content,
        ContentType=media_type,
        Metadata={"sha256": hashlib.sha256(content).hexdigest()},
    )
    title = request.title or (
        f"{area.name if area else 'Analysis'} change events ({generated_at:%Y-%m-%d})"
    )
    report = Report(
        id=report_id,
        workspace_id=scope.own_workspace_id,
        title=title,
        format=fmt,
        area_id=area.id if area else None,
        analysis_id=uuid.UUID(request.analysis_id) if request.analysis_id else None,
        status="ready",
        object_key=key,
        byte_size=len(content),
        event_count=len(rows),
        created_by=scope.context.principal.user_id,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return _item(report, str(area.name) if area else None)


@router.get("/{report_id}/download", response_model=ReportDownloadResponse)
async def download_report(
    report_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
    db: AsyncSession = Depends(get_db),
):
    try:
        rid = uuid.UUID(report_id)
    except ValueError:
        raise NotFoundException(message="Invalid report identifier.")
    report = (
        await db.execute(
            select(Report).where(
                Report.id == rid, Report.workspace_id == uuid.UUID(context.workspace_id)
            )
        )
    ).scalar_one_or_none()
    if report is None or not report.object_key:
        raise NotFoundException(message="Report not found.")
    expires_in = 900
    media_type, ext = FORMATS.get(str(report.format), ("application/octet-stream", "bin"))
    return ReportDownloadResponse(
        url=artifact_service.generate_presigned_url(str(report.object_key), expires_in),
        expires_at=(datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat(),
        expires_in_seconds=expires_in,
        filename=f"{str(report.title)[:80].replace('/', '-')}.{ext}",
        media_type=media_type,
    )
