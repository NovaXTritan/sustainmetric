"use client";

import { useEffect, useState } from "react";
import { useMapStore, type FetchStatus } from "@/lib/store";
import type { InterventionOption, PackageId, SiteAnalysis } from "@/lib/api";
import { readTier } from "@/lib/tier";
import CommitModal from "./CommitModal";

// ── The seven data sources, pre-seeded so rows exist before events arrive ──
interface SourceMeta {
  id: string;
  label: string;
  description: string;
}

const SOURCES: SourceMeta[] = [
  { id: "nominatim", label: "LOCATION · NOMINATIM", description: "Ward, district, city" },
  { id: "open_meteo", label: "WEATHER · OPEN-METEO", description: "Live temperature, humidity, wind" },
  { id: "openaq", label: "AIR QUALITY · OPENAQ", description: "Nearest CPCB monitor PM2.5" },
  { id: "overpass_osm", label: "URBAN FABRIC · OSM", description: "Buildings, roads, parks within 200m" },
  { id: "surface_conditions_era5", label: "SURFACE · ERA5", description: "Soil temperature, reanalysis" },
  { id: "mapillary", label: "STREET VIEW · MAPILLARY", description: "Panorama imagery" },
];

const INTERVENTION_LABELS: Record<string, string> = {
  cool_roof: "COOL ROOF",
  urban_tree: "URBAN TREE",
  pocket_park: "POCKET PARK",
  permeable_pavement: "PERMEABLE PAVEMENT",
  reflective_pavement: "REFLECTIVE PAVEMENT",
  water_body: "WATER BODY",
  green_wall: "GREEN WALL",
};

const PACKAGE_LABEL: Record<PackageId, string> = {
  skin: "PACKAGE A · THE SKIN",
  chowk: "PACKAGE B · ADOPT-A-CHOWK",
  kilometer: "PACKAGE C · ADOPT-A-KILOMETER",
};

// Persistent attribution of the in-house V2 formulation that would deliver
// each intervention. Only materials-science interventions get attribution —
// vegetation interventions (urban_tree, pocket_park, green_wall, water_body)
// are not coatings and would misrepresent the product line if tagged.
const PRODUCT_ATTRIBUTION: Record<string, string> = {
  cool_roof: "DEPLOYED VIA SUSTAINMETRIC SKIN · V2 IN-HOUSE FORMULATION (R&D)",
  reflective_pavement:
    "DEPLOYED VIA SUSTAINMETRIC PAVE · V2 IN-HOUSE FORMULATION (R&D)",
  permeable_pavement:
    "DEPLOYED VIA SUSTAINMETRIC PAVE · V2 IN-HOUSE FORMULATION (R&D)",
};

const EQUITY_COLOR: Record<string, string> = {
  HIGH: "text-accent-heat",
  MEDIUM: "text-yellow-400",
  LOW: "text-accent-success",
};

// ── Helpers ────────────────────────────────────────────────────────────

function formatFreshness(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatCost(inr: number): string {
  if (inr >= 100000) return `₹${(inr / 100000).toFixed(1)}L`;
  if (inr >= 1000) return `₹${(inr / 1000).toFixed(0)}K`;
  return `₹${inr}`;
}

// ── Typewriter effect for Gemini text streaming illusion ──────────────

function useTypewriter(text: string, speed = 20): string {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i += Math.max(1, Math.floor(text.length / 200));
      if (i >= text.length) {
        setDisplayed(text);
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, i));
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return displayed;
}

// ── Sub-components ─────────────────────────────────────────────────────

