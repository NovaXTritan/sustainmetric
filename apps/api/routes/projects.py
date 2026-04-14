"""POST /api/v1/projects — simulated commit-funding flow.

This is the architectural heart of the demo: a judge clicks COMMIT FUNDING on
the top-ranked intervention and sees the 10% platform fee calculation + BRSR
Principle 6 preview materialize in a modal. The commit row is written to the
real projects table with is_demo_commitment=true — no money moves.
"""
# NOTE: do NOT use 'from __future__ import annotations' here.
# FastAPI needs real types at runtime for request body validation.

import structlog
from fastapi import APIRouter, HTTPException, Request

from db.audit import audit_from_request
from db.client import get_supabase
from models.schemas import CommitRequest  # noqa: TC001 — runtime for FastAPI

logger = structlog.get_logger()

router = APIRouter()

PLATFORM_FEE_PERCENT = 10


@router.post("/projects")
async def commit_project(body: CommitRequest, request: Request) -> dict:
    """Simulate a funding commitment against a package for a query's ranked intervention.

    Flow: resolve query + package → compute 10% platform fee → INSERT projects
    row with is_demo_commitment=true → return project + BRSR Principle 6 preview.
    """
    tenant_id = getattr(request.state, "tenant_id", None)
    user_id = getattr(request.state, "user_id", None)

    if not tenant_id:
        raise HTTPException(
            status_code=401,
            detail="Auth required to record a commit. Configure Firebase Auth.",
        )

    sb = get_supabase()

    # 1. Verify the query exists and belongs to the tenant
    query_result = (
        sb.table("queries")
        .select("id, lat, lon, tenant_id, status")
        .eq("id", str(body.query_id))
        .eq("tenant_id", str(tenant_id))
        .single()
        .execute()
    )
    if not query_result.data:
        raise HTTPException(status_code=404, detail="Query not found for this tenant.")
    if query_result.data["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot commit against a query in status '{query_result.data['status']}'.",
        )

    # 2. Resolve the package
    package_result = (
        sb.table("intervention_packages")
        .select("*")
        .eq("id", body.package_id.value)
        .single()
        .execute()
    )
    if not package_result.data:
        raise HTTPException(status_code=404, detail=f"Package {body.package_id.value} not found.")
    pkg = package_result.data

    # 3. Fetch tenant tier for customer_tier column
    tenant_result = (
        sb.table("tenants").select("tier").eq("id", str(tenant_id)).single().execute()
    )
    customer_tier = (
        tenant_result.data.get("tier", "corporate") if tenant_result.data else "corporate"
    )

    # 4. Compute platform fee
    platform_fee_inr = body.committed_amount_inr * PLATFORM_FEE_PERCENT // 100
    execution_partner_amount_inr = body.committed_amount_inr - platform_fee_inr

    # 5. Insert project row
    project_name = (
        f"Commit · {pkg['name']} · "
        f"{query_result.data['lat']:.4f},{query_result.data['lon']:.4f}"
    )
    insert_result = (
        sb.table("projects")
        .insert({
            "tenant_id": str(tenant_id),
            "name": project_name,
            "description": (
                f"Demo commitment against {pkg['name']}. "
                f"₹{body.committed_amount_inr:,} committed "
                f"(platform fee ₹{platform_fee_inr:,}, "
                f"execution partner ₹{execution_partner_amount_inr:,})."
            ),
            "status": "active",
            "package_id": body.package_id.value,
            "committed_amount_inr": body.committed_amount_inr,
            "platform_fee_inr": platform_fee_inr,
            "is_demo_commitment": True,
            "customer_tier": customer_tier,
            "query_id": str(body.query_id),
            "intervention_option_index": body.intervention_option_index,
            "estimated_area_sqm": body.estimated_area_sqm,
        })
        .execute()
    )
    if not insert_result.data:
        raise HTTPException(status_code=500, detail="Failed to persist commitment.")
    project_row = insert_result.data[0]

    # 6. Build BRSR Principle 6 preview from the package's coverage array
    brsr_preview = _build_brsr_preview(
        pkg["brsr_principle_6_coverage"],
        pkg["name"],
        body.committed_amount_inr,
        body.estimated_area_sqm,
    )

    # 7. Audit log
    await audit_from_request(
        request,
        action="commit_funding_demo",
        resource_type="project",
        resource_id=project_row["id"],
    )

    logger.info(
        "commit_funding_demo",
        project_id=project_row["id"],
        tenant_id=str(tenant_id),
        user_id=str(user_id) if user_id else None,
        package_id=body.package_id.value,
        committed_inr=body.committed_amount_inr,
    )

    return {
        "project_id": project_row["id"],
        "query_id": str(body.query_id),
        "package_id": pkg["id"],
        "package_name": pkg["name"],
        "committed_amount_inr": body.committed_amount_inr,
        "platform_fee_inr": platform_fee_inr,
        "execution_partner_amount_inr": execution_partner_amount_inr,
        "is_demo_commitment": True,
        "brsr_preview": brsr_preview,
        "implementation_partner_type": pkg["implementation_partner_type"],
        "created_at": project_row["created_at"],
    }


def _build_brsr_preview(
    coverage: list[str],
    package_name: str,
    committed_inr: int,
    area_sqm: int,
) -> list[str]:
    """Format each BRSR Principle 6 coverage key as a human-readable line item."""
    lines: list[str] = []
    area_s = f"{area_sqm:,} sqm"
    inr_s = f"₹{committed_inr:,}"

    for key in coverage:
        if key == "green_credits_generated_or_procured":
            lines.append(
                f"Principle 6 · Green credits generated: {area_s} under "
                f"{package_name} — eligible for Green Credit Programme registration."
            )
        elif key == "energy_intensity_ratios":
            lines.append(
                f"Principle 6 · Energy intensity: {package_name} across "
                f"{area_s} projected to reduce cooling-load energy by "
                "15-25% over baseline."
            )
        elif key == "environmental_impact_assessment":
            lines.append(
                f"Principle 6 · EIA line item: {inr_s} capital deployment "
                f"for {package_name} on {area_s}, Sustainmetric-verified "
                "site assessment on file."
            )
        elif key == "water_withdrawal_intensity":
            lines.append(
                f"Principle 6 · Water intensity: {package_name} across "
                f"{area_s} captures monsoon runoff, reducing net water withdrawal."
            )
        elif key == "biodiversity_impact":
            lines.append(
                f"Principle 6 · Biodiversity: {package_name} establishes "
                f"Miyawaki-density native plantings across {area_s} for "
                "corridor habitat."
            )
        else:
            pretty = key.replace("_", " ").title()
            lines.append(
                f"Principle 6 · {pretty} — {package_name}, {area_s}."
            )
    return lines
