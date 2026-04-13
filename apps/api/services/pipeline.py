"""Query pipeline orchestrator — fans out to fetchers, calls Gemini, validates, persists.

Session 2: Stub that returns placeholder data.
Session 3: Real data fetchers wired in.
Session 4: Gemini integration wired in.
"""

from __future__ import annotations

import asyncio

import structlog

from db.client import get_supabase

logger = structlog.get_logger()


async def run_fetchers_and_analyze(
    query_id: str,
    tenant_id: str,
    lat: float,
    lon: float,
) -> dict:
    """Execute the full query pipeline.

    1. Fan out to data fetchers in parallel
    2. Call Gemini with collected data
    3. Validate Gemini output
    4. Persist to query_outputs
    """
    sb = get_supabase()

    # Update status
    sb.table("queries").update({"status": "fetching_data"}).eq("id", query_id).execute()

    # ── Step 1: Fan out to data fetchers ──────────────────────
    from services.data_sources.firms import SurfaceConditionsFetcher
    from services.data_sources.mapillary import MapillaryFetcher
    from services.data_sources.nominatim import NominatimFetcher
    from services.data_sources.open_meteo import OpenMeteoFetcher
    from services.data_sources.openaq import OpenAQFetcher
    from services.data_sources.overpass import OverpassFetcher

    fetchers = [
        OpenMeteoFetcher(),
        OpenAQFetcher(),
        OverpassFetcher(),
        SurfaceConditionsFetcher(),
        MapillaryFetcher(),
        NominatimFetcher(),
    ]

    fetch_results = await asyncio.gather(
        *[_run_fetcher(f, query_id, tenant_id, lat, lon) for f in fetchers],
        return_exceptions=True,
    )

    # Collect successful results
    collected_data = {}
    for result in fetch_results:
        if isinstance(result, dict):
            collected_data[result["source"]] = result
        elif isinstance(result, Exception):
            logger.warning("fetcher_failed", error=str(result), query_id=query_id)

    # ── Step 2: Update status to processing ───────────────────
    sb.table("queries").update({"status": "processing"}).eq("id", query_id).execute()

    # ── Step 3: Call Gemini ────────────────────────────────────
    from services.gemini import analyze_with_gemini

    gemini_result = await analyze_with_gemini(lat, lon, collected_data)

    # ── Step 4: Validate ──────────────────────────────────────
    from services.validation import validate_analysis

    validated, warnings = validate_analysis(gemini_result)

    # ── Step 5: Persist to query_outputs ──────────────────────
    sb.table("query_outputs").insert({
        "query_id": query_id,
        "tenant_id": tenant_id,
        "model_used": "gemini-2.5-flash-lite",
        "prompt_tokens": gemini_result.get("usage", {}).get("prompt_tokens", 0),
        "completion_tokens": gemini_result.get("usage", {}).get("completion_tokens", 0),
        "cost_inr": 0,  # Free tier
        "raw_response": gemini_result.get("raw", {}),
        "validated_response": validated,
        "validation_warnings": warnings,
    }).execute()

    return {"status": "completed", "query_id": query_id}


async def _run_fetcher(fetcher, query_id: str, tenant_id: str, lat: float, lon: float) -> dict:
    """Run a single fetcher with 25-second timeout, persist to query_inputs."""
    sb = get_supabase()
    source = fetcher.__class__.__name__

    try:
        result = await asyncio.wait_for(fetcher.fetch(lat, lon), timeout=12.0)

        # Store summary inside the JSONB data field so we don't need a new column
        data_with_summary = {**result.data, "_summary": result.summary}

        sb.table("query_inputs").insert({
            "query_id": query_id,
            "tenant_id": tenant_id,
            "source": result.source,
            "data": data_with_summary,
            "source_url": result.source_url,
            "fetched_at": result.fetched_at.isoformat(),
            "freshness_seconds": result.freshness_seconds,
            "error": result.error,
        }).execute()

        return {
            "source": result.source,
            "data": result.data,
            "freshness_seconds": result.freshness_seconds,
            "summary": result.summary,
        }

    except TimeoutError:
        logger.warning("fetcher_timeout", source=source, query_id=query_id)
        sb.table("query_inputs").insert({
            "query_id": query_id,
            "tenant_id": tenant_id,
            "source": source,
            "data": {},
            "error": "Timeout after 12 seconds",
            "freshness_seconds": 0,
        }).execute()
        return {"source": source, "data": {}, "error": "timeout"}

    except Exception as e:
        logger.exception("fetcher_error", source=source, query_id=query_id)
        sb.table("query_inputs").insert({
            "query_id": query_id,
            "tenant_id": tenant_id,
            "source": source,
            "data": {},
            "error": str(e)[:500],
            "freshness_seconds": 0,
        }).execute()
        return {"source": source, "data": {}, "error": str(e)}
