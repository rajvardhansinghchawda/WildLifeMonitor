import uuid
from datetime import datetime, timezone

import pytest
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.job_attempt_repository import JobAttemptRepository
from app.workers.scheduler import reconcile_expired_attempts


@pytest.mark.asyncio
async def test_worker_heartbeat_actively_extends_lease(
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
):
    analysis_repo = AnalysisRepository()
    attempt_repo = JobAttemptRepository()

    # Create test analysis
    analysis, _ = await analysis_repo.create_analysis_with_layers_and_outbox(
        session=db_session,
        workspace_id=test_workspace,
        created_by="test-user",
        aoi_snapshot={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        baseline_start=datetime.now(timezone.utc).date(),
        baseline_end=datetime.now(timezone.utc).date(),
        comparison_start=datetime.now(timezone.utc).date(),
        comparison_end=datetime.now(timezone.utc).date(),
        requested_layers=["vegetation"],
        configuration_id="mvp-v1",
    )
    await db_session.commit()

    # Create attempt with a short 5-second lease
    attempt = await attempt_repo.create_attempt(
        session=db_session,
        analysis_id=analysis.id,
        worker_id="test-heartbeat-worker",
        lease_seconds=5,
    )
    await db_session.commit()

    initial_expiry = attempt.lease_expires_at
    assert initial_expiry is not None

    # Actively renew lease by 60 seconds
    renewed = await attempt_repo.renew_lease(
        session=db_session,
        attempt_id=attempt.id,
        fencing_token=attempt.fencing_token,
        extension_seconds=60,
    )
    await db_session.commit()
    assert renewed is True

    # Refresh attempt from database
    refreshed_attempt = await attempt_repo.get_by_id(db_session, attempt.id)
    assert refreshed_attempt is not None
    assert refreshed_attempt.lease_expires_at is not None

    # Assert lease expiry was extended by ~60 seconds into the future, well beyond initial_expiry
    assert refreshed_attempt.lease_expires_at > initial_expiry
    diff_seconds = (refreshed_attempt.lease_expires_at - initial_expiry).total_seconds()
    assert diff_seconds >= 50.0

    # Ensure reconciliation does not reap this healthy attempt
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        await reconcile_expired_attempts(
            db_session, redis_client, attempt_repo, analysis_repo
        )
        still_healthy = await attempt_repo.get_by_id(db_session, attempt.id)
        assert still_healthy is not None
        assert still_healthy.status == "active"
    finally:
        await redis_client.aclose()


@pytest.mark.asyncio
async def test_worker_heartbeat_rejected_on_superseded_fencing_token(
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
):
    analysis_repo = AnalysisRepository()
    attempt_repo = JobAttemptRepository()

    analysis, _ = await analysis_repo.create_analysis_with_layers_and_outbox(
        session=db_session,
        workspace_id=test_workspace,
        created_by="test-user",
        aoi_snapshot={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        baseline_start=datetime.now(timezone.utc).date(),
        baseline_end=datetime.now(timezone.utc).date(),
        comparison_start=datetime.now(timezone.utc).date(),
        comparison_end=datetime.now(timezone.utc).date(),
        requested_layers=["vegetation"],
        configuration_id="mvp-v1",
    )
    await db_session.commit()

    attempt = await attempt_repo.create_attempt(
        session=db_session,
        analysis_id=analysis.id,
        worker_id="test-heartbeat-worker-2",
        lease_seconds=30,
    )
    await db_session.commit()

    # Attempt to renew with an invalid/superseded fencing token
    renewed = await attempt_repo.renew_lease(
        session=db_session,
        attempt_id=attempt.id,
        fencing_token=attempt.fencing_token + 99,
        extension_seconds=60,
    )
    assert renewed is False
