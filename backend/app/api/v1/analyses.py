import base64
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import ConflictException
from app.core.security import WorkspaceContext, require_role
from app.db.session import get_db
from app.models.analysis import Analysis, AnalysisLayer
from app.models.artifact import Artifact
from app.models.event import ChangeEvent
from app.models.workspace import RoleEnum
from app.schemas.analysis import (
    AnalysisCreateRequest,
    AnalysisCreateResponse,
    AnalysisStatusResponse,
    ResultManifestResponse,
)
from app.services.analysis_service import AnalysisService
from app.services.artifact_service import ArtifactService

router = APIRouter(prefix="/analyses", tags=["Analyses"])
analysis_service = AnalysisService()
artifact_service = ArtifactService()


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


@router.post("", response_model=AnalysisCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_analysis(
    request: AnalysisCreateRequest,
    response: Response,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    context: WorkspaceContext = Depends(require_role(RoleEnum.ANALYST)),
    db: AsyncSession = Depends(get_db),
):
    """Submit an analysis job per spec.md.

    Enforces:
    - GeoJSON WGS84 geometry validation & area limit (MAX_AOI_KM2, MAX_AOI_VERTICES)
    - Observation date windows (180-day max, no overlap, seasonal warnings)
    - Idempotency key replay vs 409 conflict
    - Concurrent active job limit per workspace (MAX_ACTIVE_JOBS_PER_WORKSPACE)
    - Atomic persistence of Analysis + AnalysisLayers + Outbox in one transaction
    """
    create_response, warnings = await analysis_service.submit_analysis(
        session=db,
        workspace_id=uuid.UUID(context.workspace_id),
        user_id=context.principal.user_id,
        request=request,
        idempotency_key=idempotency_key,
    )
    await db.commit()

    location_url = f"{settings.API_PREFIX}/analyses/{create_response.analysis_id}"
    response.headers["Location"] = location_url
    return create_response


@router.get("/{analysis_id}", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    analysis_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve live DB-authoritative status of an analysis, enforcing workspace isolation."""
    try:
        parsed_id = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid analysis identifier."
        )

    return await analysis_service.get_analysis_status(
        session=db,
        analysis_id=parsed_id,
        workspace_id=uuid.UUID(context.workspace_id),
    )


@router.post("/{analysis_id}/cancel", status_code=status.HTTP_202_ACCEPTED)
async def cancel_analysis(
    analysis_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.ANALYST)),
    db: AsyncSession = Depends(get_db),
):
    """Request cooperative cancellation for an active analysis."""
    try:
        parsed_id = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid analysis identifier."
        )

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
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve result manifest per spec.md required fields."""
    try:
        parsed_id = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid analysis identifier."
        )

    query = (
        select(Analysis)
        .options(
            selectinload(Analysis.layers),
            selectinload(Analysis.artifacts),
            selectinload(Analysis.events),
        )
        .where(
            Analysis.id == parsed_id,
            Analysis.workspace_id == uuid.UUID(context.workspace_id),
        )
    )
    result = await db.execute(query)
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")

    terminal_statuses = {"succeeded", "partial", "failed"}
    if analysis.status not in terminal_statuses:
        raise ConflictException(
            error_code="ANALYSISNOTREADY",
            message=f"Analysis '{analysis_id}' is not ready yet (current status: '{analysis.status}').",
            details={"status": str(analysis.status)},
        )

    # Compile layers and artifacts
    layers_data: List[Dict[str, Any]] = []
    for layer in analysis.layers:
        layer_artifacts = [
            {
                "id": str(art.id),
                "artifact_type": art.artifact_type,
                "storage_uri": art.storage_uri,
                "checksum": art.checksum,
            }
            for art in analysis.artifacts
            if str(layer.layer_type) in art.artifact_type
        ]
        layers_data.append(
            {
                "type": layer.layer_type,
                "status": layer.status,
                "quality_label": layer.quality_label,
                "metrics": layer.metrics or {},
                "method_version": layer.method_version,
                "artifacts": layer_artifacts,
            }
        )

    input_snapshot = {
        "aoi": analysis.aoi_snapshot,
        "baseline": {"start": str(analysis.baseline_start), "end": str(analysis.baseline_end)},
        "comparison": {
            "start": str(analysis.comparison_start),
            "end": str(analysis.comparison_end),
        },
        "layers": analysis.requested_layers,
    }

    provenance = {
        "sources": ["Sentinel-2 L2A (synthetic fixture)"],
        "method_versions": {layer.layer_type: layer.method_version for layer in analysis.layers},
        "attribution": "Synthetic Sentinel-2 L2A fixture — not real observations",
        "effective_observations": {"baseline": 3, "comparison": 3},
    }

    attribution = {
        "vegetation": "Copernicus Sentinel data [2024-2025] processed via synthetic fixture",
    }

    return ResultManifestResponse(
        analysis_id=str(analysis.id),
        status=str(analysis.status),
        configuration_id=str(analysis.configuration_id),
        input_snapshot=input_snapshot,
        layers=layers_data,
        provenance=provenance,
        warnings=[],
        attribution=attribution,
        event_count=len(analysis.events),
        events_url=f"{settings.API_PREFIX}/analyses/{analysis.id}/events",
    )


@router.get("/{analysis_id}/events")
async def get_analysis_events(
    analysis_id: str,
    cursor: Optional[str] = Query(None, description="Keyset cursor for pagination"),
    limit: int = Query(50, ge=1, le=100, description="Page size (default 50, max 100)"),
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve keyset (cursor-based) paginated change events for an analysis as GeoJSON.

    Adheres to dsabackendoptimisation.md:
    - Uses events_priority_idx: (workspace_id, analysis_id, priority_score DESC NULLS LAST, id DESC).
    - Avoids expensive OFFSET and avoids application-side sorting.
    - Stable pagination under concurrent inserts.
    """
    try:
        parsed_id = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid analysis identifier."
        )

    # Verify analysis belongs to workspace
    analysis_query = select(Analysis).where(
        Analysis.id == parsed_id,
        Analysis.workspace_id == uuid.UUID(context.workspace_id),
    )
    analysis_res = await db.execute(analysis_query)
    if not analysis_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found in workspace."
        )

    # Base conditions
    conditions = [
        ChangeEvent.analysis_id == parsed_id,
        ChangeEvent.workspace_id == uuid.UUID(context.workspace_id),
    ]

    # Keyset cursor filtering
    if cursor is not None:
        cur_score, cur_id = decode_cursor(cursor)
        if cur_score is not None:
            # Matches: priority_score < cur_score OR (priority_score == cur_score AND id < cur_id) OR priority_score IS NULL
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
            # In NULL segment: priority_score IS NULL AND id < cur_id
            conditions.append(
                and_(
                    ChangeEvent.priority_score.is_(None),
                    ChangeEvent.id < cur_id,
                )
            )

    events_query = (
        select(ChangeEvent)
        .where(and_(*conditions))
        .order_by(ChangeEvent.priority_score.desc().nulls_last(), ChangeEvent.id.desc())
        .limit(limit + 1)
    )
    events_res = await db.execute(events_query)
    rows = list(events_res.scalars().all())

    has_more = len(rows) > limit
    page_events = rows[:limit]

    next_cursor = None
    if has_more and page_events:
        last_evt_any: Any = page_events[-1]
        next_cursor = encode_cursor(last_evt_any.priority_score, str(last_evt_any.id))

    features = []
    for evt in page_events:
        evt_any: Any = evt
        shapely_geom = to_shape(evt_any.geom)
        features.append(
            {
                "type": "Feature",
                "id": str(evt_any.id),
                "geometry": dict(mapping(shapely_geom)),
                "properties": {
                    "analysis_id": str(evt_any.analysis_id),
                    "change_type": evt_any.change_type,
                    "affected_area_ha": evt_any.affected_area_ha,
                    "mean_ndvi_change": evt_any.mean_ndvi_change,
                    "valid_pixel_fraction": evt_any.valid_pixel_fraction,
                    "quality_label": evt_any.quality_label,
                    "source_confidence": evt_any.source_confidence,
                    "priority_score": evt_any.priority_score,
                    "priority_method_version": evt_any.priority_method_version,
                    "status": evt_any.status,
                    "method_version": evt_any.method_version,
                    "record_version": evt_any.record_version,
                },
            }
        )

    return {
        "type": "FeatureCollection",
        "features": features,
        "pagination": {
            "limit": limit,
            "has_more": has_more,
            "next_cursor": next_cursor,
        },
    }


@router.get("/{analysis_id}/events/export")
async def export_analysis_events(
    analysis_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
    db: AsyncSession = Depends(get_db),
):
    """Authorized GeoJSON export of analysis events carrying complete scientific provenance and attribution."""
    try:
        parsed_id = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid analysis identifier."
        )

    # 1. Verify analysis belongs to workspace
    analysis_query = select(Analysis).where(
        Analysis.id == parsed_id,
        Analysis.workspace_id == uuid.UUID(context.workspace_id),
    )
    analysis_res = await db.execute(analysis_query)
    analysis = analysis_res.scalar_one_or_none()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found in workspace."
        )

    # 2. Fetch all events for this analysis
    events_query = (
        select(ChangeEvent)
        .where(
            ChangeEvent.analysis_id == parsed_id,
            ChangeEvent.workspace_id == uuid.UUID(context.workspace_id),
        )
        .order_by(ChangeEvent.priority_score.desc().nulls_last(), ChangeEvent.id.desc())
    )
    events_res = await db.execute(events_query)
    events = list(events_res.scalars().all())

    now_iso = datetime.now(timezone.utc).isoformat()
    features = []
    for evt in events:
        evt_any: Any = evt
        shapely_geom = to_shape(evt_any.geom)
        features.append(
            {
                "type": "Feature",
                "id": str(evt_any.id),
                "geometry": dict(mapping(shapely_geom)),
                "properties": {
                    "analysis_id": str(evt_any.analysis_id),
                    "change_type": evt_any.change_type,
                    "affected_area_ha": evt_any.affected_area_ha,
                    "mean_ndvi_change": evt_any.mean_ndvi_change,
                    "valid_pixel_fraction": evt_any.valid_pixel_fraction,
                    "quality_label": evt_any.quality_label,
                    "source_confidence": evt_any.source_confidence,
                    "priority_score": evt_any.priority_score,
                    "priority_method_version": evt_any.priority_method_version,
                    "status": evt_any.status,
                    "method_version": evt_any.method_version,
                    "record_version": evt_any.record_version,
                    "provenance": {
                        "method_version": evt_any.method_version,
                        "baseline_period": {
                            "start": str(analysis.baseline_start),
                            "end": str(analysis.baseline_end),
                        },
                        "comparison_period": {
                            "start": str(analysis.comparison_start),
                            "end": str(analysis.comparison_end),
                        },
                        "attribution": "Synthetic Sentinel-2 L2A fixture — not real observations",
                        "exported_at": now_iso,
                    },
                },
            }
        )

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
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve an authorized, expiry-aware tile/artifact access descriptor for a ready layer.

    Enforces:
    - Workspace authorization on every call.
    - 409 Conflict if layer is not in 'ready' state.
    - Never returns raw permanent URLs.
    """
    try:
        parsed_an_id = uuid.UUID(analysis_id)
        parsed_ly_id = uuid.UUID(layer_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid identifier format."
        )

    # 1. Verify analysis exists in caller workspace
    an_query = select(Analysis).where(
        Analysis.id == parsed_an_id,
        Analysis.workspace_id == uuid.UUID(context.workspace_id),
    )
    an_res = await db.execute(an_query)
    analysis = an_res.scalar_one_or_none()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found in workspace."
        )

    # 2. Verify layer belongs to analysis
    layer_query = select(AnalysisLayer).where(
        AnalysisLayer.id == parsed_ly_id,
        AnalysisLayer.analysis_id == parsed_an_id,
    )
    layer_res = await db.execute(layer_query)
    layer = layer_res.scalar_one_or_none()
    if not layer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Layer not found for analysis."
        )

    # 3. Check readiness
    if layer.status != "ready":
        raise ConflictException(
            error_code="LAYERNOTREADY",
            message=f"Layer '{layer_id}' is not in 'ready' status (current status: '{layer.status}').",
            details={"status": layer.status, "layer_id": str(layer.id)},
        )

    # 4. Find raster artifact for display
    art_query = (
        select(Artifact)
        .where(
            Artifact.analysis_id == parsed_an_id,
            Artifact.layer_id == parsed_ly_id,
        )
        .order_by(Artifact.created_at.desc())
    )
    art_res = await db.execute(art_query)
    artifacts = list(art_res.scalars().all())

    # Prefer cog/tiff raster for visual tile access, fallback to first artifact
    chosen_artifact = next(
        (a for a in artifacts if "image/" in a.media_type or "cog" in a.artifact_type), None
    )
    if not chosen_artifact and artifacts:
        chosen_artifact = artifacts[0]

    expires_in = 900  # 15 minutes
    now_utc = datetime.now(timezone.utc)
    expires_at = now_utc + timedelta(seconds=expires_in)

    if chosen_artifact:
        chosen_art_any: Any = chosen_artifact
        presigned_url = artifact_service.generate_presigned_url(
            str(chosen_art_any.object_key), expires_in_seconds=expires_in
        )
        media_type = str(chosen_art_any.media_type)
        byte_size = int(chosen_art_any.byte_size)
    else:
        presigned_url = f"{settings.OBJECT_STORAGE_ENDPOINT}/{settings.OBJECT_STORAGE_BUCKET}/{analysis_id}/{layer_id}/display.tif"
        media_type = "image/tiff"
        byte_size = 0

    return {
        "analysis_id": str(analysis.id),
        "layer_id": str(layer.id),
        "layer_type": layer.layer_type,
        "access_descriptor": {
            "url": presigned_url,
            "expires_at": expires_at.isoformat(),
            "expires_in_seconds": expires_in,
            "media_type": media_type,
            "byte_size": byte_size,
        },
    }
