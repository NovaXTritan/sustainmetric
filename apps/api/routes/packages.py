"""GET /packages — returns the three Sustainmetric execution packages.

Packages don't change between requests, so results are Upstash-cached
with a 1-hour TTL. Cache miss path reads from the intervention_packages
table seeded by migration 004.
"""
# NOTE: do NOT use 'from __future__ import annotations' here.
# FastAPI needs real types at runtime.

import json

import structlog
from fastapi import APIRouter, Request

from db.audit import audit_from_request
from db.client import get_supabase
from db.redis import get_redis

logger = structlog.get_logger()

router = APIRouter()

_CACHE_KEY = "packages:catalog:v1"
_CACHE_TTL_SECONDS = 3600


@router.get("/packages")
async def get_packages(request: Request) -> dict:
    """Return the three intervention packages. 1hr Upstash cache."""
    redis = get_redis()

    # Cache lookup
    if redis is not None:
        try:
            cached = redis.get(_CACHE_KEY)
            if cached:
                return {"packages": json.loads(cached), "cached": True}
        except Exception as e:
            logger.warning("packages_cache_get_failed", error=str(e))

    # Cache miss: read from DB
    sb = get_supabase()
    result = (
        sb.table("intervention_packages")
        .select("*")
        .order("id")
        .execute()
    )

    packages = [
        {
            "id": row["id"],
            "name": row["name"],
            "short_description": row["short_description"],
            "full_description": row["full_description"],
            "intervention_types": row["intervention_types"],
            "cost_per_sqm_min_inr": row["cost_per_sqm_min_inr"],
            "cost_per_sqm_max_inr": row["cost_per_sqm_max_inr"],
            "typical_timeline_months": row["typical_timeline_months"],
            "implementation_partner_type": row["implementation_partner_type"],
            "brsr_principle_6_coverage": row["brsr_principle_6_coverage"],
            "is_proprietary": row["is_proprietary"],
            "proprietary_notes": row.get("proprietary_notes"),
        }
        for row in (result.data or [])
    ]

    # Cache write (best effort)
    if redis is not None and packages:
        try:
            redis.set(_CACHE_KEY, json.dumps(packages), ex=_CACHE_TTL_SECONDS)
        except Exception as e:
            logger.warning("packages_cache_set_failed", error=str(e))

    await audit_from_request(request, action="list_packages", resource_type="package")

    return {"packages": packages, "cached": False}
