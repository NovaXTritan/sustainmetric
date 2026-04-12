"""Sustainmetric API — multimodal urban climate intelligence engine."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from routes import health, me, queries
from config import settings

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle."""
    logger.info("sustainmetric_api_starting", environment=settings.ENVIRONMENT)
    yield
    logger.info("sustainmetric_api_shutting_down")


app = FastAPI(
    title="Sustainmetric API",
    version="0.1.0",
    description="Multimodal urban climate intelligence engine for Indian cities",
    lifespan=lifespan,
)

# CORS — allow the Vercel frontend in all environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://sustainmetric.vercel.app",
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
