"""Query endpoints — POST /queries, GET /queries/{id}, GET /queries/{id}/stream."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.post("/queries")
async def create_query() -> dict[str, str]:
    """Stub — will be wired to the data pipeline in Session 4."""
    return {"status": "stub", "message": "Query pipeline will be wired in Session 4"}
