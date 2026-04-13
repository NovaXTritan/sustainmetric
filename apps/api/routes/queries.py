"""Query endpoints — POST /queries, GET /queries/{id}, GET /queries/{id}/stream."""
# NOTE: do NOT use 'from __future__ import annotations' here.
# It breaks Pydantic model validation in FastAPI endpoint signatures.

import asyncio
import json
import math
from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from config import settings
from db.audit import audit_from_request
from db.client import get_supabase
from db.redis import get_query_count, increment_query_counter
from models.schemas import QueryCreate  # noqa: TC001 — needed at runtime for FastAPI

logger = structlog.get_logger()

router = APIRouter()

# Distance threshold for cache hits (meters)
CACHE_RADIUS_M = 100


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in meters between two points."""
    earth_radius_m = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return earth_radius_m * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _find_cached_query(sb, lat: float, lon: float, tenant_id: str) -> dict | None:
    """Find a completed query within CACHE_RADIUS_M using bbox filter + haversine.

    Uses a ±0.002 degree bbox (~220m at Delhi latitude) to prune the
    search space before precise haversine check. This avoids a full
    table scan as the query history grows.
    """
    # 100m cache radius → 0.001 degrees at Delhi; use 0.002 as safety buffer
    delta = 0.002
    result = (
        sb.table("queries")
        .select("*, query_outputs(*)")
        .eq("status", "completed")
        .eq("tenant_id", tenant_id)
        .gte("lat", lat - delta)
        .lte("lat", lat + delta)
        .gte("lon", lon - delta)
        .lte("lon", lon + delta)
        .limit(10)
        .execute()
    )
    for row in result.data or []:
        dist = _haversine_m(lat, lon, row["lat"], row["lon"])
        if dist <= CACHE_RADIUS_M and row.get("query_outputs"):
            return row
    return None


@router.post("/queries")
async def create_query(body: QueryCreate, request: Request) -> dict:
    """Create a new analysis query. Kicks off background data fetching + Gemini analysis."""
    tenant_id = getattr(request.state, "tenant_id", None)
    user_id = getattr(request.state, "user_id", None)

    if not tenant_id or not user_id:
        return {
            "status": "unauthenticated",
            "message": "Configure auth to create queries.",
        }

    # Cost guardrail: check tenant quota
    sb = get_supabase()
    tenant_result = (
        sb.table("tenants")
        .select("monthly_query_quota")
        .eq("id", str(tenant_id))
        .single()
        .execute()
    )
    quota = (
        tenant_result.data["monthly_query_quota"]
        if tenant_result.data
        else settings.DEFAULT_MONTHLY_QUERY_QUOTA
    )
    current_count = await get_query_count(str(tenant_id))
    if current_count >= quota:
        raise HTTPException(
            status_code=429,
            detail=f"Monthly query quota exceeded ({current_count}/{quota}). Upgrade your plan.",
        )

    # Check cache first
    cached = _find_cached_query(sb, body.lat, body.lon, str(tenant_id))
    if cached:
        # Return cached result
        sb.table("queries").update({"served_from_cache": True}).eq("id", cached["id"]).execute()
        await audit_from_request(
            request, action="query_cache_hit", resource_type="query", resource_id=cached["id"]
        )
        return {
            "id": cached["id"],
            "status": "completed",
            "lat": cached["lat"],
            "lon": cached["lon"],
            "served_from_cache": True,
            "created_at": cached["created_at"],
            "updated_at": cached["updated_at"],
        }

    # Create query row
    query_data = sb.table("queries").insert({
        "tenant_id": str(tenant_id),
        "user_id": str(user_id),
        "site_id": str(body.site_id) if body.site_id else None,
        "lat": body.lat,
        "lon": body.lon,
        "status": "pending",
    }).execute()
    query_row = query_data.data[0]
    query_id = query_row["id"]

    # Increment query counter
    await increment_query_counter(str(tenant_id))

    # Kick off background processing
    asyncio.create_task(_run_query_pipeline(query_id, str(tenant_id), body.lat, body.lon))

    await audit_from_request(
        request, action="query_created", resource_type="query", resource_id=query_id
    )

    return {
        "id": query_id,
        "status": "pending",
        "lat": body.lat,
        "lon": body.lon,
        "served_from_cache": False,
        "created_at": query_row["created_at"],
        "updated_at": query_row["updated_at"],
    }


@router.get("/queries/{query_id}")
async def get_query(query_id: str, request: Request) -> dict:
    """Poll query status and get results when completed."""
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        return {"status": "unauthenticated", "message": "Configure auth."}

    sb = get_supabase()
    result = (
        sb.table("queries")
        .select("*, query_outputs(*)")
        .eq("id", query_id)
        .eq("tenant_id", str(tenant_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Query not found")

    row = result.data
    response: dict = {
        "id": row["id"],
        "status": row["status"],
        "lat": row["lat"],
        "lon": row["lon"],
        "served_from_cache": row["served_from_cache"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }

    if row["status"] == "completed" and row.get("query_outputs"):
        output = (
            row["query_outputs"][0]
            if isinstance(row["query_outputs"], list)
            else row["query_outputs"]
        )
        response["output"] = {
            "id": output["id"],
            "model_used": output["model_used"],
            "cost_inr": output["cost_inr"],
            "analysis": output["validated_response"],
            "validation_warnings": output.get("validation_warnings", []),
            "cache_source": output.get("cache_source"),
            "created_at": output["created_at"],
        }

    if row["status"] == "failed":
        response["error"] = row.get("error_message")

    await audit_from_request(
        request, action="query_polled", resource_type="query", resource_id=query_id
    )

    return response


@router.get("/queries/{query_id}/stream")
async def stream_query(query_id: str, request: Request):
    """SSE endpoint that streams incremental updates as the query pipeline runs."""
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Configure auth.")

    sb = get_supabase()

    async def event_generator():
        """Poll query status and stream events."""
        last_status = None
        poll_count = 0
        max_polls = 60  # 60 * 0.5s = 30s max

        while poll_count < max_polls:
            result = (
                sb.table("queries")
                .select("*, query_inputs(*), query_outputs(*)")
                .eq("id", query_id)
                .eq("tenant_id", str(tenant_id))
                .single()
                .execute()
            )

            if not result.data:
                yield {"event": "error", "data": json.dumps({"message": "Query not found"})}
                return

            row = result.data
            status = row["status"]

            # Emit status change events
            if status != last_status:
                yield {
                    "event": "status",
                    "data": json.dumps({
                        "status": status,
                        "timestamp": datetime.now(UTC).isoformat(),
                    }),
                }
                last_status = status

            # Emit fetch completion events
            inputs = row.get("query_inputs", []) or []
            if isinstance(inputs, list):
                for inp in inputs:
                    yield {
                        "event": "fetch_complete",
                        "data": json.dumps({
                            "source": inp["source"],
                            "freshness_seconds": inp["freshness_seconds"],
                            "fetched_at": inp["fetched_at"],
                            "has_error": bool(inp.get("error")),
                        }),
                    }

            # If completed, emit the analysis
            if status == "completed":
                outputs = row.get("query_outputs", []) or []
                if outputs:
                    output = outputs[0] if isinstance(outputs, list) else outputs
                    yield {
                        "event": "analysis_complete",
                        "data": json.dumps({
                            "analysis": output["validated_response"],
                            "model_used": output["model_used"],
                            "validation_warnings": output.get("validation_warnings", []),
                        }),
                    }
                yield {"event": "done", "data": json.dumps({"query_id": query_id})}
                return

            if status == "failed":
                yield {
                    "event": "error",
                    "data": json.dumps({"message": row.get("error_message", "Unknown error")}),
                }
                return

            poll_count += 1
            await asyncio.sleep(0.5)

        yield {"event": "timeout", "data": json.dumps({"message": "Query processing timed out"})}

    return EventSourceResponse(event_generator())


async def _run_query_pipeline(query_id: str, tenant_id: str, lat: float, lon: float) -> None:
    """Background task: fan out to data fetchers, call Gemini, validate, persist.

    This is the core pipeline wired in Session 4 with real fetchers.
    """
    sb = get_supabase()
    try:
        # Update status to fetching_data
        sb.table("queries").update({"status": "fetching_data"}).eq("id", query_id).execute()

        # Session 3+4: Fan out to data fetchers
        from services.pipeline import run_fetchers_and_analyze

        await run_fetchers_and_analyze(query_id, tenant_id, lat, lon)

        # Update status to completed
        sb.table("queries").update({
            "status": "completed",
            "updated_at": datetime.now(UTC).isoformat(),
        }).eq("id", query_id).execute()

        logger.info("query_pipeline_completed", query_id=query_id)

    except Exception as e:
        logger.exception("query_pipeline_failed", query_id=query_id)
        sb.table("queries").update({
            "status": "failed",
            "error_message": str(e)[:500],
            "updated_at": datetime.now(UTC).isoformat(),
        }).eq("id", query_id).execute()
