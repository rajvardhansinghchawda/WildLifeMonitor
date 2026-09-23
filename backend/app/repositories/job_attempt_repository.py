import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job_attempt import JobAttempt


class JobAttemptRepository:
    """Repository managing distributed leases, active heartbeat extensions, and fencing tokens."""

    async def create_attempt(
        self,
        session: AsyncSession,
        analysis_id: uuid.UUID,
        worker_id: str,
        lease_seconds: int = 30,
    ) -> JobAttempt:
        """Create a new leased attempt with incremented attempt_number and fencing_token."""
        # Find latest attempt number and fencing token for this analysis
        max_query = select(
            func.coalesce(func.max(JobAttempt.attempt_number), 0),
            func.coalesce(func.max(JobAttempt.fencing_token), 0),
        ).where(JobAttempt.analysis_id == analysis_id)

        result = await session.execute(max_query)
        max_attempt_num, max_fencing_token = result.one()

        next_attempt_number = max_attempt_num + 1
        next_fencing_token = max_fencing_token + 1

        now = datetime.now(timezone.utc)
        lease_expires = now + timedelta(seconds=lease_seconds)

        attempt = JobAttempt(
            id=uuid.uuid4(),
            analysis_id=analysis_id,
            attempt_number=next_attempt_number,
            worker_id=worker_id,
            fencing_token=next_fencing_token,
            lease_expires_at=lease_expires,
            heartbeat_at=now,
            status="active",
            created_at=now,
        )
        session.add(attempt)
        await session.flush()
        return attempt

    async def renew_lease(
        self,
        session: AsyncSession,
        attempt_id: uuid.UUID,
        fencing_token: int,
        extension_seconds: int = 30,
    ) -> bool:
        """Actively extend the worker's lease expiry in the database.

        Ensures that healthy long-running workers are never reaped by the reconciliation scheduler.
        Guarantees that a worker whose fencing token was superseded cannot extend its lease.
        """
        now = datetime.now(timezone.utc)
        # Parameterized query with interval extension
        stmt = (
            update(JobAttempt)
            .where(
                JobAttempt.id == attempt_id,
                JobAttempt.fencing_token == fencing_token,
                JobAttempt.status == "active",
            )
            .values(
                lease_expires_at=now + timedelta(seconds=extension_seconds),
                heartbeat_at=now,
            )
        )
        result = await session.execute(stmt)
        return result.rowcount > 0

    async def validate_fencing_token(
        self,
        session: AsyncSession,
        attempt_id: uuid.UUID,
        fencing_token: int,
    ) -> bool:
        """Validate that the attempt is still active and possesses the authorized fencing token."""
        now = datetime.now(timezone.utc)
        query = select(JobAttempt).where(
            JobAttempt.id == attempt_id,
            JobAttempt.fencing_token == fencing_token,
            JobAttempt.status == "active",
            JobAttempt.lease_expires_at > now,
        )
        result = await session.execute(query)
        return result.scalar_one_or_none() is not None

    async def get_expired_active_attempts(
        self,
        session: AsyncSession,
    ) -> List[JobAttempt]:
        """Query all active job attempts whose lease has expired without renewal."""
        now = datetime.now(timezone.utc)
        query = (
            select(JobAttempt)
            .where(
                JobAttempt.status == "active",
                JobAttempt.lease_expires_at < now,
            )
            .with_for_update(skip_locked=True)
        )
        result = await session.execute(query)
        return list(result.scalars().all())

    async def mark_attempt_status(
        self,
        session: AsyncSession,
        attempt_id: uuid.UUID,
        status: str,
    ) -> None:
        """Transition attempt status (e.g. completed, expired, cancelled, failed)."""
        await session.execute(
            update(JobAttempt).where(JobAttempt.id == attempt_id).values(status=status)
        )

    async def get_by_id(
        self,
        session: AsyncSession,
        attempt_id: uuid.UUID,
    ) -> Optional[JobAttempt]:
        """Fetch attempt by ID."""
        query = select(JobAttempt).where(JobAttempt.id == attempt_id)
        result = await session.execute(query)
        return result.scalar_one_or_none()
