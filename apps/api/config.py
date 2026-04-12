"""Application configuration loaded from environment variables."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central config — loaded from .env.local or environment variables."""

    # Environment
    ENVIRONMENT: str = "development"

    # Frontend URL for CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Clerk auth
    CLERK_PUBLISHABLE_KEY: str = ""
    CLERK_SECRET_KEY: str = ""
    CLERK_JWKS_URL: str = ""

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Sentinel Hub
    SENTINEL_HUB_CLIENT_ID: str = ""
    SENTINEL_HUB_CLIENT_SECRET: str = ""

    # Mapillary
    MAPILLARY_TOKEN: str = ""

    # Mapbox (used for frontend but backend may need for static tiles)
    MAPBOX_TOKEN: str = ""

    # Upstash Redis
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""

    # Sentry (Session 7)
    SENTRY_DSN_BACKEND: str = ""

    # Axiom (Session 7)
    AXIOM_TOKEN: str = ""
    AXIOM_DATASET: str = ""

    # Rate limits
    DEFAULT_MONTHLY_QUERY_QUOTA: int = 5000
    FREE_TIER_MONTHLY_QUERY_QUOTA: int = 50

    model_config = {"env_file": ".env.local", "env_file_encoding": "utf-8"}


settings = Settings()
