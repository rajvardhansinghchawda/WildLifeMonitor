import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outbox import Outbox


class OutboxRepository:
    """Repository for Transactional Outbox pattern persistence and polling."""

    async def get_unpublished(
        self,
        session: AsyncSession,
        batch_size: int = 50,
    ) -> List[Outbox]:
        """Fetch unpublished outbox messages ordered by created_at.

        Uses the composite index (published_at, created_at) where published_at IS NULL.
        """
        query = (
            select(Outbox)
            .where(Outbox.published_at.is_(None))
            .order_by(Outbox.created_at.asc())
            .limit(batch_size)
            .with_for_update(skip_locked=True)
        )
        result = await session.execute(query)
        return list(result.scalars().all())

    async def mark_published(
        self,
        session: AsyncSession,
        outbox_ids: List[uuid.UUID],
    ) -> None:
        """Mark outbox items as published with current timestamp."""
        if not outbox_ids:
            return

        now = datetime.now(timezone.utc)
        await session.execute(
            update(Outbox)
            .where(Outbox.id.in_(outbox_ids))
            .values(
                published_at=now,
                status="published",
            )
        )
