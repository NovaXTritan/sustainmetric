"""Audit log writer — FastAPI dependency injected into every protected endpoint."""

from __future__ import annotations

import structlog
from fastapi import Request

from db.client import get_supabase
from models.schemas import AuditLogCreate

logger = structlog.get_logger()


async def write_audit_log(entry: AuditLogCreate) -> None:
    """Insert one row into audit_log. Fire-and-forget — never blocks the response."""
    try:
        sb = get_supabase()
        sb.table("audit_log").insert(
            {
                "tenant_id": str(entry.tenant_id),
                "user_id": str(entry.user_id) if entry.user_id else None,
                "action": entry.action,
                "resource_type": entry.resource_type,
                "resource_id": str(entry.resource_id) if entry.resource_id else None,
                "request_method": entry.request_method,
                "request_path": entry.request_path,
                "request_body": entry.request_body,
                "response_status": entry.response_status,
                "ip_address": entry.ip_address,
                "user_agent": entry.user_agent,
            }
        ).execute()
    except Exception:
        logger.exception("audit_log_write_failed", entry=entry.model_dump())


async def audit_from_request(
    request: Request,
    action: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    response_status: int = 200,
) -> None:
    """Convenience wrapper that pulls tenant/user from request state."""
    tenant_id = getattr(request.state, "tenant_id", None)
    user_id = getattr(request.state, "user_id", None)
    if not tenant_id:
        return

    from uuid import UUID

    await write_audit_log(
        AuditLogCreate(
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            user_id=UUID(user_id) if isinstance(user_id, str) and user_id else None,
            action=action,
            resource_type=resource_type,
            resource_id=UUID(resource_id) if resource_id else None,
            request_method=request.method,
            request_path=str(request.url.path),
            request_body=None,  # Don't log request bodies by default for privacy
            response_status=response_status,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    )
