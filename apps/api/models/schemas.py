"""Pydantic models — single source of truth for all API shapes."""
# NOTE: do NOT use 'from __future__ import annotations' here.
# Pydantic needs real types at runtime to build validators.

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

# ── Enums ─────────────────────────────────────────────────────

class QueryStatus(StrEnum):
    PENDING = "pending"
    FETCHING_DATA = "fetching_data"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class EquityFlag(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class InterventionType(StrEnum):
    COOL_ROOF = "cool_roof"
    URBAN_TREE = "urban_tree"
    POCKET_PARK = "pocket_park"
    PERMEABLE_PAVEMENT = "permeable_pavement"
    REFLECTIVE_PAVEMENT = "reflective_pavement"
    WATER_BODY = "water_body"
    GREEN_WALL = "green_wall"


class PackageId(StrEnum):
    SKIN = "skin"
    CHOWK = "chowk"
    KILOMETER = "kilometer"


class CustomerTier(StrEnum):
    INDIVIDUAL = "individual"
    COMMUNITY = "community"
    CORPORATE = "corporate"


# ── Auth / User ───────────────────────────────────────────────

class TenantResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: str
    tier: str = "corporate"
    monthly_query_quota: int


class UserResponse(BaseModel):
    id: UUID
    firebase_uid: str
    tenant_id: UUID
    email: str
    display_name: str | None
    role: str


class MeResponse(BaseModel):
    user: UserResponse
    tenant: TenantResponse


# ── Data Fetchers ─────────────────────────────────────────────

class FetchResult(BaseModel):
    source: str
    data: dict[str, Any]
    source_url: str | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    freshness_seconds: int = 0
    error: str | None = None
    summary: str = ""  # One-line human-readable description for UI


# ── Gemini Analysis Output ────────────────────────────────────

class InterventionOption(BaseModel):
    type: InterventionType
    description: str
    estimated_cost_inr: float = Field(ge=500, le=5_000_000)
    projected_temperature_reduction_celsius: float
    equity_score: float = Field(ge=0, le=1)
    time_to_impact_months: int
    rejection_reason: str = ""
    package: PackageId


class ProjectedImpactMetrics(BaseModel):
    estimated_lst_reduction_celsius: float
    estimated_energy_savings_percent: float
    estimated_aqi_improvement_percent: float | None = None
    green_cover_increase_sqm: float | None = None
    beneficiary_count_estimate: int | None = None


class SiteAnalysisResponse(BaseModel):
    site_characterization: str
    vulnerability_assessment: str
    intervention_options: list[InterventionOption]
    recommended_bundle: str
    equity_flag: EquityFlag
    projected_impact_metrics: ProjectedImpactMetrics
    brsr_principle_6_line_items: list[str]
    data_freshness_notes: str
    model_confidence: float = Field(ge=0, le=1)
    reasoning_narrative: str = ""


# ── Query lifecycle ───────────────────────────────────────────

class QueryCreate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    site_id: UUID | None = None


class QueryResponse(BaseModel):
    id: UUID
    status: QueryStatus
    lat: float
    lon: float
    served_from_cache: bool = False
    created_at: datetime
    updated_at: datetime


class QueryOutput(BaseModel):
    id: UUID
    query_id: UUID
    model_used: str
    cost_inr: float
    analysis: SiteAnalysisResponse | None = None
    validation_warnings: list[str] = []
    cache_source: str | None = None
    created_at: datetime


# ── Audit ─────────────────────────────────────────────────────

class AuditLogCreate(BaseModel):
    tenant_id: UUID
    user_id: UUID | None = None
    action: str
    resource_type: str | None = None
    resource_id: UUID | None = None
    request_method: str | None = None
    request_path: str | None = None
    request_body: dict[str, Any] | None = None
    response_status: int | None = None
    ip_address: str | None = None
    user_agent: str | None = None


# ── SSE Stream Events ────────────────────────────────────────

class StreamEvent(BaseModel):
    event: str  # "fetch_complete", "analysis_started", "analysis_section", "done", "error"
    source: str | None = None
    data: dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ── Intervention Packages (Block 1) ──────────────────────────

class InterventionPackageResponse(BaseModel):
    id: str
    name: str
    short_description: str
    full_description: str
    intervention_types: list[str]
    cost_per_sqm_min_inr: int
    cost_per_sqm_max_inr: int
    typical_timeline_months: int
    implementation_partner_type: str
    brsr_principle_6_coverage: list[str]
    is_proprietary: bool
    proprietary_notes: str | None = None


# ── Tier selection (Block 2) ─────────────────────────────────

class TierUpdateRequest(BaseModel):
    tier: CustomerTier


# ── Commit-funding flow (Block 1) ────────────────────────────

class CommitRequest(BaseModel):
    query_id: UUID
    intervention_option_index: int = Field(ge=0, le=9)
    package_id: PackageId
    estimated_area_sqm: int = Field(ge=1, le=1_000_000)
    committed_amount_inr: int = Field(ge=1000, le=1_000_000_000)


class CommitResponse(BaseModel):
    project_id: UUID
    query_id: UUID
    package_id: str
    package_name: str
    committed_amount_inr: int
    platform_fee_inr: int
    execution_partner_amount_inr: int
    is_demo_commitment: bool
    brsr_preview: list[str]
    implementation_partner_type: str
    created_at: datetime
