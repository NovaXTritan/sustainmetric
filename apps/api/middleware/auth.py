"""Auth middleware — verifies tokens and attaches user context.

Currently operates in two modes:
- Firebase Auth mode: when Firebase Admin SDK can initialize
- Passthrough mode: when Firebase is not configured, allows
  unauthenticated access with no tenant context (for demo/dev)
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

_firebase_initialized = False
_firebase_available = False


def _ensure_firebase_init() -> bool:
    """Initialize Firebase Admin SDK once. Returns True if successful."""
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
        logger.warning(
            "firebase_admin_init_failed",
            error=str(e),
            hint="Running in passthrough auth mode",
        )
        _firebase_available = False
    return _firebase_available


def _verify_token(token: str) -> dict:
    """Verify a Firebase ID token and return decoded claims."""
    from firebase_admin import auth  # type: ignore[import-untyped]
    return auth.verify_id_token(token)


PUBLIC_PATHS = {
    "/api/v1/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}


class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    """Verify Firebase ID token on every request except public paths.

    Note: uses JSONResponse instead of HTTPException because
    Starlette BaseHTTPMiddleware doesn't propagate HTTPException
    to FastAPI's exception handlers properly.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint,
    ) -> Response:
        path = request.url.path.rstrip("/")

        if path in PUBLIC_PATHS or request.method == "OPTIONS":
            return await call_next(request)

        firebase_ok = _ensure_firebase_init()

        auth_header = request.headers.get("authorization", "")
        has_token = auth_header.startswith("Bearer ")

        if has_token and firebase_ok:
            token = auth_header.split("Bearer ", 1)[1]
            try:
                decoded = _verify_token(token)
            except Exception as e:
                logger.warning(
                    "firebase_token_verification_failed",
                    error=str(e),
                )
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or expired token"},
                )

            firebase_uid: str = decoded["uid"]
            email: str = decoded.get("email", "")

            try:
                user_row, tenant_row = await _get_or_create_user(
                    firebase_uid, email,
                )
            except Exception:
                logger.exception(
                    "user_lookup_failed",
                    firebase_uid=firebase_uid,
                )
                return JSONResponse(
                    status_code=500,
                    content={"detail": "User provisioning failed"},
                )

            request.state.tenant_id = user_row["tenant_id"]
            request.state.user_id = user_row["id"]
            request.state.firebase_uid = firebase_uid
            request.state.email = email
            request.state.role = user_row["role"]

        elif not firebase_ok:
            # Passthrough — no auth available
            logger.debug("auth_passthrough", path=path)

        else:
            # Firebase configured but no token
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing Authorization header"},
            )

        return await call_next(request)


async def _get_or_create_user(
    firebase_uid: str, email: str,
) -> tuple[dict, dict]:
    """Lookup user by firebase_uid. Auto-create tenant + user."""
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

    logger.info(
        "auto_provisioned_user",
        firebase_uid=firebase_uid,
        tenant_id=tenant_row["id"],
        email=email,
    )

    return user_data.data[0], tenant_row
