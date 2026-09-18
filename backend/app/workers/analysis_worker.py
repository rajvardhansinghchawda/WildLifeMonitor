import asyncio
import json
import logging
import uuid
from datetime import date
from typing import Any, Dict, Optional, cast

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import FencingTokenExpiredError
from app.db.session import async_session_factory
from app.models.analysis import JobStatusEnum, LayerStatusEnum
from app.providers.base import AnalysisContext
from app.providers.fixture_processor import FixtureProcessor
from app.providers.fixture_vegetation_provider import FixtureVegetationProvider
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.job_attempt_repository import JobAttemptRepository
from app.services.artifact_service import ArtifactService
from app.services.event_extraction_service import EventExtractionService
from app.workers.dispatcher import REDIS_ANALYSES_QUEUE

logger = logging.getLogger(__name__)


class AnalysisWorker:
    """Worker process executing analysis jobs under distributed leases with active heartbeat renewal and fencing tokens."""

    def __init__(
        self,
        worker_id: Optional[str] = None,
        lease_seconds: int = 30,
        heartbeat_interval: float = 5.0,
    ):
        self.worker_id = worker_id or f"worker-{uuid.uuid4().hex[:8]}"
        self.lease_seconds = lease_seconds
        self.heartbeat_interval = heartbeat_interval
        self.analysis_repo = AnalysisRepository()
        self.attempt_repo = JobAttemptRepository()
        self.fixture_processor = FixtureProcessor()
        self.vegetation_provider = FixtureVegetationProvider()
        self.artifact_service = ArtifactService()
        self.event_service = EventExtractionService()

    async def execute_job_message(
        self,
        session: AsyncSession,
        message: dict,
        simulate_crash_no_heartbeat: bool = False,
    ) -> bool:
        """Process a single analysis execution message under an active lease."""
        analysis_id_str = message.get("analysis_id")
        if not analysis_id_str:
            logger.error("Received message without analysis_id: %s", message)
            return False

        analysis_id = uuid.UUID(analysis_id_str)
        analysis = await self.analysis_repo.get_by_id_internal(session, analysis_id)
        if not analysis:
            logger.error("Analysis %s not found in database", analysis_id)
            return False

        # If already terminal, do not execute duplicate work
        terminal_statuses = {
            JobStatusEnum.SUCCEEDED.value,
            JobStatusEnum.PARTIAL.value,
            JobStatusEnum.FAILED.value,
            JobStatusEnum.CANCELLED.value,
        }
        if analysis.status in terminal_statuses:
            logger.info(
                "Analysis %s already in terminal state '%s', skipping", analysis_id, analysis.status
            )
            return True

        # Check cooperative cancellation
        if analysis.cancel_requested or analysis.status == JobStatusEnum.CANCELREQUESTED.value:
            analysis.status = JobStatusEnum.CANCELLED.value  # type: ignore[assignment]
            analysis.stage = "cancelled"  # type: ignore[assignment]
            for layer in analysis.layers:
                layer.status = LayerStatusEnum.CANCELLED.value  # type: ignore[assignment]
            await session.commit()
            logger.info("Analysis %s was cancelled before worker execution started", analysis_id)
            return True

        # Create new JobAttempt with lease and fencing token
        attempt = await self.attempt_repo.create_attempt(
            session=session,
            analysis_id=analysis.id,  # type: ignore[arg-type]
            worker_id=self.worker_id,
            lease_seconds=self.lease_seconds,
        )

        analysis.status = JobStatusEnum.RUNNING.value  # type: ignore[assignment]
        analysis.stage = "processing_layers"  # type: ignore[assignment]
        await session.commit()

        logger.info(
            "Acquired lease for analysis %s: attempt=%d, fencing_token=%d, expires_in=%ds",
            analysis.id,
            attempt.attempt_number,
            attempt.fencing_token,
            self.lease_seconds,
        )

        # In crash simulation tests, omit heartbeat renewal and return early
        if simulate_crash_no_heartbeat:
            logger.warning(
                "Simulated worker crash: omitting heartbeats and abandoning attempt %s", attempt.id
            )
            return False

        # Active Heartbeat Task
        heartbeat_stop = asyncio.Event()

        async def heartbeat_loop():
            while not heartbeat_stop.is_set():
                await asyncio.sleep(self.heartbeat_interval)
                if heartbeat_stop.is_set():
                    break
                async with async_session_factory() as hb_session:
                    extended = await self.attempt_repo.renew_lease(
                        session=hb_session,
                        attempt_id=attempt.id,
                        fencing_token=attempt.fencing_token,
                        extension_seconds=self.lease_seconds,
                    )
                    await hb_session.commit()
                    if not extended:
                        logger.error(
                            "Failed to renew lease for attempt %s: fencing token %d superseded or expired",
                            attempt.id,
                            attempt.fencing_token,
                        )
                        break

        heartbeat_task = asyncio.create_task(heartbeat_loop())

        try:
            # Refresh analysis state to check for cooperative cancellation during run
            await session.refresh(analysis, ["cancel_requested", "status"])
            if analysis.cancel_requested:
                analysis.status = JobStatusEnum.CANCELLED.value  # type: ignore[assignment]
                analysis.stage = "cancelled"  # type: ignore[assignment]
                await self.attempt_repo.mark_attempt_status(session, attempt.id, "cancelled")  # type: ignore[arg-type]
                for layer in analysis.layers:
                    layer.status = LayerStatusEnum.CANCELLED.value  # type: ignore[assignment]
                await session.commit()
                return True

            # Process each requested layer using deterministic fixture processor
            # Process each requested layer using appropriate provider and publish artifacts
            for layer in analysis.layers:
                if layer.layer_type == "vegetation":
                    context = AnalysisContext(
                        analysis_id=cast(uuid.UUID, analysis.id),
                        attempt_id=cast(uuid.UUID, attempt.id),
                        workspace_id=cast(uuid.UUID, analysis.workspace_id),
                        aoi=cast(Dict[str, Any], analysis.aoi_snapshot),
                        baseline_start=cast(date, analysis.baseline_start),
                        baseline_end=cast(date, analysis.baseline_end),
                        comparison_start=cast(date, analysis.comparison_start),
                        comparison_end=cast(date, analysis.comparison_end),
                        configuration_id=str(analysis.configuration_id),
                    )
                    layer_result = await self.vegetation_provider.analyze(context)
                    layer.status = layer_result.status  # type: ignore[assignment]
                    layer.quality_label = layer_result.quality_label  # type: ignore[assignment]
                    layer.metrics = layer_result.metrics  # type: ignore[assignment]
                    layer.method_version = layer_result.method_version  # type: ignore[assignment]

                    if layer_result.status == "ready":
                        # Publish artifacts to object storage with SHA256 validation
                        mock_tif_bytes = b"II*\x00\x08\x00\x00\x00" + b"\x00" * 100
                        manifest_payload = {
                            "analysis_id": str(analysis.id),
                            "attempt_id": str(attempt.id),
                            "layer_type": "vegetation",
                            "method_version": layer_result.method_version,
                            "metrics": layer_result.metrics,
                            "provenance": layer_result.provenance,
                        }
                        await self.artifact_service.publish_layer_manifest_and_raster(
                            session=session,
                            analysis_id=cast(uuid.UUID, analysis.id),
                            attempt_id=cast(uuid.UUID, attempt.id),
                            layer_type="vegetation",
                            manifest_data=manifest_payload,
                            raster_bytes=mock_tif_bytes,
                        )

                        # Persist ChangeEvents idempotently
                        await self.event_service.persist_events_idempotent(
                            session=session,
                            workspace_id=cast(uuid.UUID, analysis.workspace_id),
                            analysis_id=cast(uuid.UUID, analysis.id),
                            layer_id=cast(uuid.UUID, layer.id),
                            raw_events=layer_result.events,
                            method_version=layer_result.method_version,
                        )
                else:
                    layer_output = self.fixture_processor.process_layer(
                        analysis=analysis,
                        attempt=attempt,
                        layer_type=layer.layer_type,
                    )
                    layer.status = layer_output["status"]  # type: ignore[assignment]
                    layer.quality_label = layer_output["quality_label"]  # type: ignore[assignment]
                    layer.metrics = layer_output["metrics"]  # type: ignore[assignment]
                    layer.method_version = layer_output["method_version"]  # type: ignore[assignment]

            # Fencing Token Validation before publication
            is_token_valid = await self.attempt_repo.validate_fencing_token(
                session=session,
                attempt_id=attempt.id,  # type: ignore[arg-type]
                fencing_token=attempt.fencing_token,  # type: ignore[arg-type]
            )
            if not is_token_valid:
                logger.error(
                    "REJECTING finalization for analysis %s attempt %s: fencing token %d expired or superseded",
                    analysis.id,
                    attempt.id,
                    attempt.fencing_token,
                )
                await session.rollback()
                raise FencingTokenExpiredError(
                    f"Fencing token {attempt.fencing_token} expired or superseded before publication."
                )

            # Resolve Job Status per systemdesign.md rules:
            # - succeeded: all requested layers ready
            # - partial: at least one ready and one not ready
            # - failed: no requested layer ready
            all_ready = all(
                layer_item.status == LayerStatusEnum.READY.value for layer_item in analysis.layers
            )
            any_ready = any(
                layer_item.status == LayerStatusEnum.READY.value for layer_item in analysis.layers
            )

            if all_ready:
                resolved_status = JobStatusEnum.SUCCEEDED.value
            elif any_ready:
                resolved_status = JobStatusEnum.PARTIAL.value
            else:
                resolved_status = JobStatusEnum.FAILED.value

            analysis.status = resolved_status  # type: ignore[assignment]
            analysis.stage = "completed"  # type: ignore[assignment]
            await self.attempt_repo.mark_attempt_status(session, attempt.id, "completed")  # type: ignore[arg-type]
            await session.commit()

            logger.info(
                "Successfully finalized analysis %s with status '%s' under fencing_token=%d",
                analysis.id,
                resolved_status,
                attempt.fencing_token,
            )
            return True

        finally:
            heartbeat_stop.set()
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass


async def run_worker(
    worker_id: Optional[str] = None,
    stop_event: Optional[asyncio.Event] = None,
) -> None:
    """Daemon runner for analysis worker process consuming from Redis queue."""
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    worker = AnalysisWorker(worker_id=worker_id)

    logger.info(
        "Analysis worker '%s' started, listening on '%s'", worker.worker_id, REDIS_ANALYSES_QUEUE
    )
    try:
        while stop_event is None or not stop_event.is_set():
            # Pop next message from Redis queue
            raw_msg = await redis_client.lpop(REDIS_ANALYSES_QUEUE)
            if not raw_msg:
                await asyncio.sleep(0.5)
                continue

            try:
                message = json.loads(raw_msg)
                async with async_session_factory() as session:
                    await worker.execute_job_message(session, message)
            except Exception as e:
                logger.error("Worker error processing message: %s", str(e), exc_info=True)

    finally:
        await redis_client.aclose()
        logger.info("Analysis worker '%s' stopped.", worker.worker_id)
