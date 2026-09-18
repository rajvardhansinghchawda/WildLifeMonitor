import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import ConflictException
from app.core.security import WorkspaceContext, require_role
from app.db.session import get_db
from app.models.analysis import Analysis
from app.models.event import ChangeEvent
from app.models.workspace import RoleEnum
from app.schemas.analysis import (
    AnalysisCreateRequest,
    AnalysisCreateResponse,
    AnalysisStatusResponse,
    ResultManifestResponse,
)
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/analyses", tags=["Analyses"])
analysis_service = AnalysisService()


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
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve paginated change events for an analysis as a GeoJSON FeatureCollection."""
    try:
        parsed_id = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid analysis identifier."
        )

    offset = (page - 1) * page_size

    # Verify analysis belongs to workspace
    analysis_query = select(Analysis).where(
        Analysis.id == parsed_id,
        Analysis.workspace_id == uuid.UUID(context.workspace_id),
    )
    analysis_res = await db.execute(analysis_query)
    if not analysis_res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")

    count_query = select(func.count(ChangeEvent.id)).where(
        ChangeEvent.analysis_id == parsed_id,
        ChangeEvent.workspace_id == uuid.UUID(context.workspace_id),
    )
    count_res = await db.execute(count_query)
    total_count = count_res.scalar_one() or 0

    events_query = (
        select(ChangeEvent)
        .where(
            ChangeEvent.analysis_id == parsed_id,
            ChangeEvent.workspace_id == uuid.UUID(context.workspace_id),
        )
        .order_by(ChangeEvent.created_at.asc())
        .offset(offset)
        .limit(page_size)
    )
    events_res = await db.execute(events_query)
    events = list(events_res.scalars().all())

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
                },
            }
        )

    return {
        "type": "FeatureCollection",
        "features": features,
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{analysis_id}/layers/{layer_id}/access", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def get_layer_access(
    analysis_id: str,
    layer_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
):
    """Stub for short-lived tile access descriptors (implemented in Phase 5)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Tile access implemented in Phase 5."
    )
