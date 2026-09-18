import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.metrics import QUEUE_AGE_SECONDS, QUEUE_DEPTH
from app.db.session import async_session_factory
from app.repositories.outbox_repository import OutboxRepository

logger = logging.getLogger(__name__)

REDIS_ANALYSES_QUEUE = "analyses_queue"


async def dispatch_pending_outbox_messages(
    session: AsyncSession,
    redis_client: aioredis.Redis,
    outbox_repo: Optional[OutboxRepository] = None,
    batch_size: int = 50,
) -> int:
    """Poll unpublished Outbox messages, push to Redis queue, and mark published in one logical step.

    Downstream worker delivery is at-least-once; downstream processing is idempotent.
    """
    repo = outbox_repo or OutboxRepository()
    messages = await repo.get_unpublished(session, batch_size=batch_size)
    if not messages:
        QUEUE_DEPTH.labels(queue_name=REDIS_ANALYSES_QUEUE).set(
            await redis_client.llen(REDIS_ANALYSES_QUEUE)  # type: ignore[misc]
        )
        return 0

    oldest_created_at = min(msg.created_at for msg in messages)  # type: ignore[type-var]
    if oldest_created_at.tzinfo is None:
        oldest_created_at = oldest_created_at.replace(tzinfo=timezone.utc)
    QUEUE_AGE_SECONDS.labels(queue_name=REDIS_ANALYSES_QUEUE).set(
        (datetime.now(timezone.utc) - oldest_created_at).total_seconds()
    )

    published_ids: list[uuid.UUID] = []
    for msg in messages:
        payload = json.dumps(msg.message)
        await redis_client.rpush(REDIS_ANALYSES_QUEUE, payload)  # type: ignore[misc]
        published_ids.append(msg.id)  # type: ignore[arg-type]

    await repo.mark_published(session, published_ids)
    await session.commit()

    QUEUE_DEPTH.labels(queue_name=REDIS_ANALYSES_QUEUE).set(
        await redis_client.llen(REDIS_ANALYSES_QUEUE)  # type: ignore[misc]
    )

    logger.info(
        "Dispatched %d outbox messages to Redis queue '%s'",
        len(published_ids),
        REDIS_ANALYSES_QUEUE,
    )
    return len(published_ids)


async def run_dispatcher(
    interval_seconds: float = 0.5,
    stop_event: Optional[asyncio.Event] = None,
) -> None:
    """Daemon runner for outbox dispatcher process role."""
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    outbox_repo = OutboxRepository()

    logger.info("Outbox dispatcher process started, polling every %.1fs", interval_seconds)
    try:
        while stop_event is None or not stop_event.is_set():
            async with async_session_factory() as session:
                try:
                    await dispatch_pending_outbox_messages(
                        session=session,
                        redis_client=redis_client,
                        outbox_repo=outbox_repo,
                    )
                except Exception as e:
                    logger.error("Error during outbox dispatch: %s", str(e), exc_info=True)
                    await session.rollback()

            await asyncio.sleep(interval_seconds)
    finally:
        await redis_client.aclose()
        logger.info("Outbox dispatcher stopped.")


if __name__ == "__main__":
    logging.basicConfig(level=settings.LOG_LEVEL)
    # Each process role runs in its own container with its own Prometheus
    # client default registry — metrics recorded here are invisible from the
    # api container's /metrics endpoint unless this process exposes its own.
    from prometheus_client import start_http_server

    start_http_server(9101)
    asyncio.run(run_dispatcher())
