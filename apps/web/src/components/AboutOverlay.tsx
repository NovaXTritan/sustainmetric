"use client";

import { useEffect, useState } from "react";
import { getPackages, type InterventionPackage, type PackageId } from "@/lib/api";
import { clearTier, readTier, type Tier } from "@/lib/tier";
import CommitModal from "./CommitModal";
import V2Roadmap from "./V2Roadmap";

interface AboutOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SOURCES = [
  {
    name: "OPEN-METEO",
    description: "Live atmospheric conditions: temperature, humidity, wind, UV",
    endpoint: "api.open-meteo.com/v1/forecast",
  },
  {
    name: "OPENAQ",
    description: "Real-time PM2.5 from CPCB-operated air quality monitors",
    endpoint: "api.openaq.org/v3/locations",
  },
  {
    name: "OVERPASS (OSM)",
    description: "Buildings, roads, parks, water bodies, land use",
    endpoint: "overpass.kumi.systems/api/interpreter",
  },
  {
    name: "ERA5 REANALYSIS",
    description: "Modeled soil temperature and surface moisture",
    endpoint: "api.open-meteo.com/v1/forecast (ECMWF)",
  },
  {
    name: "MAPILLARY",
    description: "Crowdsourced street-level panorama imagery",
    endpoint: "graph.mapillary.com/images",
  },
  {
    name: "NOMINATIM",
    description: "Ward and district reverse-geocoding",
    endpoint: "nominatim.openstreetmap.org",
  },
  {
    name: "NASA FIRMS",
    description: "Thermal anomaly detection (fires, industrial heat)",
    endpoint: "firms.modaps.eosdis.nasa.gov/api",
  },
];

const PRICING_TIERS: { id: Tier; label: string; quota: string; price: string; pitch: string }[] = [
  {
    id: "individual",
    label: "INDIVIDUAL",
    quota: "50 queries / month",
    price: "Free in V1 · future freemium ₹499/month",
    pitch: "Property-level cooling recommendations for homeowners and small businesses.",
  },
  {
    id: "community",
    label: "COMMUNITY",
    quota: "500 queries / month",
    price: "₹4,999/month",
    pitch: "Neighborhood-scale planning for RWAs, schools, and resident associations.",
  },
  {
    id: "corporate",
    label: "CORPORATE",
    quota: "5000 queries / month",
    price: "Custom enterprise contracts from ₹2 lakh/month",
    pitch: "BRSR Principle 6 audit-grade verification and Adopt-a-Kilometer annuity management.",
  },
];

const CITATIONS = [
  {
    authors: "Peng et al.",
    year: 2012,
    journal: "Environ. Sci. Technol.",
    title: "Surface urban heat island across 419 global big cities",
  },
  {
    authors: "Kumari et al.",
    year: 2021,
    journal: "J. Indian Soc. Remote Sensing",
    title: "Impact of urban sprawl on SUHI of Delhi-NCR using Landsat",
  },
  {
    authors: "Aslam et al.",
    year: 2021,
    journal: "Remote Sensing Applications",
    title: "Long-term assessment of UHI intensity over Delhi NCR",
  },
  {
    authors: "Urban Labs & J-PAL South Asia",
    year: 2024,
    journal: "UChicago Urban Labs",
    title: "Cool roofs RCT in Delhi informal settlements (with MHT)",
  },
  {
    authors: "SEBI",
    year: 2023,
    journal: "Circular SEBI/HO/CFD/CFD-SEC-2",
    title: "BRSR Core framework for assurance and ESG disclosures",
  },
  {
    authors: "Lancet Countdown",
    year: 2024,
    journal: "Lancet Countdown",
    title: "Health and economic impacts of heat exposure in India",
  },
];

