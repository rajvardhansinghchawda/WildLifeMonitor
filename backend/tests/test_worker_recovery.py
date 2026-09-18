import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import redis.asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.analysis import AnalysisLayer, JobStatusEnum
from app.models.job_attempt import JobAttempt
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.job_attempt_repository import JobAttemptRepository
from app.workers.analysis_worker import AnalysisWorker
from app.workers.dispatcher import REDIS_ANALYSES_QUEUE
from app.workers.scheduler import reconcile_expired_attempts


@pytest.mark.asyncio
async def test_worker_crash_recovery_and_fencing_token_rejection(
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
):
    """Integration test simulating worker crash, lease expiry detection, requeue, and zombie fencing rejection.

    Guarantees:
    - Stale worker 1 cannot finalize results after lease expires and job is requeued.
    - Recovered worker 2 completes successfully with incremented fencing token.
    - Single-publication guarantee: no duplicate results.
    """
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        await redis_client.delete(REDIS_ANALYSES_QUEUE)
        analysis_repo = AnalysisRepository()
        attempt_repo = JobAttemptRepository()

        # 1. Create analysis with vegetation layer
        analysis, _ = await analysis_repo.create_analysis_with_layers_and_outbox(
            session=db_session,
            workspace_id=test_workspace,
            created_by="test-user",
            aoi_snapshot={
                "type": "Polygon",
                "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
            },
            baseline_start=datetime.now(timezone.utc).date(),
            baseline_end=datetime.now(timezone.utc).date(),
            comparison_start=datetime.now(timezone.utc).date(),
            comparison_end=datetime.now(timezone.utc).date(),
            requested_layers=["vegetation"],
            configuration_id="mvp-v1",
        )
        await db_session.commit()

        # 2. Worker 1 acquires lease for attempt 1
        worker1 = AnalysisWorker(worker_id="zombie-worker-1", lease_seconds=1)
        attempt1 = await attempt_repo.create_attempt(
            session=db_session,
            analysis_id=analysis.id,
            worker_id=worker1.worker_id,
            lease_seconds=1,
        )
        await db_session.commit()

        # Simulate crash: artificially expire worker 1's lease in DB
        expired_time = datetime.now(timezone.utc) - timedelta(seconds=10)
        attempt1.lease_expires_at = expired_time
        await db_session.commit()

        # 3. Reconciliation scheduler runs: detects expired lease, marks expired, requeues analysis
        reconciled = await reconcile_expired_attempts(
            session=db_session,
            redis_client=redis_client,
            attempt_repo=attempt_repo,
            analysis_repo=analysis_repo,
        )
        assert reconciled == 1

        # Verify attempt1 is expired in DB
        await db_session.refresh(attempt1)
        assert attempt1.status == "expired"

        # 4. Worker 2 picks up requeued message from Redis and executes to completion
        queued_item = await redis_client.lpop(REDIS_ANALYSES_QUEUE)
        assert queued_item is not None
        requeued_msg = json.loads(queued_item)

        worker2 = AnalysisWorker(worker_id="healthy-worker-2", lease_seconds=30)
        success2 = await worker2.execute_job_message(db_session, requeued_msg)
        assert success2 is True

        # Verify worker 2 created attempt 2 with fencing_token = 2 and succeeded
        attempts_stmt = (
            select(JobAttempt)
            .where(JobAttempt.analysis_id == analysis.id)
            .order_by(JobAttempt.attempt_number.asc())
        )
        attempts_res = await db_session.execute(attempts_stmt)
        all_attempts = list(attempts_res.scalars().all())
        assert len(all_attempts) == 2
        assert all_attempts[0].attempt_number == 1
        assert all_attempts[0].status == "expired"
        assert all_attempts[1].attempt_number == 2
        assert all_attempts[1].fencing_token == 2
        assert all_attempts[1].status == "completed"

        # 5. Zombie Worker 1 wakes up and attempts to finalize attempt 1
        # It must be REJECTED because fencing_token 1 is expired and superseded
        is_token_valid = await attempt_repo.validate_fencing_token(
            session=db_session,
            attempt_id=attempt1.id,
            fencing_token=attempt1.fencing_token,
        )
        assert is_token_valid is False

        # 6. Assert Single-Publication Guarantee:
        # Check layers: exactly 1 vegetation layer, status is ready, not duplicate
        layers_stmt = select(AnalysisLayer).where(AnalysisLayer.analysis_id == analysis.id)
        layers_res = await db_session.execute(layers_stmt)
        layers = list(layers_res.scalars().all())
        assert len(layers) == 1
        assert layers[0].status == "ready"

        # Check analysis status is succeeded
        await db_session.refresh(analysis)
        assert analysis.status == JobStatusEnum.SUCCEEDED.value

    finally:
        await redis_client.aclose()
