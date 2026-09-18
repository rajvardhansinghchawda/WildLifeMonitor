import uuid
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ConflictException, NotFoundException, RateLimitedException
from app.models.analysis import Analysis, JobStatusEnum
from app.repositories.analysis_repository import AnalysisRepository
from app.schemas.analysis import (
    AnalysisCreateRequest,
    AnalysisCreateResponse,
    AnalysisStatusResponse,
    LayerStatusItem,
)
from app.services.analysis_validation import validate_date_windows, validate_geometry
from app.services.idempotency_store import IdempotencyStore
from app.services.scientific_cache import ScientificCache


class AnalysisService:
    """Domain service orchestrating analysis lifecycle, validation, idempotency, and persistence."""

    def __init__(
        self,
        analysis_repository: Optional[AnalysisRepository] = None,
        idempotency_store: Optional[IdempotencyStore] = None,
        scientific_cache: Optional[ScientificCache] = None,
    ):
        self.repo = analysis_repository or AnalysisRepository()
        self.idempotency_store = idempotency_store or IdempotencyStore()
        self.scientific_cache = scientific_cache or ScientificCache()

    async def submit_analysis(
        self,
        session: AsyncSession,
        workspace_id: uuid.UUID,
        user_id: str,
        request: AnalysisCreateRequest,
        idempotency_key: Optional[str] = None,
    ) -> Tuple[AnalysisCreateResponse, List[str]]:
        """Validate submission, resolve idempotency, enforce limits, and atomically persist."""
        # 1. Validate AOI geometry
        _, area_km2 = validate_geometry(
            aoi=request.aoi,
            max_km2=float(settings.MAX_AOI_KM2),
            max_vertices=settings.MAX_AOI_VERTICES,
        )

        # 2. Validate observation windows
        warnings = validate_date_windows(
            baseline=request.baseline,
            comparison=request.comparison,
            max_window_days=180,
        )

        # 3. Handle Idempotency-Key if provided
        payload_dict: Optional[dict] = None
        reservation_held = False
        if idempotency_key:
            # Check Redis IdempotencyStore
            payload_dict = {
                "aoi": request.aoi,
                "baseline_start": str(request.baseline.start),
                "baseline_end": str(request.baseline.end),
                "comparison_start": str(request.comparison.start),
                "comparison_end": str(request.comparison.end),
                "layers": request.layers,
                "configuration_id": request.configuration_id,
            }
            cached_resp = await self.idempotency_store.get_or_reserve(
                workspace_id=workspace_id,
                idempotency_key=idempotency_key,
                request_payload=payload_dict,
            )
            if cached_resp:
                return AnalysisCreateResponse(**cached_resp), warnings
            # get_or_reserve returned None: either we won the reservation, or it timed
            # out waiting on someone else's. Either way we must resolve it below —
            # by completing it (save_response) or releasing it on failure — so a
            # reservation never sits dangling as 'in_flight' for the full 24h TTL.
            reservation_held = True

        try:
            if idempotency_key and payload_dict is not None:
                # Also check DB persistence repository
                existing = await self.repo.find_by_idempotency_key(
                    session, workspace_id, idempotency_key
                )
                if existing:
                    matches = (
                        existing.aoi_snapshot == request.aoi
                        and existing.baseline_start == request.baseline.start
                        and existing.baseline_end == request.baseline.end
                        and existing.comparison_start == request.comparison.start
                        and existing.comparison_end == request.comparison.end
                        and existing.requested_layers == request.layers
                        and existing.configuration_id == request.configuration_id
                    )
                    if matches:
                        response = AnalysisCreateResponse(
                            analysis_id=str(existing.id),
                            status=str(existing.status),
                            created_at=existing.created_at.isoformat(),
                            status_url=f"{settings.API_PREFIX}/analyses/{existing.id}",
                            results_url=f"{settings.API_PREFIX}/analyses/{existing.id}/results",
                        )
                        await self.idempotency_store.save_response(
                            workspace_id=workspace_id,
                            idempotency_key=idempotency_key,
                            request_payload=payload_dict,
                            response_data=response.model_dump(),
                        )
                        return response, warnings
                    else:
                        raise ConflictException(
                            error_code="IDEMPOTENCYCONFLICT",
                            message="Idempotency key was previously used with a different request payload.",
                            details={"idempotency_key": idempotency_key},
                        )

            # 4. Enforce MAX_ACTIVE_JOBS_PER_WORKSPACE
            active_count = await self.repo.count_active_jobs(session, workspace_id)
            if active_count >= settings.MAX_ACTIVE_JOBS_PER_WORKSPACE:
                raise RateLimitedException(
                    error_code="RATELIMITED",
                    message=(
                        f"Workspace has {active_count} concurrent active jobs, "
                        f"exceeding the limit of {settings.MAX_ACTIVE_JOBS_PER_WORKSPACE}."
                    ),
                    details={
                        "active_jobs": active_count,
                        "max_active_jobs": settings.MAX_ACTIVE_JOBS_PER_WORKSPACE,
                    },
                )

            # 5. Persist Analysis + AnalysisLayer + Outbox atomically in one database transaction
            analysis, _ = await self.repo.create_analysis_with_layers_and_outbox(
                session=session,
                workspace_id=workspace_id,
                created_by=user_id,
                aoi_snapshot=request.aoi,
                baseline_start=request.baseline.start,
                baseline_end=request.baseline.end,
                comparison_start=request.comparison.start,
                comparison_end=request.comparison.end,
                requested_layers=request.layers,
                configuration_id=request.configuration_id,
                idempotency_key=idempotency_key,
            )

            response = AnalysisCreateResponse(
                analysis_id=str(analysis.id),
                status=str(analysis.status),
                created_at=analysis.created_at.isoformat(),
                status_url=f"{settings.API_PREFIX}/analyses/{analysis.id}",
                results_url=f"{settings.API_PREFIX}/analyses/{analysis.id}/results",
            )

            if idempotency_key and payload_dict is not None:
                await self.idempotency_store.save_response(
                    workspace_id=workspace_id,
                    idempotency_key=idempotency_key,
                    request_payload=payload_dict,
                    response_data=response.model_dump(),
                )

            return response, warnings
        except Exception:
            if reservation_held and idempotency_key:
                await self.idempotency_store.release(
                    workspace_id=workspace_id,
                    idempotency_key=idempotency_key,
                )
            raise

    async def get_analysis_status(
        self,
        session: AsyncSession,
        analysis_id: uuid.UUID,
        workspace_id: uuid.UUID,
    ) -> AnalysisStatusResponse:
        """Fetch DB-authoritative status representation per spec.md."""
        analysis = await self.repo.get_by_id(session, analysis_id, workspace_id)
        if not analysis:
            raise NotFoundException(
                error_code="NOTFOUND",
                message=f"Analysis '{analysis_id}' not found in current workspace.",
            )

        terminal_layer_statuses = {
            "ready",
            "insufficientdata",
            "unsupported",
            "failed",
            "cancelled",
        }
        completed_layers = sum(
            1 for layer in analysis.layers if layer.status in terminal_layer_statuses
        )
        total_layers = len(analysis.layers)

        layer_items = [
            LayerStatusItem(
                layer_id=str(layer.id),
                type=str(layer.layer_type),
                status=str(layer.status),
                error_code=layer.error_code,
                error_details=layer.error_details,
            )
            for layer in analysis.layers
        ]

        return AnalysisStatusResponse(
            analysis_id=str(analysis.id),
            status=str(analysis.status),
            stage=str(analysis.stage) if analysis.stage else None,
            completed_layers=completed_layers,
            total_layers=total_layers,
            layers=layer_items,
            warnings=[],
            updated_at=analysis.updated_at.isoformat(),
        )

    async def cancel_analysis(
        self,
        session: AsyncSession,
        analysis_id: uuid.UUID,
        workspace_id: uuid.UUID,
    ) -> Analysis:
        """Request cooperative cancellation; return 409 if analysis is already terminal."""
        analysis = await self.repo.get_by_id(session, analysis_id, workspace_id)
        if not analysis:
            raise NotFoundException(
                error_code="NOTFOUND",
                message=f"Analysis '{analysis_id}' not found in current workspace.",
            )

        terminal_statuses = {
            JobStatusEnum.SUCCEEDED.value,
            JobStatusEnum.PARTIAL.value,
            JobStatusEnum.FAILED.value,
            JobStatusEnum.CANCELLED.value,
        }
        if analysis.status in terminal_statuses:
            raise ConflictException(
                error_code="ANALYSISALREADYTERMINAL",
                message=f"Analysis '{analysis_id}' is already in terminal state '{analysis.status}'.",
                details={"status": analysis.status},
            )

        updated_analysis = await self.repo.request_cancellation(
            session=session,
            analysis_id=analysis_id,
            workspace_id=workspace_id,
        )
        return updated_analysis or analysis
