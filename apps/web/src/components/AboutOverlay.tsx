"use client";

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

export default function AboutOverlay({ open, onClose }: AboutOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-bg/95 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="min-h-full max-w-5xl mx-auto px-[8%] py-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
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
            Indian cities generate more decision-relevant climate data every day
            than any human institution can process. Sustainmetric is the first
            multimodal intelligence engine that closes that gap. We pull seven
            heterogeneous public data sources for any latitude and longitude in
            India, feed them to a single multimodal AI call, and return a
            structured intervention plan with cost estimates, equity weighting,
            and an audit-grade verification chain compatible with SEBI BRSR
            Principle 6. The processing window we operate in opened in late 2024
            and is roughly twelve months old.
          </p>
        </section>

        <div className="border-t border-border mb-12" />

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

        <div className="border-t border-border mb-12" />

        {/* Section 3: Evidence base */}
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
  );
}
