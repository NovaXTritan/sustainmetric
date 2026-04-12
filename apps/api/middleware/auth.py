"""Auth middleware — verifies tokens or falls back to demo mode.

Production: Firebase ID tokens verified, user/tenant from DB.
Demo mode: No token required, requests use the pre-seeded demo
tenant and user so judges can use the app without signing up.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import structlog
from starlette.middleware.base import (
    BaseHTTPMiddleware,
    RequestResponseEndpoint,
)
from starlette.responses import JSONResponse

if TYPE_CHECKING:
    from fastapi import Request
    from starlette.responses import Response

logger = structlog.get_logger()

# Pre-seeded demo tenant/user IDs (from migration seed)
DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001"
DEMO_USER_ID = "00000000-0000-0000-0000-000000000002"

_firebase_initialized = False
_firebase_available = False

PUBLIC_PATHS = {
    "/api/v1/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}


def _try_firebase_init() -> bool:
    """Try to initialize Firebase Admin SDK. Returns True if successful."""
    global _firebase_initialized, _firebase_available
    if _firebase_initialized:
        return _firebase_available
    _firebase_initialized = True
    try:
        import firebase_admin  # type: ignore[import-untyped]
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        _firebase_available = True
    except Exception as e:
        logger.info("firebase_not_available", error=str(e))
        _firebase_available = False
    return _firebase_available


class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    """Auth middleware with automatic demo fallback.

    If a Bearer token is present and Firebase is configured,
    verifies the token and loads the real user.
    Otherwise, assigns the demo tenant/user so the full
    pipeline works without authentication.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint,
    ) -> Response:
        path = request.url.path.rstrip("/")

        if path in PUBLIC_PATHS or request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        has_token = auth_header.startswith("Bearer ")
        firebase_ok = _try_firebase_init()

        if has_token and firebase_ok:
            # Real auth flow
            token = auth_header.split("Bearer ", 1)[1]
            try:
                from firebase_admin import auth  # type: ignore[import-untyped]
                decoded = auth.verify_id_token(token)
            except Exception as e:
                logger.warning("token_verify_failed", error=str(e))
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or expired token"},
                )

            firebase_uid: str = decoded["uid"]
            email: str = decoded.get("email", "")

            try:
                user_row, _ = await _get_or_create_user(
                    firebase_uid, email,
                )
                request.state.tenant_id = user_row["tenant_id"]
                request.state.user_id = user_row["id"]
                request.state.email = email
                request.state.role = user_row["role"]
            except Exception:
                logger.exception("user_provision_failed")
                return JSONResponse(
                    status_code=500,
                    content={"detail": "User provisioning failed"},
                )
        else:
            # Demo mode — assign pre-seeded demo tenant/user
            request.state.tenant_id = DEMO_TENANT_ID
            request.state.user_id = DEMO_USER_ID
            request.state.email = "demo@sustainmetric.app"
            request.state.role = "admin"

        return await call_next(request)


async def _get_or_create_user(
    firebase_uid: str, email: str,
) -> tuple[dict, dict]:
    """Lookup user by firebase_uid. Auto-create on first login."""
    from db.client import get_supabase

    sb = get_supabase()
    result = (
        sb.table("users")
        .select("*")
        .eq("firebase_uid", firebase_uid)
        .execute()
    )
    if result.data:
        user_row = result.data[0]
        tenant_result = (
            sb.table("tenants")
            .select("*")
            .eq("id", user_row["tenant_id"])
            .execute()
        )
        return user_row, tenant_result.data[0]

    slug = email.split("@")[0].lower().replace(".", "-")
    tenant_data = sb.table("tenants").insert({
        "name": f"{slug}'s Organization",
        "slug": slug,
    }).execute()
    tenant_row = tenant_data.data[0]

    user_data = sb.table("users").insert({
        "firebase_uid": firebase_uid,
        "tenant_id": tenant_row["id"],
        "email": email,
        "display_name": email.split("@")[0],
        "role": "admin",
    }).execute()

    return user_data.data[0], tenant_row
