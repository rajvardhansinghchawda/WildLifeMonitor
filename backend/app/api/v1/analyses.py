import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import WorkspaceContext, require_role
from app.db.session import get_db
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
    """Request cooperative cancellation for an active analysis.

    Returns:
    - 202 Accepted if cancellation was requested while queued or running
    - 409 Conflict if analysis is already in a terminal state
    """
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
