"""Upstash Redis client — REST-based, ideal for Cloud Run (no persistent TCP)."""

from __future__ import annotations

from functools import lru_cache

import structlog

from config import settings

logger = structlog.get_logger()


@lru_cache(maxsize=1)
def get_redis():
    """Return a cached Upstash Redis client. Returns None if not configured."""
    if not settings.UPSTASH_REDIS_REST_URL or not settings.UPSTASH_REDIS_REST_TOKEN:
        logger.warning(
            "upstash_redis_not_configured",
            hint="Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local",
        )
        return None

    from upstash_redis import Redis
    return Redis(
        url=settings.UPSTASH_REDIS_REST_URL,
        token=settings.UPSTASH_REDIS_REST_TOKEN,
    )


async def increment_query_counter(tenant_id: str) -> int:
    """Increment and return the monthly query count for a tenant.

    Returns 0 if Redis is not configured (allows graceful degradation).
    """
    redis = get_redis()
    if redis is None:
        return 0

    from datetime import datetime
    month_key = f"queries:{tenant_id}:{datetime.utcnow().strftime('%Y-%m')}"
    count = redis.incr(month_key)
    # Set TTL of 35 days on first increment so keys auto-expire
    if count == 1:
        redis.expire(month_key, 35 * 24 * 3600)
    return count


async def get_query_count(tenant_id: str) -> int:
    """Get current monthly query count for a tenant."""
    redis = get_redis()
    if redis is None:
        return 0

    from datetime import datetime
    month_key = f"queries:{tenant_id}:{datetime.utcnow().strftime('%Y-%m')}"
    val = redis.get(month_key)
    return int(val) if val else 0