function DataSourceRow({
  meta,
  status,
}: {
  meta: SourceMeta;
  status?: FetchStatus;
}) {
  const isFetching = !status;
  const hasError = status?.has_error;

  return (
    <div className="flex items-start gap-3 py-2.5 animate-fadeIn">
      {/* Status dot */}
      <div className="flex items-center h-5 mt-0.5">
        {isFetching ? (
          <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-pulse" />
        ) : hasError ? (
          <div className="text-yellow-400 text-xs">▲</div>
        ) : (
          <div className="text-accent-success text-xs">✓</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] tracking-[0.08em] text-text-secondary">
            {meta.label}
          </span>
          <span className="font-mono text-[10px] text-text-tertiary shrink-0">
            {isFetching
              ? "fetching..."
              : status
                ? formatFreshness(status.freshness_seconds)
                : ""}
          </span>
        </div>
        <div className="text-xs text-text-primary mt-0.5 leading-snug">
          {isFetching
            ? meta.description
            : status?.summary || meta.description}
        </div>
        {hasError && status?.error_message && (
          <div className="text-[10px] text-yellow-400 mt-0.5 font-mono">
            {status.error_message.slice(0, 80)}
          </div>
        )}
      </div>
    </div>
  );
}

function DataSourceList() {
  const { fetchStatuses } = useMapStore();
  const statusMap = new Map(fetchStatuses.map((s) => [s.source, s]));

  return (
    <div className="space-y-0 divide-y divide-border/40">
      {SOURCES.map((meta) => (
        <DataSourceRow key={meta.id} meta={meta} status={statusMap.get(meta.id)} />
      ))}
    </div>
  );
}

// Compute slippy-map tile coords from lat/lon at a given zoom
function latLonToTile(
  lat: number,
  lon: number,
  zoom: number,
): { x: number; y: number; z: number } {
  const z = zoom;
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y, z };
}

