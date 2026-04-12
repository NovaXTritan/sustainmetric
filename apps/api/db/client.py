"""Supabase client singleton for the FastAPI backend.

Uses the service_role key which bypasses RLS — tenant isolation
is enforced in application code via the auth middleware.
"""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from config import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Return a cached Supabase client. Service role key bypasses RLS."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. "
            "Create a free project at https://supabase.com and paste credentials into .env.local"
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
