import asyncio
import json
import logging
from typing import Optional

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
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


async def run_scheduler(
    interval_seconds: float = 5.0,
    stop_event: Optional[asyncio.Event] = None,
) -> None:
    """Daemon runner for reconciliation scheduler process role."""
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    attempt_repo = JobAttemptRepository()
    analysis_repo = AnalysisRepository()

    logger.info(
        "Reconciliation scheduler started, checking expired leases every %.1fs", interval_seconds
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
        await redis_client.aclose()
        logger.info("Reconciliation scheduler stopped.")
