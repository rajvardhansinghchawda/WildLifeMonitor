import base64
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import ConflictException, NotFoundException
from app.core.security import ReadScope, WorkspaceContext, get_read_scope, require_role
from app.db.session import get_db
from app.models.analysis import Analysis, AnalysisLayer
from app.models.area import ProtectedArea
from app.models.artifact import Artifact
from app.models.event import ChangeEvent
from app.models.workspace import RoleEnum
from app.schemas.analysis import (
    AnalysisCreateRequest,
    AnalysisCreateResponse,
    AnalysisStatusResponse,
    ResultManifestResponse,
)
from app.schemas.portal import AnalysisListItem, AnalysisListResponse
from app.services import portal_queries as pq
from app.services.analysis_service import AnalysisService
from app.services.artifact_service import ArtifactService

router = APIRouter(prefix="/analyses", tags=["Analyses"])
analysis_service = AnalysisService()
artifact_service = ArtifactService()

ATTRIBUTIONS: Dict[str, str] = {
    "vegetation": (
        "Contains modified Copernicus Sentinel data (Sentinel-2 L2A), "
        "processed with Google Earth Engine."
    ),
    "water": (
        "Dynamic World: produced for the Dynamic World Project by Google in partnership with "
        "National Geographic Society and WRI (CC BY 4.0). Contains modified Copernicus Sentinel data."
    ),
    "builtup": (
        "Dynamic World: produced for the Dynamic World Project by Google in partnership with "
        "National Geographic Society and WRI (CC BY 4.0). Contains modified Copernicus Sentinel data."
    ),
    "forestalerts": "Global Forest Watch, CC BY 4.0",
}
CONTEXT_ATTRIBUTION = "© OpenStreetMap contributors (ODbL)"


def encode_cursor(priority_score: Optional[float], event_id: str) -> str:
    payload = json.dumps({"s": priority_score, "id": event_id})
    return base64.urlsafe_b64encode(payload.encode("utf-8")).decode("utf-8")


def decode_cursor(cursor: str) -> Tuple[Optional[float], uuid.UUID]:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode("utf-8")).decode("utf-8")
        data = json.loads(raw)
        score = data.get("s")
        if score is not None:
            score = float(score)
        event_id = uuid.UUID(data["id"])
        return score, event_id
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid pagination cursor format.",
        )


def _parse_uuid(value: str, what: str = "analysis") -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Invalid {what} identifier."
        )


async def _visible_workspace(
    db: AsyncSession, scope: ReadScope, analysis_id: uuid.UUID
) -> uuid.UUID:
    """Workspace owning the analysis, if it is readable by the caller (own or curated public)."""
    ws = (
        await db.execute(
            select(Analysis.workspace_id).where(
                Analysis.id == analysis_id, Analysis.workspace_id.in_(scope.workspace_ids)
            )
        )
    ).scalar_one_or_none()
    if ws is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found in workspace."
        )
    return ws


