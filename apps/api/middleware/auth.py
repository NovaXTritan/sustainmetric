"""Firebase Auth middleware — verifies ID tokens and attaches user context.

Flow:
1. Extract Bearer token from Authorization header
2. Verify with Firebase Admin SDK (checks signature, expiry, audience)
3. Look up user in Supabase by firebase_uid
4. If first login, auto-provision tenant + user (self-registration)
5. Attach tenant_id, user_id, email to request.state
"""

from __future__ import annotations

import structlog
from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

logger = structlog.get_logger()

# Firebase Admin is initialized lazily on first use
_firebase_initialized = False


def _ensure_firebase_init() -> None:
    """Initialize Firebase Admin SDK once."""
    global _firebase_initialized
    if _firebase_initialized:
        return
    import firebase_admin  # type: ignore[import-untyped]
    if not firebase_admin._apps:
        # Uses GOOGLE_APPLICATION_CREDENTIALS env var or defaults to
        # Application Default Credentials on Cloud Run
        firebase_admin.initialize_app()
    _firebase_initialized = True


def _verify_token(token: str) -> dict:
    """Verify a Firebase ID token and return decoded claims."""
    _ensure_firebase_init()
    from firebase_admin import auth  # type: ignore[import-untyped]
    return auth.verify_id_token(token)


# Paths that skip auth
PUBLIC_PATHS = {
    "/api/v1/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}


class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    """Verify Firebase ID token on every request except public paths."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path.rstrip("/")

        # Skip auth for public endpoints and OPTIONS (CORS preflight)
        if path in PUBLIC_PATHS or request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

        token = auth_header.split("Bearer ", 1)[1]
        try:
            decoded = _verify_token(token)
        except Exception as e:
            logger.warning("firebase_token_verification_failed", error=str(e))
            raise HTTPException(status_code=401, detail="Invalid or expired token") from e

        firebase_uid: str = decoded["uid"]
        email: str = decoded.get("email", "")

        # Look up or auto-provision user in Supabase
        try:
            user_row, tenant_row = await _get_or_create_user(firebase_uid, email)
        except Exception as e:
            logger.exception("user_lookup_failed", firebase_uid=firebase_uid)
            raise HTTPException(status_code=500, detail="User provisioning failed") from e

        # Attach to request state for downstream handlers
        request.state.tenant_id = user_row["tenant_id"]
        request.state.user_id = user_row["id"]
        request.state.firebase_uid = firebase_uid
        request.state.email = email
        request.state.role = user_row["role"]

        return await call_next(request)


async def _get_or_create_user(firebase_uid: str, email: str) -> tuple[dict, dict]:
    """Lookup user by firebase_uid. Auto-create tenant + user on first login."""
    from db.client import get_supabase

    sb = get_supabase()

    # Try to find existing user
    result = sb.table("users").select("*").eq("firebase_uid", firebase_uid).execute()
    if result.data:
        user_row = result.data[0]
        tenant_result = sb.table("tenants").select("*").eq("id", user_row["tenant_id"]).execute()
        return user_row, tenant_result.data[0]

    # Auto-provision: create tenant, then user
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
        "role": "admin",  # First user in a tenant is admin
    }).execute()

    logger.info(
        "auto_provisioned_user",
        firebase_uid=firebase_uid,
        tenant_id=tenant_row["id"],
        email=email,
    )

    return user_data.data[0], tenant_row
