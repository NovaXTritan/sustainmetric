"""GET /me — returns the authenticated user's profile and tenant info.
POST /me/tier — best-effort tier write from the localStorage-primary selector."""

from fastapi import APIRouter, HTTPException, Request

from db.audit import audit_from_request
from db.client import get_supabase
from models.schemas import TierUpdateRequest  # noqa: TC001 — runtime for FastAPI

router = APIRouter()


@router.get("/me")
async def get_me(request: Request) -> dict:
    """Return the current user's profile and tenant info.

    If auth middleware is active, user context is in request.state.
    If not configured yet (dev mode), returns a helpful stub.
    """
    tenant_id = getattr(request.state, "tenant_id", None)
    user_id = getattr(request.state, "user_id", None)

    if not tenant_id or not user_id:
        return {
            "status": "unauthenticated",
            "message": (
                "Auth middleware not active. Configure SUPABASE_URL, "
                "SUPABASE_SERVICE_ROLE_KEY, and Firebase Auth to enable."
            ),
        }

    sb = get_supabase()

    user_result = sb.table("users").select("*").eq("id", str(user_id)).single().execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    tenant_result = (
        sb.table("tenants").select("*").eq("id", str(tenant_id)).single().execute()
    )

    await audit_from_request(request, action="get_me", resource_type="user")

    return {
        "user": {
            "id": user_result.data["id"],
            "firebase_uid": user_result.data["firebase_uid"],
            "tenant_id": user_result.data["tenant_id"],
            "email": user_result.data["email"],
            "display_name": user_result.data["display_name"],
            "role": user_result.data["role"],
        },
        "tenant": {
            "id": tenant_result.data["id"],
            "name": tenant_result.data["name"],
            "slug": tenant_result.data["slug"],
            "plan": tenant_result.data["plan"],
            "tier": tenant_result.data.get("tier", "corporate"),
            "monthly_query_quota": tenant_result.data["monthly_query_quota"],
        },
    }


@router.post("/me/tier")
async def set_me_tier(body: TierUpdateRequest, request: Request) -> dict:
    """Best-effort write of the user's chosen tier to tenants.tier.

    The frontend uses localStorage as the source of truth for the demo.
    This endpoint is a best-effort background persist — the frontend
    swallows any 401 or network error and does not block the UI.

    Returns 200 with the persisted tier if auth succeeds, or a 401-shaped
    response if no tenant_id is present. The frontend does not care either way.
    """
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(
            status_code=401,
            detail="Tier persisted to localStorage only (no authenticated tenant).",
        )

    sb = get_supabase()
    sb.table("tenants").update({"tier": body.tier.value}).eq("id", str(tenant_id)).execute()

    await audit_from_request(
        request,
        action="tier_updated",
        resource_type="tenant",
        resource_id=str(tenant_id),
    )

    return {"tier": body.tier.value, "persisted": True}
