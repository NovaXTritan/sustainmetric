"""Sustainmetric API — multimodal urban climate intelligence engine."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes import health, me, packages, projects, queries

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle."""
    logger.info("sustainmetric_api_starting", environment=settings.ENVIRONMENT)
    yield
    logger.info("sustainmetric_api_shutting_down")


app = FastAPI(
    title="Sustainmetric API",
    version="0.2.0",
    description="Multimodal urban climate intelligence engine for Indian cities",
    lifespan=lifespan,
)

# CORS — allow all expected frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://sustainmetric.web.app",
        "https://sustainmetric.firebaseapp.com",
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth middleware — always active. Uses Firebase tokens if available,
# falls back to demo tenant/user for unauthenticated requests.
from middleware.auth import FirebaseAuthMiddleware  # noqa: E402

app.add_middleware(FirebaseAuthMiddleware)


@app.middleware("http")
async def add_timing_header(request: Request, call_next: object) -> Response:
    """Add X-Process-Time header to every response for observability."""
    start = time.perf_counter()
    response: Response = await call_next(request)  # type: ignore[assignment]
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(elapsed_ms)
    return response


# Register route modules
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(me.router, prefix="/api/v1", tags=["me"])
app.include_router(queries.router, prefix="/api/v1", tags=["queries"])
app.include_router(packages.router, prefix="/api/v1", tags=["packages"])
app.include_router(projects.router, prefix="/api/v1", tags=["projects"])
