import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.metrics import WORKER_HEARTBEAT_AGE_SECONDS
from app.db.session import async_session_factory
from app.models.analysis import JobStatusEnum
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.job_attempt_repository import JobAttemptRepository
from app.workers.dispatcher import REDIS_ANALYSES_QUEUE

logger = logging.getLogger(__name__)


async def reconcile_expired_attempts(
    session: AsyncSession,
    redis_client: aioredis.Redis,
    attempt_repo: Optional[JobAttemptRepository] = None,
    analysis_repo: Optional[AnalysisRepository] = None,
    max_attempts: int = 3,
) -> int:
    """Detect and recover expired worker leases.

    Invariants (systemdesign.md):
    - Expired attempts are marked 'expired'.
    - New attempts are requeued with an incremented fencing token.
    - If max attempts exceeded, analysis transitions to 'failed'.
    - The database is authoritative — Redis holds only dispatch state.
    """
    attempt_repository = attempt_repo or JobAttemptRepository()
    analysis_repository = analysis_repo or AnalysisRepository()

    expired_attempts = await attempt_repository.get_expired_active_attempts(session)
    if not expired_attempts:
        return 0

    reconciled_count = 0
    for attempt in expired_attempts:
        logger.warning(
            "Detected expired attempt %s for analysis %s (attempt_number=%d, fencing_token=%d)",
            attempt.id,
            attempt.analysis_id,
            attempt.attempt_number,
            attempt.fencing_token,
        )
        if attempt.heartbeat_at is not None:
            last_heartbeat = attempt.heartbeat_at
            if last_heartbeat.tzinfo is None:
                last_heartbeat = last_heartbeat.replace(tzinfo=timezone.utc)
            heartbeat_age = (datetime.now(timezone.utc) - last_heartbeat).total_seconds()
            WORKER_HEARTBEAT_AGE_SECONDS.labels(worker_id=str(attempt.worker_id)).set(heartbeat_age)
        # Mark attempt as expired
        await attempt_repository.mark_attempt_status(session, attempt.id, "expired")  # type: ignore[arg-type]

        analysis = await analysis_repository.get_by_id_internal(session, attempt.analysis_id)  # type: ignore[arg-type]
        if not analysis:
            continue

        terminal_statuses = {
            JobStatusEnum.SUCCEEDED.value,
            JobStatusEnum.PARTIAL.value,
            JobStatusEnum.FAILED.value,
            JobStatusEnum.CANCELLED.value,
        }
        if analysis.status in terminal_statuses:
            continue

        if attempt.attempt_number < max_attempts:
            # Requeue analysis with incremented attempt
            analysis.status = JobStatusEnum.QUEUED.value  # type: ignore[assignment]
            analysis.stage = f"reconciliation_requeued_attempt_{attempt.attempt_number + 1}"  # type: ignore[assignment]
            requeue_payload = {
                "analysis_id": str(analysis.id),
                "workspace_id": str(analysis.workspace_id),
                "requeued_from_attempt": attempt.attempt_number,
            }
            await redis_client.rpush(REDIS_ANALYSES_QUEUE, json.dumps(requeue_payload))  # type: ignore[misc]
            logger.info(
                "Requeued analysis %s for attempt %d", analysis.id, attempt.attempt_number + 1
            )
        else:
            # Exceeded max retry attempts
            analysis.status = JobStatusEnum.FAILED.value  # type: ignore[assignment]
            analysis.stage = "max_attempts_exceeded"  # type: ignore[assignment]
            logger.error(
                "Analysis %s failed after reaching max attempts (%d)", analysis.id, max_attempts
            )

        reconciled_count += 1

    await session.commit()
    return reconciled_count


async def run_artifact_cleanup_loop(
    interval_seconds: float = 3600.0,
    grace_period_hours: int = 24,
    stop_event: Optional[asyncio.Event] = None,
) -> None:
    """Periodic sweep deleting abandoned (failed/cancelled) attempt artifacts.

    Runs on its own, much longer interval than lease reconciliation — a 24h
    grace-period cleanup has no reason to be checked every few seconds.
    Built as ArtifactCleanupService (app/services/artifact_cleanup_service.py)
    but was never scheduled anywhere until now, so abandoned artifacts were
    never actually being garbage collected in a real deployment.
    """
    from app.services.artifact_cleanup_service import ArtifactCleanupService

    cleanup_service = ArtifactCleanupService()
    logger.info(
        "Artifact cleanup loop started, sweeping every %.0fs (grace period=%dh)",
        interval_seconds,
        grace_period_hours,
    )
    while stop_event is None or not stop_event.is_set():
        async with async_session_factory() as session:
            try:
                await cleanup_service.cleanup_abandoned_artifacts(
                    session=session,
                    grace_period_hours=grace_period_hours,
                )
            except Exception as e:
                logger.error("Error during artifact cleanup sweep: %s", str(e), exc_info=True)
                await session.rollback()

        await asyncio.sleep(interval_seconds)


async def run_scheduler(
    interval_seconds: float = 5.0,
    artifact_cleanup_interval_seconds: float = 3600.0,
    stop_event: Optional[asyncio.Event] = None,
) -> None:
    """Daemon runner for reconciliation scheduler process role."""
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    attempt_repo = JobAttemptRepository()
    analysis_repo = AnalysisRepository()

    logger.info(
        "Reconciliation scheduler started, checking expired leases every %.1fs", interval_seconds
    )
    cleanup_task = asyncio.create_task(
        run_artifact_cleanup_loop(
            interval_seconds=artifact_cleanup_interval_seconds,
            stop_event=stop_event,
        )
    )
    try:
        while stop_event is None or not stop_event.is_set():
            async with async_session_factory() as session:
                try:
                    await reconcile_expired_attempts(
                        session=session,
                        redis_client=redis_client,
                        attempt_repo=attempt_repo,
                        analysis_repo=analysis_repo,
                    )
                except Exception as e:
                    logger.error("Error during attempt reconciliation: %s", str(e), exc_info=True)
                    await session.rollback()

            await asyncio.sleep(interval_seconds)
    finally:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass
        await redis_client.aclose()
        logger.info("Reconciliation scheduler stopped.")


if __name__ == "__main__":
    logging.basicConfig(level=settings.LOG_LEVEL)
    from prometheus_client import start_http_server

    start_http_server(9103)
    asyncio.run(run_scheduler())
