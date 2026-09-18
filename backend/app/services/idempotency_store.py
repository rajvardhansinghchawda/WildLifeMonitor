import hashlib
import json
import logging
import uuid
from typing import Any, Dict, Optional, cast

import redis.asyncio as redis

from app.core.config import settings
from app.core.exceptions import ConflictException
from app.core.metrics import CACHE_HITS_TOTAL, CACHE_MISSES_TOTAL

logger = logging.getLogger(__name__)


class IdempotencyStore:
    """Redis-backed idempotency store protecting request submission from duplicate client retries.

    Contract (dsabackendoptimisation.md):
    - Separate idempotency keys from scientific cache keys.
    - Idempotency key prefix: 'idem:{workspace_id}:{idempotency_key}'.
    - Scoped strictly per workspace.
    - Detects payload mismatch and raises 409 IDEMPOTENCYCONFLICT.
    """

    KEY_PREFIX = "idem"
    DEFAULT_TTL_SECONDS = 86400  # 24 hours

    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self._redis = redis_client

    def _get_redis(self) -> redis.Redis:
        if self._redis is not None:
            return self._redis
        return cast(redis.Redis, redis.from_url(settings.REDIS_URL, decode_responses=True))

    def _compute_payload_hash(self, payload: Dict[str, Any]) -> str:
        canonical_str = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    def _make_key(self, workspace_id: uuid.UUID, idempotency_key: str) -> str:
        return f"{self.KEY_PREFIX}:{workspace_id}:{idempotency_key}"

    async def get_or_reserve(
        self,
        workspace_id: uuid.UUID,
        idempotency_key: str,
        request_payload: Dict[str, Any],
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
        wait_timeout_sec: float = 5.0,
    ) -> Optional[Dict[str, Any]]:
        """Check for existing idempotent submission or reserve key.

        Returns:
        - Cached response dict if previously completed with identical payload (idempotent replay).
        - None if key is fresh and newly reserved.
        Raises:
        - ConflictException (409 IDEMPOTENCYCONFLICT) if key was used with a different payload.
        """
        import asyncio
        import time

        r = self._get_redis()
        key = self._make_key(workspace_id, idempotency_key)
        payload_hash = self._compute_payload_hash(request_payload)

        reservation = {
            "payload_hash": payload_hash,
            "status": "in_flight",
            "response": None,
        }

        start_time = time.time()
        while (time.time() - start_time) < wait_timeout_sec:
            # Try atomic reservation (SET NX)
            acquired = await r.set(
                key,
                json.dumps(reservation),
                nx=True,
                ex=ttl_seconds,
            )
            if acquired:
                # We won the race to reserve the key; caller should execute request
                CACHE_MISSES_TOTAL.labels(cache_type="idempotency").inc()
                return None

            # Key already exists: inspect status and payload hash
            raw = await r.get(key)
            if raw:
                try:
                    entry = json.loads(raw)
                    stored_hash = entry.get("payload_hash")
                    if stored_hash != payload_hash:
                        logger.warning(
                            "Idempotency conflict for key %s in workspace %s: hash mismatch",
                            idempotency_key,
                            workspace_id,
                        )
                        raise ConflictException(
                            error_code="IDEMPOTENCYCONFLICT",
                            message="Idempotency key was previously used with a different request payload.",
                            details={"idempotency_key": idempotency_key},
                        )

                    # If completed, return cached response
                    if entry.get("status") == "completed" and entry.get("response") is not None:
                        CACHE_HITS_TOTAL.labels(cache_type="idempotency").inc()
                        return cast(Optional[Dict[str, Any]], entry.get("response"))

                    # If still in flight, wait briefly and retry loop
                    await asyncio.sleep(0.05)
                except json.JSONDecodeError:
                    await asyncio.sleep(0.05)
            else:
                await asyncio.sleep(0.05)

        return None

    async def release(
        self,
        workspace_id: uuid.UUID,
        idempotency_key: str,
    ) -> None:
        """Release a reservation made by get_or_reserve without completing it.

        Must be called whenever a request that successfully reserved a key
        (get_or_reserve returned None) fails before save_response is reached
        (e.g. active-job-limit rejection, a mid-request error). Without this,
        the reservation would sit in Redis as permanently 'in_flight' for the
        full TTL, forcing every subsequent retry with the same key to block
        for wait_timeout_sec before it can proceed.
        """
        r = self._get_redis()
        key = self._make_key(workspace_id, idempotency_key)
        await r.delete(key)
        logger.info(
            "Released idempotency reservation for key %s in workspace %s",
            idempotency_key,
            workspace_id,
        )

    async def save_response(
        self,
        workspace_id: uuid.UUID,
        idempotency_key: str,
        request_payload: Dict[str, Any],
        response_data: Dict[str, Any],
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
    ) -> None:
        """Store accepted/completed submission response under idempotency key."""
        r = self._get_redis()
        key = self._make_key(workspace_id, idempotency_key)
        payload_hash = self._compute_payload_hash(request_payload)

        record = {
            "payload_hash": payload_hash,
            "status": "completed",
            "response": response_data,
        }
        await r.set(key, json.dumps(record), ex=ttl_seconds)
        logger.info(
            "Cached idempotent submission response for key %s in workspace %s (TTL=%ds)",
            idempotency_key,
            workspace_id,
            ttl_seconds,
        )
