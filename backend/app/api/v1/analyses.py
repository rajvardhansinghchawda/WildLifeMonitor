import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import WorkspaceContext, require_role
from app.db.session import get_db
from app.models.analysis import Analysis, JobStatusEnum
from app.models.workspace import RoleEnum
from app.schemas.analysis import (
    AnalysisCreateRequest,
    AnalysisCreateResponse,
    AnalysisStatusResponse,
    ResultManifestResponse,
)

router = APIRouter(prefix="/analyses", tags=["Analyses"])


@router.post("", response_model=AnalysisCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_analysis(
    request: AnalysisCreateRequest,
    response: Response,
    idempotency_key: str = Header(None, alias="Idempotency-Key"),
    context: WorkspaceContext = Depends(require_role(RoleEnum.ANALYST)),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits an analysis job.
    In Phase 1, validates role and persists an authorized Analysis record.
    Full geometry clipping, date checks, and transactional outbox are added in Phase 2.
    """
    analysis_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    # Persist authorized analysis row scoped to workspace
    analysis = Analysis(
        id=analysis_id,
        workspace_id=uuid.UUID(context.workspace_id),
        aoi_snapshot=request.aoi,
        baseline_start=request.baseline.start,
        baseline_end=request.baseline.end,
        comparison_start=request.comparison.start,
        comparison_end=request.comparison.end,
        requested_layers=request.layers,
        configuration_id=request.configuration_id,
        status=JobStatusEnum.QUEUED.value,
        idempotency_key=idempotency_key,
        created_by=context.principal.user_id,
        created_at=now,
        updated_at=now,
    )
    db.add(analysis)
    await db.commit()

    location_url = f"/api/v1/analyses/{analysis_id}"
    response.headers["Location"] = location_url

    return AnalysisCreateResponse(
        analysis_id=str(analysis_id),
        status="queued",
        created_at=now.isoformat(),
        status_url=location_url,
        results_url=f"/api/v1/analyses/{analysis_id}/results",
    )


@router.get("/{analysis_id}", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    analysis_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve status of an analysis, enforcing workspace isolation."""
    try:
        parsed_id = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")

    stmt = select(Analysis).where(
        Analysis.id == parsed_id,
        Analysis.workspace_id == uuid.UUID(context.workspace_id),
    )
    result = await db.execute(stmt)
    analysis = result.scalar_one_or_none()
    if not analysis:
        # Cross-workspace or non-existent resource denial
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")

    return AnalysisStatusResponse(
        analysis_id=str(analysis.id),
        status=str(analysis.status),
        stage=str(analysis.stage) if analysis.stage else None,
        completed_layers=0,
        total_layers=len(analysis.requested_layers)
        if isinstance(analysis.requested_layers, list)
        else 0,
        layers=[],
        warnings=[],
        updated_at=analysis.updated_at.isoformat(),
    )


@router.post("/{analysis_id}/cancel", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def cancel_analysis(
    analysis_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.ANALYST)),
):
    """Stub for cooperative cancellation (implemented in Phase 2)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Cancellation implemented in Phase 2."
    )


@router.get(
    "/{analysis_id}/results",
    response_model=ResultManifestResponse,
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
)
async def get_analysis_results(
    analysis_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
):
    """Stub for result manifest retrieval (implemented in Phase 3)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Result manifests implemented in Phase 3.",
    )


@router.get("/{analysis_id}/events", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def get_analysis_events(
    analysis_id: str,
    context: WorkspaceContext = Depends(require_role(RoleEnum.VIEWER)),
):
    """Stub for paginated events retrieval (implemented in Phase 3/5)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Events retrieval implemented in Phase 3.",
    )


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
