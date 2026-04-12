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

export interface InterventionOption {
  type: string;
  description: string;
  estimated_cost_inr: number;
  projected_temperature_reduction_celsius: number;
  equity_score: number;
  time_to_impact_months: number;
  low_confidence?: boolean;
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
