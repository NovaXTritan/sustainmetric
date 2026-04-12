"""Health check endpoint — UptimeRobot pings this every 5 minutes."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Return 200 immediately. No DB call, no auth, no audit log write.
    This exists solely to keep Render's free tier from spinning down."""
    return {"status": "healthy", "service": "sustainmetric-api"}
