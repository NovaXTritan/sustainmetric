/**
 * API client for the Sustainmetric backend.
 * Handles query creation, polling, and SSE streaming.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface QueryResponse {
  id: string;
  status: "pending" | "fetching_data" | "processing" | "completed" | "failed";
  lat: number;
  lon: number;
  served_from_cache: boolean;
  created_at: string;
  updated_at: string;
  output?: {
    id: string;
    model_used: string;
    cost_inr: number;
    analysis: SiteAnalysis;
    validation_warnings: string[];
    cache_source: string | null;
    created_at: string;
  };
  error?: string;
}

export type PackageId = "skin" | "chowk" | "kilometer";
export type CustomerTier = "individual" | "community" | "corporate";

export interface InterventionOption {
  type: string;
  description: string;
  estimated_cost_inr: number;
  projected_temperature_reduction_celsius: number;
  equity_score: number;
  time_to_impact_months: number;
  rejection_reason?: string;
  low_confidence?: boolean;
  package?: PackageId;
}

export interface InterventionPackage {
  id: PackageId;
  name: string;
  short_description: string;
  full_description: string;
  intervention_types: string[];
  cost_per_sqm_min_inr: number;
  cost_per_sqm_max_inr: number;
  typical_timeline_months: number;
  implementation_partner_type: string;
  brsr_principle_6_coverage: string[];
  is_proprietary: boolean;
  proprietary_notes: string | null;
}

export interface CommitResponse {
  project_id: string;
  query_id: string;
  package_id: string;
  package_name: string;
  committed_amount_inr: number;
  platform_fee_inr: number;
  execution_partner_amount_inr: number;
  is_demo_commitment: boolean;
  brsr_preview: string[];
  implementation_partner_type: string;
  created_at: string;
}

export interface SiteAnalysis {
  site_characterization: string;
  vulnerability_assessment: string;
  intervention_options: InterventionOption[];
  recommended_bundle: string;
  equity_flag: "HIGH" | "MEDIUM" | "LOW";
  projected_impact_metrics: {
    estimated_lst_reduction_celsius: number;
    estimated_energy_savings_percent: number;
    estimated_aqi_improvement_percent?: number;
    green_cover_increase_sqm?: number;
    beneficiary_count_estimate?: number;
  };
  brsr_principle_6_line_items: string[];
  data_freshness_notes: string;
  model_confidence: number;
  reasoning_narrative?: string;
}

export interface StreamEvent {
  event: string;
  data: Record<string, unknown>;
}

/** Create a new analysis query */
export async function createQuery(
  lat: number,
  lon: number,
  token?: string
): Promise<QueryResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE}/api/v1/queries`, {
    method: "POST",
    headers,
    body: JSON.stringify({ lat, lon }),
  });

  if (!resp.ok) throw new Error(`Query creation failed: ${resp.status}`);
  return resp.json();
}

/** Poll query status */
export async function getQuery(
  queryId: string,
  token?: string
): Promise<QueryResponse> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE}/api/v1/queries/${queryId}`, {
    headers,
  });

  if (!resp.ok) throw new Error(`Query fetch failed: ${resp.status}`);
  return resp.json();
}

/** Fetch the three Sustainmetric execution packages */
export async function getPackages(
  token?: string
): Promise<{ packages: InterventionPackage[]; cached: boolean }> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE}/api/v1/packages`, { headers });
  if (!resp.ok) throw new Error(`Packages fetch failed: ${resp.status}`);
  return resp.json();
}

/** Record a simulated funding commitment against a ranked intervention */
export async function commitProject(
  body: {
    query_id: string;
    intervention_option_index: number;
    package_id: PackageId;
    estimated_area_sqm: number;
    committed_amount_inr: number;
  },
  token?: string
): Promise<CommitResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE}/api/v1/projects`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Commit failed (${resp.status}): ${errText}`);
  }
  return resp.json();
}

export interface GeocodeResult {
  display_name: string;
  lat: number;
  lon: number;
  type: string;
  importance: number;
}

/** Search Nominatim via backend proxy (rate-limited, India-restricted) */
export async function geocode(
  query: string,
  token?: string,
): Promise<{ results: GeocodeResult[]; cached: boolean }> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const url = `${API_BASE}/api/v1/geocode?q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`Geocode failed: ${resp.status}`);
  return resp.json();
}

/** Best-effort write of customer tier to authenticated tenant row. Errors are swallowed. */
export async function updateTier(tier: CustomerTier, token?: string): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    await fetch(`${API_BASE}/api/v1/me/tier`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tier }),
    });
  } catch {
    // Swallow — localStorage is the source of truth for tier.
  }
}

/** Subscribe to SSE stream for a query */
export function streamQuery(
  queryId: string,
  onEvent: (event: StreamEvent) => void,
  token?: string
): () => void {
  const url = new URL(`${API_BASE}/api/v1/queries/${queryId}/stream`);

  const eventSource = new EventSource(url.toString());

  const handleEvent = (type: string) => (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      onEvent({ event: type, data });
    } catch {
      // Non-JSON event
      onEvent({ event: type, data: { raw: e.data } });
    }
  };

  eventSource.addEventListener("status", handleEvent("status"));
  eventSource.addEventListener("fetch_complete", handleEvent("fetch_complete"));
  eventSource.addEventListener("analysis_complete", handleEvent("analysis_complete"));
  eventSource.addEventListener("done", handleEvent("done"));
  eventSource.addEventListener("error", handleEvent("error"));
  eventSource.addEventListener("timeout", handleEvent("timeout"));

  eventSource.onerror = () => {
    onEvent({ event: "connection_error", data: {} });
    eventSource.close();
  };

  // Return cleanup function
  return () => eventSource.close();
}