function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AboutOverlay({ open, onClose }: AboutOverlayProps) {
  const [packages, setPackages] = useState<InterventionPackage[]>([]);
  const [previewPackage, setPreviewPackage] = useState<PackageId | null>(null);
  const [currentTier, setCurrentTier] = useState<Tier | null>(null);

  // Load packages once when overlay opens for the first time
  useEffect(() => {
    if (!open || packages.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { packages: pkgs } = await getPackages();
        if (!cancelled) setPackages(pkgs);
      } catch {
        // Catalog will show fallback empty state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, packages.length]);

  // Read current tier whenever overlay opens
  useEffect(() => {
    if (open) setCurrentTier(readTier());
  }, [open]);

  function handleSwitchTier() {
    clearTier();
    setCurrentTier(null);
    onClose();
    // Reload to surface the tier selector again
    if (typeof window !== "undefined") window.location.reload();
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-bg/95 overflow-y-auto animate-fadeIn"
        onClick={onClose}
      >
        <div
          className="min-h-full max-w-5xl mx-auto px-[8%] py-12"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with explicit close button (top-right) */}
          <div className="flex items-center justify-between mb-12">
            <span className="font-headline text-sm uppercase tracking-[0.08em] text-text-primary">
              SUSTAINMETRIC · ABOUT
            </span>
            <button
              onClick={onClose}
              className="font-mono text-xs text-text-tertiary hover:text-text-primary uppercase tracking-[0.08em] transition-colors duration-rail border border-border hover:border-border-strong px-3 py-1.5"
            >
              CLOSE ✕
            </button>
          </div>

          {/* Section 1: Thesis */}
          <section className="mb-12">
            <div className="font-mono text-[10px] tracking-[0.08em] text-accent-cool mb-3">
              THE THESIS
            </div>
            <p className="text-base text-text-primary/90 leading-[1.7] max-w-[680px]">
              Indian cities generate more decision-relevant climate data every day than any
              human institution can process. Sustainmetric is the first multimodal
              intelligence engine that closes that gap. We pull seven heterogeneous public
              data sources for any latitude and longitude in India, feed them to a single
              multimodal AI call, and return a structured intervention plan with cost
              estimates, equity weighting, and an audit-grade verification chain compatible
              with SEBI BRSR Principle 6. The processing window we operate in opened in
              late 2024 and is roughly twelve months old.
            </p>
          </section>

          <div className="border-t border-border/60 mb-12" />

          {/* Section 2: Data sources */}
          <section className="mb-12">
            <div className="font-mono text-[10px] tracking-[0.08em] text-accent-cool mb-4">
              THE SEVEN DATA SOURCES
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
              {SOURCES.map((s) => (
                <div key={s.name} className="bg-bg p-5">
                  <div className="font-headline text-xs uppercase tracking-[0.08em] text-text-primary mb-1">
                    {s.name}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed mb-2">
                    {s.description}
                  </p>
                  <code className="font-mono text-[10px] text-text-tertiary">
                    {s.endpoint}
                  </code>
                </div>
              ))}
            </div>
          </section>

          <div className="border-t border-border/60 mb-12" />

          {/* Section 3: Execution catalog */}
          <section className="mb-12">
            <div className="font-mono text-[10px] tracking-[0.08em] text-accent-cool mb-2">
              THE EXECUTION CATALOG
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mb-4 max-w-[680px]">
              Every recommendation Sustainmetric surfaces routes corporate funds toward one
              of three productized service packages. Click any package below to preview
              what a hypothetical commitment would look like — cost math, BRSR Principle 6
              line items, implementation partner type.
            </p>
            {packages.length === 0 ? (
              <div className="font-mono text-[10px] text-text-tertiary tracking-[0.08em] py-4">
                LOADING CATALOG…
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setPreviewPackage(pkg.id)}
                    className="bg-bg p-5 text-left hover:bg-bg-elevated transition-colors duration-rail border border-transparent hover:border-accent-cool/40 group"
                  >
                    <div className="font-mono text-[9px] text-accent-cool tracking-[0.12em] mb-2">
                      {pkg.id === "skin"
                        ? "PACKAGE A"
                        : pkg.id === "chowk"
                          ? "PACKAGE B"
                          : "PACKAGE C"}
                    </div>
                    <div className="font-headline text-sm uppercase tracking-button text-text-primary mb-2 leading-snug">
                      {pkg.name.split("·")[1]?.trim() || pkg.name}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed mb-3">
                      {pkg.short_description}
                    </p>
                    <div className="space-y-1 font-mono text-[10px] text-text-tertiary">
                      <div>
                        ₹{pkg.cost_per_sqm_min_inr}–{pkg.cost_per_sqm_max_inr}/sqm
                      </div>
                      <div>{pkg.typical_timeline_months}mo typical timeline</div>
                      <div className="leading-snug">
                        {humanize(pkg.implementation_partner_type)}
                      </div>
                    </div>
                    <div className="mt-3 font-headline text-[9px] uppercase tracking-[0.12em] text-accent-cool group-hover:translate-x-0.5 transition-transform duration-rail">
                      PREVIEW →
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="border-t border-border/60 mb-12" />

          {/* Section 4: Pricing by tier */}
          <section className="mb-12">
            <div className="font-mono text-[10px] tracking-[0.08em] text-accent-cool mb-4">
              PRICING BY TIER
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border mb-4">
              {PRICING_TIERS.map((row) => (
                <div
                  key={row.id}
                  className={`bg-bg p-5 ${
                    currentTier === row.id ? "border border-accent-cool/60" : "border border-transparent"
                  }`}
                >
                  <div className="font-headline text-xs uppercase tracking-button text-text-primary mb-2">
                    {row.label}
                    {currentTier === row.id && (
                      <span className="ml-2 font-mono text-[9px] text-accent-cool tracking-[0.12em]">
                        · YOUR TIER
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-text-tertiary tracking-[0.08em] mb-2">
                    {row.quota.toUpperCase()}
                  </div>
                  <div className="font-mono text-[11px] text-text-primary mb-3">
                    {row.price}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {row.pitch}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={handleSwitchTier}
              className="font-headline text-[10px] uppercase tracking-[0.12em] text-accent-cool hover:text-text-primary transition-colors border border-border hover:border-accent-cool/40 px-4 py-2"
            >
              SWITCH TIER →
            </button>
          </section>

          <div className="border-t border-border/60 mb-12" />

          {/* Section 5: V2 roadmap */}
          <section className="mb-12">
            <V2Roadmap />
          </section>

          <div className="border-t border-border/60 mb-12" />

          {/* Section 6: Evidence base */}
          <section className="mb-12">
            <div className="font-mono text-[10px] tracking-[0.08em] text-accent-cool mb-4">
              THE EVIDENCE BASE
            </div>
            <ul className="space-y-3">
              {CITATIONS.map((c, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-4 text-sm text-text-primary/85 pb-3 border-b border-border/50 last:border-0"
                >
                  <span className="font-mono text-xs text-text-tertiary shrink-0 w-12">
                    {c.year}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="text-text-primary">{c.title}</span>
                      <span className="text-text-tertiary"> — {c.authors}</span>
                    </div>
                    <div className="font-mono text-[10px] text-text-tertiary mt-0.5">
                      {c.journal}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Preview-mode commit modal — opened from Execution Catalog cells */}
      {previewPackage && (
        <CommitModal
          open={true}
          onClose={() => setPreviewPackage(null)}
          packageId={previewPackage}
          mode="preview"
        />
      )}
    </>
  );
}
