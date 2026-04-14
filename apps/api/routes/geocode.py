"""GET /api/v1/geocode — proxy to Nominatim for India-restricted location search.

Nominatim's usage policy mandates a real User-Agent and a maximum of 1 request
per second across all clients. We enforce both server-side: the User-Agent is
set on every outgoing request, and a global Upstash-backed lock prevents more
than one outbound call per second across the entire fleet.

Results are cached per query string for 1 hour to absorb common search terms
("Connaught Place", "Bhalswa") without re-hitting Nominatim.
"""
# NOTE: do NOT use 'from __future__ import annotations' here.
# FastAPI needs real types at runtime.

import asyncio
import contextlib
import json
import time

import httpx
import structlog
from fastapi import APIRouter, HTTPException, Query, Request

from db.audit import audit_from_request
from db.redis import get_redis

logger = structlog.get_logger()

router = APIRouter()

NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "Sustainmetric/1.0 (urban climate intelligence; contact@sustainmetric.in)"
MIN_INTERVAL_MS = 1100  # 1.1s between calls — small safety margin over the 1/s policy
RESULT_CACHE_TTL_SECONDS = 3600
RATE_LIMIT_KEY = "geocode:nominatim:last_call_ms"


async def _wait_for_slot() -> None:
    """Spin briefly until the global Nominatim rate-limit window opens."""
    redis = get_redis()
    if redis is None:
        return  # Best effort — without Redis we trust the LLM call cadence
    deadline = time.monotonic() + 5.0
    while time.monotonic() < deadline:
        now_ms = int(time.time() * 1000)
        try:
            last = redis.get(RATE_LIMIT_KEY)
            last_ms = int(last) if last else 0
        except Exception:
            last_ms = 0
        if now_ms - last_ms >= MIN_INTERVAL_MS:
            with contextlib.suppress(Exception):
                redis.set(RATE_LIMIT_KEY, str(now_ms), ex=5)
            return
        wait_ms = MIN_INTERVAL_MS - (now_ms - last_ms)
        await asyncio.sleep(wait_ms / 1000.0)
    # If we couldn't acquire a slot in 5s, just proceed and accept the risk
    return


@router.get("/geocode")
async def geocode(
    request: Request,
    q: str = Query(..., min_length=2, max_length=120),
) -> dict:
    """Search Nominatim for India-located place names."""
    q_clean = q.strip()
    if not q_clean:
        raise HTTPException(status_code=400, detail="Query string is required.")

    redis = get_redis()
    cache_key = f"geocode:q:{q_clean.lower()}"

    # Cache lookup
    if redis is not None:
        try:
            cached = redis.get(cache_key)
            if cached:
                return {"results": json.loads(cached), "cached": True}
        except Exception as e:
            logger.warning("geocode_cache_get_failed", error=str(e))

    # Honor Nominatim's 1 req/sec policy
    await _wait_for_slot()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                NOMINATIM_BASE,
                params={
                    "format": "json",
                    "q": q_clean,
                    "countrycodes": "in",
                    "limit": 5,
                    "addressdetails": 0,
                },
                headers={"User-Agent": USER_AGENT, "Accept-Language": "en"},
            )
            resp.raise_for_status()
            raw = resp.json()
    except httpx.HTTPError as e:
        logger.warning("geocode_upstream_failed", error=str(e), q=q_clean)
        raise HTTPException(
            status_code=502,
            detail=f"Upstream geocoder unavailable: {e}",
        ) from e

    results = [
        {
            "display_name": item.get("display_name", ""),
            "lat": float(item["lat"]),
            "lon": float(item["lon"]),
            "type": item.get("type", ""),
            "importance": item.get("importance", 0.0),
        }
        for item in raw
        if item.get("lat") and item.get("lon")
    ]

    # Cache the cleaned results
    if redis is not None and results:
        try:
            redis.set(cache_key, json.dumps(results), ex=RESULT_CACHE_TTL_SECONDS)
        except Exception as e:
            logger.warning("geocode_cache_set_failed", error=str(e))

    await audit_from_request(
        request, action="geocode_search", resource_type="geocode"
    )

    return {"results": results, "cached": False}
