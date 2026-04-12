/**
 * @sustainmetric/shared — types and constants shared across the monorepo.
 *
 * TypeScript types here are auto-generated from Pydantic models in Session 4.
 * For now, export the constants that both frontend and backend reference.
 */

// ── Intervention types (controlled vocabulary) ──────────────────────
export const INTERVENTION_TYPES = [
  "cool_roof",
  "urban_tree",
  "pocket_park",
  "permeable_pavement",
  "reflective_pavement",
  "water_body",
  "green_wall",
] as const;

export type InterventionType = (typeof INTERVENTION_TYPES)[number];

// ── User roles ──────────────────────────────────────────────────────
export const USER_ROLES = ["admin", "analyst", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ── Query status ────────────────────────────────────────────────────
export const QUERY_STATUSES = [
  "pending",
  "fetching_data",
  "processing",
  "completed",
  "failed",
] as const;
export type QueryStatus = (typeof QUERY_STATUSES)[number];

// ── Supported cities (V1: Delhi only, V2: expands) ──────────────────
export const SUPPORTED_CITIES = [
  { code: "DEL", name: "Delhi NCR", lat: 28.6139, lon: 77.209 },
] as const;

export type CityCode = (typeof SUPPORTED_CITIES)[number]["code"];

// ── Equity flag levels ──────────────────────────────────────────────
export const EQUITY_FLAGS = ["HIGH", "MEDIUM", "LOW"] as const;
export type EquityFlag = (typeof EQUITY_FLAGS)[number];

// ── BRSR Principle 6 categories ─────────────────────────────────────
export const BRSR_P6_CATEGORIES = [
  "air_quality",
  "water_management",
  "waste_management",
  "energy_management",
  "biodiversity",
  "emissions",
  "resource_usage",
] as const;
export type BrsrP6Category = (typeof BRSR_P6_CATEGORIES)[number];

// ── Validation bands ────────────────────────────────────────────────
export const COST_BAND = {
  min: 500, // ₹500
  max: 5_000_000, // ₹50 lakh
} as const;