@router.post("", response_model=AnalysisCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_analysis(
    request: AnalysisCreateRequest,
    response: Response,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    context: WorkspaceContext = Depends(require_role(RoleEnum.ANALYST)),
    db: AsyncSession = Depends(get_db),
):
    """Submit an analysis job per spec.md.

    Provide either a GeoJSON `aoi` or an `area_id` from the protected-area catalog (in which
    case that area's analysis AOI is used).
    """
    area_id: Optional[uuid.UUID] = None
    if request.area_id is not None:
        area = await db.get(ProtectedArea, request.area_id)
        if area is None:
            raise NotFoundException(error_code="AREANOTFOUND", message="Protected area not found.")
        area_id = area.id  # type: ignore[assignment]
        if request.aoi is None:
            request.aoi = pq.area_aoi_geojson(area)

    create_response, warnings = await analysis_service.submit_analysis(
        session=db,
        workspace_id=uuid.UUID(context.workspace_id),
        user_id=context.principal.user_id,
        request=request,
        idempotency_key=idempotency_key,
        area_id=area_id,
    )
    await db.commit()

    location_url = f"{settings.API_PREFIX}/analyses/{create_response.analysis_id}"
    response.headers["Location"] = location_url
    return create_response


@router.get("", response_model=AnalysisListResponse)
async def list_analyses(
    area_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    mine_only: bool = Query(False, description="Exclude curated (public) analyses"),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Analysis history: the caller's own analyses plus curated real analyses."""
    workspace_ids = [scope.own_workspace_id] if mine_only else scope.workspace_ids
    conditions: List[Any] = [Analysis.workspace_id.in_(workspace_ids)]
    if area_id:
        conditions.append(Analysis.area_id == area_id)
    if status_filter:
        conditions.append(Analysis.status == status_filter)

    total = (await db.execute(select(func.count(Analysis.id)).where(*conditions))).scalar_one()
    analyses = (
        (
            await db.execute(
                select(Analysis)
                .options(selectinload(Analysis.layers))
                .where(*conditions)
                .order_by(Analysis.created_at.desc(), Analysis.id.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )
    counts = await pq.event_counts(db, [a.id for a in analyses])
    names = {
        row[0]: row[1]
        for row in (await db.execute(select(ProtectedArea.id, ProtectedArea.name))).all()
    }
    curated = await pq.public_workspace_ids(db)
    items = [
        AnalysisListItem(
            analysis_id=str(a.id),
            status=str(a.status),
            stage=a.stage,  # type: ignore[arg-type]
            area_id=str(a.area_id) if a.area_id else None,
            area_name=names.get(a.area_id) if a.area_id else None,
            layers=[
                {"layer_id": str(lyr.id), "type": lyr.layer_type, "status": lyr.status}
                for lyr in a.layers
            ],
            baseline={"start": str(a.baseline_start), "end": str(a.baseline_end)},
            comparison={"start": str(a.comparison_start), "end": str(a.comparison_end)},
            event_count=counts.get(a.id, 0),  # type: ignore[arg-type]
            created_at=a.created_at.isoformat(),
            updated_at=a.updated_at.isoformat(),
            is_curated_demo=a.workspace_id in curated,
        )
        for a in analyses
    ]
    return AnalysisListResponse(items=items, total=int(total), limit=limit, offset=offset)


@router.get("/{analysis_id}", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    analysis_id: str,
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve live DB-authoritative status of an analysis, enforcing workspace isolation."""
    parsed_id = _parse_uuid(analysis_id)
    ws_id = await _visible_workspace(db, scope, parsed_id)
    return await analysis_service.get_analysis_status(
        session=db, analysis_id=parsed_id, workspace_id=ws_id
    )


@router.post("/{analysis_id}/cancel", status_code=status.HTTP_202_ACCEPTED)
async def cancel_analysis(
    analysis_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.ANALYST)),
    db: AsyncSession = Depends(get_db),
):
    """Request cooperative cancellation for an active analysis."""
    parsed_id = _parse_uuid(analysis_id)
    await analysis_service.cancel_analysis(
        session=db,
        analysis_id=parsed_id,
        workspace_id=uuid.UUID(context.workspace_id),
    )
    await db.commit()
    return {"message": "Cancellation successfully requested for analysis."}


@router.get("/{analysis_id}/results", response_model=ResultManifestResponse)
async def get_analysis_results(
    analysis_id: str,
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve result manifest per spec.md required fields (real provenance + attribution)."""
    parsed_id = _parse_uuid(analysis_id)
    ws_id = await _visible_workspace(db, scope, parsed_id)
    analysis = (
        await db.execute(
            select(Analysis)
            .options(
                selectinload(Analysis.layers),
                selectinload(Analysis.artifacts),
                selectinload(Analysis.events),
            )
            .where(Analysis.id == parsed_id, Analysis.workspace_id == ws_id)
        )
    ).scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")

    if analysis.status not in {"succeeded", "partial", "failed"}:
        raise ConflictException(
            error_code="ANALYSISNOTREADY",
            message=f"Analysis '{analysis_id}' is not ready yet (current status: '{analysis.status}').",
            details={"status": str(analysis.status)},
        )

    layers_data: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []
    sources: List[str] = []
    effective_observations: Dict[str, Any] = {}
    attribution: Dict[str, str] = {}
    for layer in analysis.layers:
        layer_type = str(layer.layer_type)
        layer_artifacts = []
        for art in analysis.artifacts:
            if art.layer_id != layer.id:
                continue
            meta = art.artifact_metadata if isinstance(art.artifact_metadata, dict) else {}
            layer_artifacts.append(
                {
                    "id": str(art.id),
                    "artifact_type": art.artifact_type,
                    "role": meta.get("role"),
                    "media_type": art.media_type,
                    "storage_uri": art.storage_uri,
                    "checksum": art.checksum,
                    "bounds": meta.get("bounds"),
                    "legend": meta.get("legend"),
                }
            )
        provenance: Dict[str, Any] = dict(layer.provenance or {})  # type: ignore[arg-type]
        if provenance.get("dataset"):
            sources.append(str(provenance["dataset"]))
        if provenance.get("scenes"):
            effective_observations[layer_type] = provenance["scenes"]
        for message in layer.warnings or []:  # type: ignore[union-attr]
            warnings.append({"layer": layer_type, "message": message})
        text = ATTRIBUTIONS.get(layer_type)
        if text:
            if provenance.get("synthetic"):
                text += " (synthetic fixture — not real observations)"
            attribution[layer_type] = text
        layers_data.append(
            {
                "layer_id": str(layer.id),
                "type": layer.layer_type,
                "status": layer.status,
                "quality_label": layer.quality_label,
                "metrics": layer.metrics or {},
                "method_version": layer.method_version,
                "error_code": layer.error_code,
                "error_details": layer.error_details,
                "artifacts": layer_artifacts,
            }
        )
    if any(e.nearest_known_road_distance_m is not None for e in analysis.events):
        attribution["context"] = CONTEXT_ATTRIBUTION

    curated = await pq.public_workspace_ids(db)
    provenance_out = {
        "sources": sorted(set(sources)),
        "method_versions": {lyr.layer_type: lyr.method_version for lyr in analysis.layers},
        "effective_observations": effective_observations,
        "attribution": attribution,
        "is_curated_demo": analysis.workspace_id in curated,
        "processed_at": analysis.updated_at.isoformat() if analysis.updated_at else None,
    }

    return ResultManifestResponse(
        analysis_id=str(analysis.id),
        status=str(analysis.status),
        configuration_id=str(analysis.configuration_id),
        input_snapshot={
            "aoi": analysis.aoi_snapshot,
            "area_id": str(analysis.area_id) if analysis.area_id else None,
            "baseline": {"start": str(analysis.baseline_start), "end": str(analysis.baseline_end)},
            "comparison": {
                "start": str(analysis.comparison_start),
                "end": str(analysis.comparison_end),
            },
            "layers": analysis.requested_layers,
        },
        layers=layers_data,
        provenance=provenance_out,
        warnings=warnings,
        attribution=attribution,
        event_count=len(analysis.events),
        events_url=f"{settings.API_PREFIX}/analyses/{analysis.id}/events",
    )


def _event_feature(
    evt: ChangeEvent,
    analysis: Analysis,
    scope: ReadScope,
    area_name: Optional[str],
    curated: List[uuid.UUID],
    provenance: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    hs = pq.build_hotspot(
        evt,
        analysis,
        area_name,
        curated,
        read_only=analysis.workspace_id != scope.own_workspace_id,
        include_geometry=False,
    )
    evt_any: Any = evt
    props: Dict[str, Any] = {
        "analysis_id": str(evt_any.analysis_id),
        "change_type": evt_any.change_type,
        "change_label": hs.change_label,
        "layer_type": hs.layer_type,
        "affected_area_ha": evt_any.affected_area_ha,
        "mean_ndvi_change": evt_any.mean_ndvi_change,
        "valid_pixel_fraction": evt_any.valid_pixel_fraction,
        "quality_label": evt_any.quality_label,
        "source_confidence": evt_any.source_confidence,
        "priority_score": evt_any.priority_score,
        "priority_method_version": evt_any.priority_method_version,
        "priority_components": hs.priority_components,
        "severity": hs.severity,
        "sensor": hs.sensor,
        "baseline_value": hs.baseline_value,
        "comparison_value": hs.comparison_value,
        "value_name": hs.value_name,
        "nearest_known_road_distance_m": evt_any.nearest_known_road_distance_m,
        "nearest_known_settlement_distance_m": evt_any.nearest_known_settlement_distance_m,
        "context_source": evt_any.context_source,
        "status": evt_any.status,
        "method_version": evt_any.method_version,
        "record_version": evt_any.record_version,
        "read_only": hs.read_only,
    }
    if provenance is not None:
        props["provenance"] = provenance
    return {
        "type": "Feature",
        "id": str(evt_any.id),
        "geometry": dict(mapping(to_shape(evt_any.geom))),
        "properties": props,
    }


@router.get("/{analysis_id}/events")
async def get_analysis_events(
    analysis_id: str,
    limit: int = Query(50, ge=1, le=100),
    cursor: Optional[str] = Query(None),
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve keyset (cursor-based) paginated change events for an analysis as GeoJSON.

    Uses events_priority_idx: (workspace_id, analysis_id, priority_score DESC NULLS LAST, id DESC).
    """
    parsed_id = _parse_uuid(analysis_id)
    ws_id = await _visible_workspace(db, scope, parsed_id)
    analysis = (
        await db.execute(select(Analysis).where(Analysis.id == parsed_id))
    ).scalar_one()
    area_name = None
    if analysis.area_id:
        area_name = (
            await db.execute(select(ProtectedArea.name).where(ProtectedArea.id == analysis.area_id))
        ).scalar_one_or_none()
    curated = await pq.public_workspace_ids(db)

    conditions: List[Any] = [ChangeEvent.analysis_id == parsed_id, ChangeEvent.workspace_id == ws_id]
    if cursor is not None:
        cur_score, cur_id = decode_cursor(cursor)
        if cur_score is not None:
            conditions.append(
                or_(
                    and_(
                        ChangeEvent.priority_score.is_not(None),
                        ChangeEvent.priority_score < cur_score,
                    ),
                    and_(ChangeEvent.priority_score == cur_score, ChangeEvent.id < cur_id),
                    ChangeEvent.priority_score.is_(None),
                )
            )
        else:
            conditions.append(and_(ChangeEvent.priority_score.is_(None), ChangeEvent.id < cur_id))

    rows = list(
        (
            await db.execute(
                select(ChangeEvent)
                .where(and_(*conditions))
                .order_by(ChangeEvent.priority_score.desc().nulls_last(), ChangeEvent.id.desc())
                .limit(limit + 1)
            )
        )
        .scalars()
        .all()
    )
    has_more = len(rows) > limit
    page_events = rows[:limit]
    next_cursor = None
    if has_more and page_events:
        last: Any = page_events[-1]
        next_cursor = encode_cursor(last.priority_score, str(last.id))

    features = [_event_feature(e, analysis, scope, area_name, curated) for e in page_events]
    return {
        "type": "FeatureCollection",
        "features": features,
        "pagination": {"limit": limit, "has_more": has_more, "next_cursor": next_cursor},
    }


@router.get("/{analysis_id}/events/export")
async def export_analysis_events(
    analysis_id: str,
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Authorized GeoJSON export carrying complete scientific provenance and attribution."""
    parsed_id = _parse_uuid(analysis_id)
    ws_id = await _visible_workspace(db, scope, parsed_id)
    analysis = (
        await db.execute(
            select(Analysis).options(selectinload(Analysis.layers)).where(Analysis.id == parsed_id)
        )
    ).scalar_one()
    area_name = None
    if analysis.area_id:
        area_name = (
            await db.execute(select(ProtectedArea.name).where(ProtectedArea.id == analysis.area_id))
        ).scalar_one_or_none()
    curated = await pq.public_workspace_ids(db)

    events = (
        (
            await db.execute(
                select(ChangeEvent)
                .where(ChangeEvent.analysis_id == parsed_id, ChangeEvent.workspace_id == ws_id)
                .order_by(ChangeEvent.priority_score.desc().nulls_last(), ChangeEvent.id.desc())
            )
        )
        .scalars()
        .all()
    )
    now_iso = datetime.now(timezone.utc).isoformat()
    layer_by_id = {lyr.id: lyr for lyr in analysis.layers}
    attribution_text = " ".join(
        sorted({ATTRIBUTIONS.get(str(lyr.layer_type), "") for lyr in analysis.layers} - {""})
    )
    features = []
    for evt in events:
        layer = layer_by_id.get(evt.layer_id)  # type: ignore[arg-type]
        feature = _event_feature(
            evt,
            analysis,
            scope,
            area_name,
            curated,
            provenance={
                "method_version": evt.method_version,
                "baseline_period": {
                    "start": str(analysis.baseline_start),
                    "end": str(analysis.baseline_end),
                },
                "comparison_period": {
                    "start": str(analysis.comparison_start),
                    "end": str(analysis.comparison_end),
                },
                "dataset": (layer.provenance or {}).get("dataset") if layer else None,  # type: ignore[union-attr]
                "attribution": attribution_text,
                "exported_at": now_iso,
            },
        )
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "analysis_id": str(analysis.id),
        "total_features": len(features),
        "exported_at": now_iso,
        "features": features,
    }


@router.get("/{analysis_id}/layers/{layer_id}/access")
async def get_layer_access(
    analysis_id: str,
    layer_id: str,
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Authorized, expiry-aware access descriptors (signed URLs) for a ready layer.

    Returns the primary descriptor (`access_descriptor`, backward compatible) plus `assets`:
    every overlay/raster with its map bounds and legend, so the frontend can render
    baseline / comparison / change imagery without any provider credentials.
    """
    parsed_an_id = _parse_uuid(analysis_id, "identifier")
    parsed_ly_id = _parse_uuid(layer_id, "identifier")
    ws_id = await _visible_workspace(db, scope, parsed_an_id)
    analysis = (
        await db.execute(select(Analysis).where(Analysis.id == parsed_an_id))
    ).scalar_one()

    layer = (
        await db.execute(
            select(AnalysisLayer).where(
                AnalysisLayer.id == parsed_ly_id, AnalysisLayer.analysis_id == parsed_an_id
            )
        )
    ).scalar_one_or_none()
    if not layer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Layer not found for analysis."
        )
    if layer.status != "ready":
        raise ConflictException(
            error_code="LAYERNOTREADY",
            message=f"Layer '{layer_id}' is not in 'ready' status (current status: '{layer.status}').",
            details={"status": layer.status, "layer_id": str(layer.id)},
        )

    artifacts = list(
        (
            await db.execute(
                select(Artifact)
                .where(Artifact.analysis_id == parsed_an_id, Artifact.layer_id == parsed_ly_id)
                .order_by(Artifact.created_at.desc())
            )
        )
        .scalars()
        .all()
    )

    expires_in = 900
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    assets: List[Dict[str, Any]] = []
    for art in artifacts:
        meta = art.artifact_metadata if isinstance(art.artifact_metadata, dict) else {}
        role = meta.get("role")
        if not role:
            continue
        assets.append(
            {
                "role": role,
                "url": artifact_service.generate_presigned_url(str(art.object_key), expires_in),
                "media_type": str(art.media_type),
                "byte_size": int(art.byte_size),  # type: ignore[arg-type]
                "bounds": meta.get("bounds"),
                "legend": meta.get("legend"),
                "filename": meta.get("filename"),
            }
        )

    chosen = next(
        (a for a in artifacts if "image/" in a.media_type or "cog" in a.artifact_type), None
    )
    if not chosen and artifacts:
        chosen = artifacts[0]
    if chosen is not None:
        chosen_any: Any = chosen
        presigned_url = artifact_service.generate_presigned_url(
            str(chosen_any.object_key), expires_in_seconds=expires_in
        )
        media_type = str(chosen_any.media_type)
        byte_size = int(chosen_any.byte_size)
    else:
        presigned_url = (
            f"{settings.OBJECT_STORAGE_ENDPOINT}/{settings.OBJECT_STORAGE_BUCKET}"
            f"/{analysis_id}/{layer_id}/display.tif"
        )
        media_type = "image/tiff"
        byte_size = 0

    return {
        "analysis_id": str(analysis.id),
        "layer_id": str(layer.id),
        "layer_type": layer.layer_type,
        "read_only": ws_id != scope.own_workspace_id,
        "access_descriptor": {
            "url": presigned_url,
            "expires_at": expires_at.isoformat(),
            "expires_in_seconds": expires_in,
            "media_type": media_type,
            "byte_size": byte_size,
        },
        "assets": assets,
        "metrics": layer.metrics or {},
    }
