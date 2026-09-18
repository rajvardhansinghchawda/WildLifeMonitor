import asyncio
import logging
import random
import time
import uuid
from typing import Any, Callable, Coroutine, Dict, Optional, TypeVar, cast

import redis.asyncio as redis

from app.core.config import settings
from app.core.exceptions import AppException

logger = logging.getLogger(__name__)

T = TypeVar("T")

NON_RETRYABLE_ERROR_CODES = {
    "INVALIDCREDENTIALS",
    "INVALIDGEOMETRY",
    "UNSUPPORTEDCOVERAGE",
    "UNSUPPORTEDGEOMETRY",
    "AOITOOLARGE",
    "TOOMANYVERTICES",
    "INVALIDDATERANGE",
}


class RateLimiterTimeoutError(Exception):
    """Raised when acquiring a provider execution lease times out."""

    pass


class ProviderRateLimiter:
    """Deployment-wide Redis-backed concurrency and rate limiter for geospatial providers.

    Contract (dsabackendoptimisation.md & rules.md):
    - Deployment-wide coordination across all worker processes via Redis.
    - Distributed semaphore tracking active concurrency per provider.
    - Shared token-refresh lock to prevent token-refresh storms.
    - Exponential backoff with random jitter.
    - Honors Retry-After headers.
    - Strictly avoids retrying non-retryable errors (invalid credentials, invalid geometry, unsupported coverage).
    - Reduces concurrency rather than increasing retry aggressiveness under sustained throttles.
    """

    KEY_PREFIX = "ratelimit"
    DEFAULT_LEASE_TIMEOUT_SEC = 30
    DEFAULT_CONCURRENCY_LIMIT = 5

    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self._redis = redis_client

    def _get_redis(self) -> redis.Redis:
        if self._redis is not None:
            return self._redis
        return cast(redis.Redis, redis.from_url(settings.REDIS_URL, decode_responses=True))

    def _semaphore_key(self, provider_name: str) -> str:
        return f"{self.KEY_PREFIX}:sem:{provider_name}"

    def _refresh_lock_key(self, provider_name: str) -> str:
        return f"{self.KEY_PREFIX}:refresh_lock:{provider_name}"

    async def acquire_lease(
        self,
        provider_name: str,
        max_concurrent: int = DEFAULT_CONCURRENCY_LIMIT,
        lease_timeout_sec: int = DEFAULT_LEASE_TIMEOUT_SEC,
        wait_timeout_sec: float = 10.0,
    ) -> str:
        """Acquire a slot from the provider's distributed semaphore in Redis.

        Returns a unique lease ID upon success.
        Raises RateLimiterTimeoutError if timeout expires before slot is free.
        """
        r = self._get_redis()
        sem_key = self._semaphore_key(provider_name)
        lease_id = f"{uuid.uuid4().hex[:12]}:{time.time()}"
        start_time = time.time()

        while (time.time() - start_time) < wait_timeout_sec:
            now = time.time()
            # Clean up expired leases
            await r.zremrangebyscore(sem_key, "-inf", now)

            current_count = await r.zcard(sem_key)
            if current_count < max_concurrent:
                expiry = now + lease_timeout_sec
                added = await r.zadd(sem_key, {lease_id: expiry})
                if added:
                    logger.debug(
                        "Acquired lease %s for provider '%s' (concurrency=%d/%d)",
                        lease_id,
                        provider_name,
                        current_count + 1,
                        max_concurrent,
                    )
                    return lease_id

            # Brief pause with jitter to prevent thundering herd
            await asyncio.sleep(0.1 + random.uniform(0.05, 0.15))

        raise RateLimiterTimeoutError(
            f"Timed out after {wait_timeout_sec}s waiting for execution slot on provider '{provider_name}'."
        )

    async def release_lease(self, provider_name: str, lease_id: str) -> None:
        """Release a previously acquired lease slot."""
        r = self._get_redis()
        sem_key = self._semaphore_key(provider_name)
        await r.zrem(sem_key, lease_id)
        logger.debug("Released lease %s for provider '%s'", lease_id, provider_name)

    async def acquire_token_refresh_lock(
        self,
        provider_name: str,
        lock_ttl_sec: int = 15,
    ) -> bool:
        """Attempt to acquire a shared lock for provider OAuth/token refresh.

        Guarantees that only ONE worker executes credential refresh at a time,
        preventing token-refresh storms.
        """
        r = self._get_redis()
        lock_key = self._refresh_lock_key(provider_name)
        # Redis SET NX EX
        acquired = await r.set(lock_key, "locked", nx=True, ex=lock_ttl_sec)
        return bool(acquired)

    async def release_token_refresh_lock(self, provider_name: str) -> None:
        """Release the token refresh lock."""
        r = self._get_redis()
        lock_key = self._refresh_lock_key(provider_name)
        await r.delete(lock_key)

    async def execute_with_retry_and_rate_limit(
        self,
        provider_name: str,
        operation: Callable[[], Coroutine[Any, Any, T]],
        max_retries: int = 3,
        initial_backoff_sec: float = 0.5,
        max_backoff_sec: float = 8.0,
        max_concurrent: int = DEFAULT_CONCURRENCY_LIMIT,
    ) -> T:
        """Execute operation wrapped in distributed concurrency lease and exponential backoff.

        Invariants:
        - Non-retryable errors are raised immediately without retry.
        - Backoff applies exponential scale + uniform jitter.
        - Honors retry_after if available on exception.
        """
        attempt = 0
        while True:
            lease_id: Optional[str] = None
            try:
                lease_id = await self.acquire_lease(
                    provider_name=provider_name,
                    max_concurrent=max_concurrent,
                )
                return await operation()
            except AppException as app_err:
                # Check error code against non-retryable list
                if app_err.error_code in NON_RETRYABLE_ERROR_CODES or not getattr(
                    app_err, "retryable", False
                ):
                    logger.info(
                        "Encountered non-retryable error '%s' on provider '%s'; not retrying.",
                        app_err.error_code,
                        provider_name,
                    )
                    raise

                attempt += 1
                if attempt > max_retries:
                    logger.error(
                        "Max retries (%d) exhausted for provider '%s': %s",
                        max_retries,
                        provider_name,
                        app_err.message,
                    )
                    raise

                # Check for Retry-After hint
                retry_after: Optional[float] = None
                if isinstance(app_err.details, dict):
                    retry_after = app_err.details.get("retry_after")

                if retry_after is not None:
                    sleep_time = float(retry_after)
                else:
                    exp_delay = min(max_backoff_sec, initial_backoff_sec * (2 ** (attempt - 1)))
                    sleep_time = exp_delay + random.uniform(0.0, 0.5 * exp_delay)

                logger.warning(
                    "Retryable error on provider '%s' (attempt %d/%d). Sleeping %.2fs before retry: %s",
                    provider_name,
                    attempt,
                    max_retries,
                    sleep_time,
                    app_err.message,
                )
                await asyncio.sleep(sleep_time)

            except Exception as e:
                attempt += 1
                if attempt > max_retries:
                    raise

                exp_delay = min(max_backoff_sec, initial_backoff_sec * (2 ** (attempt - 1)))
                sleep_time = exp_delay + random.uniform(0.0, 0.5 * exp_delay)
                logger.warning(
                    "Unexpected error on provider '%s' (attempt %d/%d). Sleeping %.2fs: %s",
                    provider_name,
                    attempt,
                    max_retries,
                    sleep_time,
                    str(e),
                )
                await asyncio.sleep(sleep_time)

            finally:
                if lease_id:
                    await self.release_lease(provider_name, lease_id)
