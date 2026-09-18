import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.analysis import Analysis, AnalysisLayer, JobStatusEnum, LayerStatusEnum
from app.models.outbox import Outbox


class AnalysisRepository:
    """Workspace-scoped repository for Analysis and AnalysisLayer persistence."""

    async def get_by_id(
        self,
        session: AsyncSession,
        analysis_id: uuid.UUID,
        workspace_id: uuid.UUID,
    ) -> Optional[Analysis]:
        """Fetch analysis strictly scoped to the authenticated workspace."""
        query = (
            select(Analysis)
            .options(
                selectinload(Analysis.layers),
                selectinload(Analysis.job_attempts),
            )
            .where(
                Analysis.id == analysis_id,
                Analysis.workspace_id == workspace_id,
            )
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id_internal(
        self,
        session: AsyncSession,
        analysis_id: uuid.UUID,
    ) -> Optional[Analysis]:
        """Fetch analysis by ID without workspace filter (used by worker and scheduler)."""
        query = (
            select(Analysis)
            .options(
                selectinload(Analysis.layers),
                selectinload(Analysis.job_attempts),
            )
            .where(Analysis.id == analysis_id)
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()

    async def find_by_idempotency_key(
        self,
        session: AsyncSession,
        workspace_id: uuid.UUID,
        idempotency_key: str,
    ) -> Optional[Analysis]:
        """Find existing analysis matching idempotency key within workspace."""
        query = (
            select(Analysis)
            .options(selectinload(Analysis.layers))
            .where(
                Analysis.workspace_id == workspace_id,
                Analysis.idempotency_key == idempotency_key,
            )
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()

    async def count_active_jobs(
        self,
        session: AsyncSession,
        workspace_id: uuid.UUID,
    ) -> int:
        """Count non-terminal analyses in workspace to enforce MAX_ACTIVE_JOBS_PER_WORKSPACE."""
        active_statuses = [
            JobStatusEnum.QUEUED.value,
            JobStatusEnum.RUNNING.value,
            JobStatusEnum.CANCELREQUESTED.value,
        ]
        query = select(func.count(Analysis.id)).where(
            Analysis.workspace_id == workspace_id,
            Analysis.status.in_(active_statuses),
        )
        result = await session.execute(query)
        return result.scalar_one() or 0

    async def create_analysis_with_layers_and_outbox(
        self,
        session: AsyncSession,
        workspace_id: uuid.UUID,
        created_by: str,
        aoi_snapshot: Dict[str, Any],
        baseline_start: date,
        baseline_end: date,
        comparison_start: date,
        comparison_end: date,
        requested_layers: List[str],
        configuration_id: str,
        idempotency_key: Optional[str] = None,
    ) -> Tuple[Analysis, Outbox]:
        """Atomically persist Analysis, AnalysisLayer rows, and Outbox entry in one transaction."""
        analysis = Analysis(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            created_by=created_by,
            aoi_snapshot=aoi_snapshot,
            baseline_start=baseline_start,
            baseline_end=baseline_end,
            comparison_start=comparison_start,
            comparison_end=comparison_end,
            requested_layers=requested_layers,
            configuration_id=configuration_id,
            status=JobStatusEnum.QUEUED.value,
            stage="enqueued",
            idempotency_key=idempotency_key,
            cancel_requested=False,
        )
        session.add(analysis)

        # Create child layer records
        for layer_type in requested_layers:
            layer = AnalysisLayer(
                id=uuid.uuid4(),
                analysis_id=analysis.id,
                layer_type=layer_type,
                status=LayerStatusEnum.PENDING.value,
            )
            session.add(layer)

        # Create transactional outbox row
        outbox = Outbox(
            id=uuid.uuid4(),
            topic="analyses.created",
            message={
                "analysis_id": str(analysis.id),
                "workspace_id": str(workspace_id),
                "requested_layers": requested_layers,
                "configuration_id": configuration_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            status="pending",
            published_at=None,
        )
        session.add(outbox)

        await session.flush()
        return analysis, outbox

    async def update_status(
        self,
        session: AsyncSession,
        analysis_id: uuid.UUID,
        status: str,
        stage: Optional[str] = None,
    ) -> None:
        """Update analysis job status and stage."""
        values: Dict[str, Any] = {
            "status": status,
            "updated_at": datetime.now(timezone.utc),
        }
        if stage is not None:
            values["stage"] = stage

        await session.execute(update(Analysis).where(Analysis.id == analysis_id).values(**values))

    async def request_cancellation(
        self,
        session: AsyncSession,
        analysis_id: uuid.UUID,
        workspace_id: uuid.UUID,
    ) -> Optional[Analysis]:
        """Request cooperative cancellation for an active analysis."""
        analysis = await self.get_by_id(session, analysis_id, workspace_id)
        if not analysis:
            return None

        terminal_statuses = [
            JobStatusEnum.SUCCEEDED.value,
            JobStatusEnum.PARTIAL.value,
            JobStatusEnum.FAILED.value,
            JobStatusEnum.CANCELLED.value,
        ]
        if analysis.status in terminal_statuses:
            return analysis

        analysis.cancel_requested = True  # type: ignore[assignment]
        analysis.status = JobStatusEnum.CANCELREQUESTED.value  # type: ignore[assignment]
        analysis.stage = "cancel_requested"  # type: ignore[assignment]
        analysis.updated_at = datetime.now(timezone.utc)  # type: ignore[assignment]
        await session.flush()
        return analysis
