"use client";

import { useMapStore } from "@/lib/store";
import type { InterventionOption } from "@/lib/api";

const SOURCE_LABELS: Record<string, string> = {
  open_meteo: "WEATHER",
  openaq: "AIR QUALITY",
  overpass_osm: "LAND USE",
  surface_conditions_era5: "SURFACE (ERA5)",
  mapillary: "STREET VIEW",
};

const INTERVENTION_ICONS: Record<string, string> = {
  cool_roof: "ROOF",
  urban_tree: "TREE",
  pocket_park: "PARK",
  permeable_pavement: "PAVE",
  reflective_pavement: "REFL",
  water_body: "AQUA",
  green_wall: "WALL",
};

const EQUITY_COLORS: Record<string, string> = {
  HIGH: "text-accent-heat",
  MEDIUM: "text-yellow-400",
  LOW: "text-accent-success",
};

function formatCost(inr: number): string {
  if (inr >= 100000) return `${(inr / 100000).toFixed(1)}L`;
  if (inr >= 1000) return `${(inr / 1000).toFixed(0)}K`;
  return `${inr}`;
}

function FreshnessIndicator({
  source,
  freshness,
  fetchedAt,
  hasError,
}: {
  source: string;
  freshness: number;
  fetchedAt: string;
  hasError: boolean;
}) {
  const label = SOURCE_LABELS[source] || source.toUpperCase();
  const age = freshness < 3600
    ? `${Math.floor(freshness / 60)}m`
    : `${Math.floor(freshness / 3600)}h`;

  return (
    <div className="flex items-center gap-3 py-1.5 animate-fadeIn">
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          hasError ? "bg-accent-heat" : "bg-accent-success"
        }`}
      />
      <span className="font-mono text-xs text-text-secondary tracking-wider">
        {label}
      </span>
      <span className="font-mono text-xs text-text-tertiary ml-auto">
        {hasError ? "ERR" : age}
      </span>
    </div>
  );
}

function InterventionCard({ opt }: { opt: InterventionOption }) {
  const icon = INTERVENTION_ICONS[opt.type] || "---";

  return (
    <div className="border border-border p-4 mb-3 hover:border-border-strong transition-colors duration-rail ease-rail">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-accent-cool bg-accent-cool/10 px-2 py-0.5">
            {icon}
          </span>
          <span className="font-headline text-xs uppercase tracking-button text-text-primary">
            {opt.type.replace(/_/g, " ")}
          </span>
        </div>
        <span className="font-mono text-xs text-accent-success">
          -{opt.projected_temperature_reduction_celsius.toFixed(1)}°C
        </span>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        {opt.description}
      </p>
      <div className="flex items-center gap-4 text-xs font-mono text-text-tertiary">
        <span>INR {formatCost(opt.estimated_cost_inr)}</span>
        <span>{opt.time_to_impact_months}mo</span>
        <span>EQ {(opt.equity_score * 100).toFixed(0)}%</span>
      </div>
      {opt.low_confidence && (
        <div className="mt-2 text-xs text-accent-heat font-mono">LOW CONFIDENCE</div>
      )}
    </div>
  );
}

export default function AnalysisPanel() {
  const {
    panelOpen,
    closePanel,
    selectedLat,
    selectedLon,
    queryStatus,
    fetchStatuses,
    analysis,
    servedFromCache,
    error,
    loading,
  } = useMapStore();

  if (!panelOpen) return null;

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[35%] min-w-[380px] bg-bg border-l border-border z-40 overflow-y-auto transition-transform duration-rail ease-rail ${
        panelOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="sticky top-0 bg-bg z-10 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="font-headline text-xs uppercase tracking-nav text-text-primary">
            SITE ANALYSIS
          </span>
          <button
            onClick={closePanel}
            className="text-text-tertiary hover:text-text-primary text-lg transition-colors duration-rail"
          >
            &#10005;
          </button>
        </div>
        <div className="font-mono text-xs text-text-tertiary">
          {selectedLat?.toFixed(4)}°N, {selectedLon?.toFixed(4)}°E
        </div>
        {servedFromCache && (
          <div className="mt-1 font-mono text-xs text-accent-cool">
            CACHED RESULT
          </div>
        )}
      </div>

      <div className="px-6 py-4">
        {/* Loading state */}
        {loading && !analysis && (
          <div className="space-y-1">
            <div className="font-headline text-xs uppercase tracking-nav text-text-secondary mb-3">
              COLLECTING DATA
            </div>

            {/* Data freshness indicators stream in as fetches complete */}
            {fetchStatuses.map((s) => (
              <FreshnessIndicator
                key={s.source}
                source={s.source}
                freshness={s.freshness_seconds}
                fetchedAt={s.fetched_at}
                hasError={s.has_error}
              />
            ))}

            {/* Pulsing dots for pending status */}
            {queryStatus === "processing" && (
              <div className="mt-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-cool animate-pulse" />
                <span className="font-mono text-xs text-accent-cool">
                  ANALYZING WITH GEMINI
                </span>
              </div>
            )}

            {queryStatus === "fetching_data" && fetchStatuses.length < 5 && (
              <div className="mt-2 flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-text-tertiary animate-pulse" />
                <div
                  className="w-1 h-1 rounded-full bg-text-tertiary animate-pulse"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-1 h-1 rounded-full bg-text-tertiary animate-pulse"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="border border-accent-heat/30 p-4">
            <div className="font-headline text-xs uppercase tracking-nav text-accent-heat mb-2">
              ANALYSIS FAILED
            </div>
            <p className="text-xs text-text-secondary font-mono">{error}</p>
          </div>
        )}

        {/* Analysis results */}
        {analysis && (
          <div className="space-y-6 animate-fadeIn">
            {/* Equity flag */}
            <div className="flex items-center gap-2">
              <span className="font-headline text-xs uppercase tracking-nav text-text-secondary">
                EQUITY
              </span>
              <span
                className={`font-mono text-sm font-bold ${
                  EQUITY_COLORS[analysis.equity_flag] || "text-text-primary"
                }`}
              >
                {analysis.equity_flag}
              </span>
              <span className="ml-auto font-mono text-xs text-text-tertiary">
                CONF {(analysis.model_confidence * 100).toFixed(0)}%
              </span>
            </div>

            {/* Site characterization */}
            <div>
              <h3 className="font-headline text-xs uppercase tracking-nav text-text-secondary mb-2">
                SITE CHARACTERIZATION
              </h3>
              <p className="text-sm text-text-primary leading-relaxed">
                {analysis.site_characterization}
              </p>
            </div>

            {/* Vulnerability assessment */}
            <div>
              <h3 className="font-headline text-xs uppercase tracking-nav text-text-secondary mb-2">
                VULNERABILITY
              </h3>
              <p className="text-sm text-text-primary leading-relaxed">
                {analysis.vulnerability_assessment}
              </p>
            </div>

            {/* Impact metrics */}
            <div>
              <h3 className="font-headline text-xs uppercase tracking-nav text-text-secondary mb-3">
                PROJECTED IMPACT
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border p-3">
                  <div className="font-mono text-lg text-accent-cool font-bold">
                    -{analysis.projected_impact_metrics.estimated_lst_reduction_celsius.toFixed(1)}°C
                  </div>
                  <div className="font-mono text-xs text-text-tertiary mt-1">
                    LST REDUCTION
                  </div>
                </div>
                <div className="border border-border p-3">
                  <div className="font-mono text-lg text-accent-success font-bold">
                    {analysis.projected_impact_metrics.estimated_energy_savings_percent.toFixed(0)}%
                  </div>
                  <div className="font-mono text-xs text-text-tertiary mt-1">
                    ENERGY SAVED
                  </div>
                </div>
              </div>
            </div>

            {/* Interventions */}
            <div>
              <h3 className="font-headline text-xs uppercase tracking-nav text-text-secondary mb-3">
                INTERVENTIONS
              </h3>
              {analysis.intervention_options.map((opt, i) => (
                <InterventionCard key={i} opt={opt} />
              ))}
            </div>

            {/* Recommended bundle */}
            <div>
              <h3 className="font-headline text-xs uppercase tracking-nav text-text-secondary mb-2">
                RECOMMENDED BUNDLE
              </h3>
              <p className="text-sm text-text-primary leading-relaxed border-l-2 border-accent-cool pl-4">
                {analysis.recommended_bundle}
              </p>
            </div>

            {/* BRSR */}
            <div>
              <h3 className="font-headline text-xs uppercase tracking-nav text-text-secondary mb-2">
                BRSR PRINCIPLE 6
              </h3>
              <ul className="space-y-1">
                {analysis.brsr_principle_6_line_items.map((item, i) => (
                  <li
                    key={i}
                    className="text-xs text-text-secondary pl-3 border-l border-border"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Data freshness */}
            <div className="border-t border-border pt-4">
              <h3 className="font-headline text-xs uppercase tracking-nav text-text-tertiary mb-2">
                DATA FRESHNESS
              </h3>
              <p className="text-xs text-text-tertiary leading-relaxed font-mono">
                {analysis.data_freshness_notes}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