function MediaBlock() {
  const { fetchStatuses, selectedLat, selectedLon } = useMapStore();
  const mapillary = fetchStatuses.find((s) => s.source === "mapillary");
  const hasMapillaryImage = mapillary && !mapillary.has_error && mapillary.thumb_url;

  // Show nothing until first fetcher returns or coords selected
  if (!selectedLat || !selectedLon) return null;

  // Satellite tile from CARTO Voyager at zoom 17
  const { x, y, z } = latLonToTile(selectedLat, selectedLon, 17);
  const satUrl = `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}@2x.png`;

  return (
    <div className="mt-5 grid grid-cols-2 gap-2 animate-fadeIn">
      <div className="aspect-video bg-bg-elevated border border-border overflow-hidden relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={satUrl}
          alt="Satellite tile"
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-1 left-1 font-mono text-[9px] text-white bg-black/60 px-1.5 py-0.5 uppercase tracking-wider">
          Map tile · z{z}
        </div>
      </div>
      <div className="aspect-video bg-bg-elevated border border-border overflow-hidden relative">
        {hasMapillaryImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mapillary.thumb_url}
              alt="Street view"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 left-1 font-mono text-[9px] text-white bg-black/60 px-1.5 py-0.5 uppercase tracking-wider">
              Street · Mapillary
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-mono text-[9px] text-text-tertiary uppercase tracking-wider text-center px-4">
              {mapillary?.has_error
                ? "No street imagery within 200m"
                : "Street view loading..."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function InterventionCard({
  opt,
  isTop,
  optionIndex,
  onCommit,
}: {
  opt: InterventionOption;
  isTop: boolean;
  optionIndex: number;
  onCommit: (index: number, pkg: PackageId) => void;
}) {
  const label = INTERVENTION_LABELS[opt.type] || opt.type.toUpperCase();
  const packageLabel = opt.package ? PACKAGE_LABEL[opt.package] : null;

  // Corporate tier sees a V2 formulation tag on Package A (Skin) recommendations
  // since that is where the proprietary road coating R&D pipeline lives.
  const [showV2Tag, setShowV2Tag] = useState(false);
  useEffect(() => {
    if (opt.package === "skin" && readTier() === "corporate") {
      setShowV2Tag(true);
    }
  }, [opt.package]);

  return (
    <div
      className={`border p-4 transition-colors duration-rail ease-rail ${
        isTop
          ? "border-accent-cool/50 bg-accent-cool/[0.03]"
          : "border-border"
      }`}
    >
      {packageLabel && (
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <div className="inline-block border border-border px-2.5 py-1 font-mono text-[9px] tracking-[0.12em] text-text-secondary uppercase">
            {packageLabel}
          </div>
          {showV2Tag && (
            <div className="inline-block border border-accent-cool/40 px-2 py-[3px] font-mono text-[8px] tracking-[0.12em] text-accent-cool uppercase">
              V2 FORMULATION AVAILABLE
            </div>
          )}
        </div>
      )}
      {PRODUCT_ATTRIBUTION[opt.type] && (
        <div className="text-[10px] text-white/50 tracking-[0.06em] mb-3 font-body">
          {PRODUCT_ATTRIBUTION[opt.type]}
        </div>
      )}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-mono text-[9px] text-accent-cool tracking-[0.08em] mb-1">
            {isTop ? "TOP RECOMMENDATION" : "ALSO CONSIDERED"}
          </div>
          <div className="font-headline text-sm uppercase tracking-button text-text-primary">
            {label}
          </div>
        </div>
        <div className="font-mono text-sm text-accent-success shrink-0">
          -{opt.projected_temperature_reduction_celsius.toFixed(1)}°C
        </div>
      </div>

      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        {opt.description}
      </p>

      <div className="grid grid-cols-3 gap-3 text-[10px] font-mono text-text-tertiary">
        <div>
          <div className="text-text-primary">{formatCost(opt.estimated_cost_inr)}</div>
          <div>COST</div>
        </div>
        <div>
          <div className="text-text-primary">{opt.time_to_impact_months}mo</div>
          <div>TIME</div>
        </div>
        <div>
          <div className="text-text-primary">
            {(opt.equity_score * 100).toFixed(0)}%
          </div>
          <div>EQUITY</div>
        </div>
      </div>

      {!isTop && opt.rejection_reason && (
        <div className="mt-3 pt-3 border-t border-border/60">
          <div className="font-mono text-[9px] text-text-tertiary tracking-[0.08em] mb-1">
            RANKED LOWER BECAUSE
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {opt.rejection_reason}
          </p>
        </div>
      )}

      {isTop && opt.package && (
        <div className="mt-4 pt-3 border-t border-border/60">
          <button
            onClick={() => onCommit(optionIndex, opt.package as PackageId)}
            className="w-full border border-accent-cool/60 px-4 py-2.5 font-headline text-[10px] uppercase tracking-[0.12em] text-accent-cool hover:bg-accent-cool/10 transition-colors"
          >
            COMMIT FUNDING (DEMO) →
          </button>
        </div>
      )}
    </div>
  );
}

function InterventionCards({ options }: { options: InterventionOption[] }) {
  const [modalState, setModalState] = useState<{
    open: boolean;
    index: number;
    pkg: PackageId;
  }>({ open: false, index: 0, pkg: "skin" });
  const queryId = useMapStore((s) => s.queryId);

  if (!options.length) return null;
  const [top, ...rest] = options;

  return (
    <>
      <div className="space-y-3 animate-fadeIn">
        <InterventionCard
          opt={top}
          isTop
          optionIndex={0}
          onCommit={(index, pkg) => setModalState({ open: true, index, pkg })}
        />
        {rest.map((opt, i) => (
          <InterventionCard
            key={i}
            opt={opt}
            isTop={false}
            optionIndex={i + 1}
            onCommit={(index, pkg) => setModalState({ open: true, index, pkg })}
          />
        ))}
      </div>
      <CommitModal
        open={modalState.open}
        onClose={() => setModalState((s) => ({ ...s, open: false }))}
        queryId={queryId}
        interventionIndex={modalState.index}
        packageId={modalState.pkg}
      />
    </>
  );
}

// Persistent hero-product showcase. Renders after every completed analysis
// regardless of which interventions Gemini ranked — Sustainmetric Pave is
// the flagship in-house product and must be visible on every results view.
function HeroProduct() {
  return (
    <div className="mt-8 animate-fadeIn">
      <div className="font-mono text-[10px] tracking-[0.12em] text-accent-cool mb-3">
        SUSTAINMETRIC HERO PRODUCT
      </div>

      {/* Pave — primary */}
      <div className="border-2 border-accent-cool/60 bg-accent-cool/[0.04] p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-headline text-lg uppercase tracking-button text-text-primary leading-none">
              SUSTAINMETRIC PAVE
            </div>
            <div className="font-mono text-[11px] text-text-tertiary mt-1.5">
              Bio-mimetic cool road coating · V2 in-house formulation
            </div>
          </div>
          <div className="font-mono text-[9px] text-accent-cool tracking-[0.12em] shrink-0 border border-accent-cool/60 px-2 py-1">
            HERO · R&D
          </div>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          Every road, chowk, and pavement intervention Sustainmetric
          recommends is designed to be delivered by Sustainmetric Pave —
          the in-house bio-mimetic coating built for Indian heavy traffic,
          monsoon stormwater, and urban heat island mitigation.
        </p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
          {[
            "MMA-PU HYBRID BINDER",
            "IR-REFLECTIVE CICPs",
            "POROUS ZEOLITE AGGREGATE",
            "CALCINED BAUXITE ANTI-SKID",
            "RETROREFLECTIVE GLASS BEADS",
            "BIO-MIMETIC DRAIN-TO-ROOTS",
          ].map((label) => (
            <div
              key={label}
              className="font-mono text-[10px] tracking-[0.06em] text-text-primary/90 border-l border-accent-cool/50 pl-2.5 leading-snug"
            >
              {label}
            </div>
          ))}
        </div>

        <a
          href="/pave"
          className="inline-flex items-center gap-2 border border-accent-cool/60 px-4 py-2 font-headline text-[10px] uppercase tracking-[0.12em] text-accent-cool hover:bg-accent-cool/10 transition-colors"
        >
          VIEW FULL PRODUCT SPEC
          <span>→</span>
        </a>
      </div>

      {/* Skin — secondary */}
      <a
        href="/skin"
        className="block mt-3 border border-border hover:border-accent-cool/40 p-4 transition-colors group"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-headline text-xs uppercase tracking-button text-text-primary mb-1">
              SUSTAINMETRIC SKIN · ROOFTOP VARIANT
            </div>
            <div className="text-xs text-text-secondary leading-snug">
              Potassium silicate bio-mimetic cool roof adhesive for
              residential, commercial, industrial, and institutional
              rooftops. Deployed wherever Package A recommends a cool roof.
            </div>
          </div>
          <div className="font-headline text-[10px] uppercase tracking-[0.12em] text-accent-cool group-hover:translate-x-0.5 transition-transform shrink-0">
            VIEW →
          </div>
        </div>
      </a>
    </div>
  );
}

function ReasoningNarrative({ narrative }: { narrative: string }) {
  const typed = useTypewriter(narrative, 10);
  if (!narrative) return null;

  return (
    <div className="mt-8 pt-6 border-t border-border animate-fadeIn">
      <div className="font-headline text-[10px] uppercase tracking-[0.08em] text-text-tertiary mb-3">
        HOW WE REACHED THIS RECOMMENDATION
      </div>
      <p
        className="text-sm text-text-primary/85 leading-[1.7]"
        style={{ minHeight: "4em" }}
      >
        {typed}
        {typed.length < narrative.length && (
          <span className="inline-block w-[2px] h-[1em] bg-accent-cool ml-0.5 align-middle animate-pulse" />
        )}
      </p>
    </div>
  );
}

function GeminiAnalysis({ analysis }: { analysis: SiteAnalysis }) {
  return (
    <div className="mt-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div className="font-headline text-[11px] uppercase tracking-[0.08em] text-text-primary">
          MULTIMODAL ANALYSIS · GEMINI 2.5 FLASH-LITE
        </div>
        <span
          className={`font-mono text-[10px] font-bold ${
            EQUITY_COLOR[analysis.equity_flag] || "text-text-primary"
          }`}
        >
          EQUITY {analysis.equity_flag}
        </span>
      </div>

      {/* Site characterization */}
      <div className="mb-5">
        <div className="font-mono text-[9px] tracking-[0.08em] text-text-tertiary mb-1.5">
          SITE CHARACTERIZATION
        </div>
        <p className="text-sm text-text-primary leading-relaxed">
          {analysis.site_characterization}
        </p>
      </div>

      {/* Vulnerability */}
      <div className="mb-5">
        <div className="font-mono text-[9px] tracking-[0.08em] text-text-tertiary mb-1.5">
          VULNERABILITY
        </div>
        <p className="text-sm text-text-primary leading-relaxed">
          {analysis.vulnerability_assessment}
        </p>
      </div>

      {/* Impact metrics */}
      <div className="mb-5">
        <div className="font-mono text-[9px] tracking-[0.08em] text-text-tertiary mb-2">
          PROJECTED IMPACT
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-border p-3">
            <div className="font-mono text-lg text-accent-cool">
              -{analysis.projected_impact_metrics.estimated_lst_reduction_celsius.toFixed(1)}°C
            </div>
            <div className="font-mono text-[9px] text-text-tertiary tracking-[0.08em] mt-0.5">
              LST REDUCTION
            </div>
          </div>
          <div className="border border-border p-3">
            <div className="font-mono text-lg text-accent-success">
              {analysis.projected_impact_metrics.estimated_energy_savings_percent.toFixed(0)}%
            </div>
            <div className="font-mono text-[9px] text-text-tertiary tracking-[0.08em] mt-0.5">
              ENERGY SAVED
            </div>
          </div>
        </div>
      </div>

      {/* Interventions */}
      <div className="mb-5">
        <div className="font-mono text-[9px] tracking-[0.08em] text-text-tertiary mb-2">
          INTERVENTIONS
        </div>
        <InterventionCards options={analysis.intervention_options} />
      </div>

      {/* Hero product showcase — persistent, shows on every completed analysis */}
      <HeroProduct />

      {/* Recommended bundle */}
      <div className="mb-5">
        <div className="font-mono text-[9px] tracking-[0.08em] text-text-tertiary mb-1.5">
          RECOMMENDED BUNDLE
        </div>
        <p className="text-sm text-text-primary leading-relaxed border-l-2 border-accent-cool pl-4">
          {analysis.recommended_bundle}
        </p>
      </div>

      {/* BRSR */}
      <div className="mb-5">
        <div className="font-mono text-[9px] tracking-[0.08em] text-text-tertiary mb-2">
          BRSR PRINCIPLE 6 · REPORTING LINE ITEMS
        </div>
        <ul className="space-y-1.5">
          {analysis.brsr_principle_6_line_items.map((item, i) => (
            <li
              key={i}
              className="text-xs text-text-secondary pl-3 border-l border-border leading-relaxed"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Reasoning narrative */}
      {analysis.reasoning_narrative && (
        <ReasoningNarrative narrative={analysis.reasoning_narrative} />
      )}

      {/* Confidence + freshness notes */}
      <div className="mt-6 pt-4 border-t border-border flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-mono text-[9px] tracking-[0.08em] text-text-tertiary mb-1">
            DATA FRESHNESS
          </div>
          <p className="text-[10px] text-text-tertiary leading-relaxed font-mono">
            {analysis.data_freshness_notes}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-xs text-text-primary">
            {(analysis.model_confidence * 100).toFixed(0)}%
          </div>
          <div className="font-mono text-[9px] text-text-tertiary tracking-[0.08em]">
            CONFIDENCE
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────

export default function AnalysisPanel() {
  const {
    panelOpen,
    closePanel,
    selectedLat,
    selectedLon,
    analysis,
    servedFromCache,
    error,
  } = useMapStore();

  if (!panelOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-[35%] min-w-[420px] bg-bg border-l border-border z-40 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-bg z-10 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="font-headline text-[10px] uppercase tracking-[0.08em] text-text-primary">
            SITE ANALYSIS
          </span>
          <button
            onClick={closePanel}
            className="text-text-tertiary hover:text-text-primary text-sm transition-colors duration-rail leading-none w-5 h-5 flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="font-mono text-[10px] text-text-tertiary">
          {selectedLat?.toFixed(4)}°N, {selectedLon?.toFixed(4)}°E
        </div>
        {servedFromCache && (
          <div className="mt-1 font-mono text-[9px] text-accent-cool tracking-[0.08em]">
            SERVED FROM CACHE
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        {/* Layer 1: Always show data source streaming */}
        <div className="mb-2">
          <div className="font-mono text-[9px] tracking-[0.08em] text-text-tertiary mb-3">
            DATA SOURCES
          </div>
          <DataSourceList />
        </div>

        <MediaBlock />

        {/* Error state */}
        {error && !analysis && (
          <div className="mt-6 border border-accent-heat/30 p-4 animate-fadeIn">
            <div className="font-headline text-[10px] uppercase tracking-[0.08em] text-accent-heat mb-2">
              ANALYSIS FAILED
            </div>
            <p className="text-xs text-text-secondary font-mono leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {/* Layer 2+3: Analysis appears when ready */}
        {analysis && <GeminiAnalysis analysis={analysis} />}
      </div>
    </div>
  );
}
