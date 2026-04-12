"""GET /me — returns the authenticated user's profile and tenant info."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/me")
async def get_me() -> dict[str, str]:
    """Stub — will be wired to Clerk JWT validation in Session 2."""
    return {"status": "stub", "message": "Auth will be wired in Session 2"}
