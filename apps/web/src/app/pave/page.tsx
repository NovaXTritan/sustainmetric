import Link from "next/link";
import BrandNav from "@/components/BrandNav";

export const metadata = {
  title: "Sustainmetric Pave — Bio-mimetic Cool Road Coating",
  description:
    "V2 in-house formulation for heavy-traffic cool pavement applications. Aliphatic polyurethane binder, IR-reflective CICPs, porous zeolite aggregate, calcined bauxite anti-skid, retroreflective glass beads.",
};

const INNOVATIONS = [
  {
    t: "MMA-PU HYBRID BINDER",
    b: "2 to 3 times the durability of conventional acrylic cool roof systems under heavy-traffic loads. Aliphatic polyurethane chemistry maintains structural integrity against oil spills, UV degradation, and thermal cycling that destroys acrylic alternatives within six months.",
  },
  {
    t: "IR-REFLECTIVE CICPs",
    b: "Complex inorganic color pigments replace TiO2. The surface appears dark (matching conventional asphalt, eliminating driver glare) while maintaining high infrared reflectance. This is the innovation that makes cool roads road-safe, which no existing commercial product solves.",
  },
  {
    t: "POROUS ZEOLITE AGGREGATE",
    b: "Microscopically porous structural aggregate. Acts as soil-like moisture storage, enabling the drain-to-roots evapotranspiration mechanism that releases absorbed rainwater as cooling vapor during peak heat. This is the bio-mimetic innovation — the coating cools like soil cools.",
  },
  {
    t: "HOLLOW CERAMIC MICROSPHERES (6%)",
    b: "Thermal insulation plus reflection, balanced against structural integrity for pavement applications.",
  },
  {
    t: "CALCINED BAUXITE ANTI-SKID",
    b: "Wet-grip safety aggregate for road applications, superior to standard silica. Meets heavy-traffic friction standards for high-risk zones like intersections, toll plazas, and pedestrian crossings.",
  },
  {
    t: "RETROREFLECTIVE GLASS BEADS (20%)",
    b: "Night visibility under headlights — a critical safety feature absent from all existing cool pavement products in the Indian market.",
  },
];

const DEPLOYMENT_CONTEXTS = [
  {
    title: "URBAN INTERSECTIONS & CHOWKS",
    tag: "PACKAGE B · ADOPT-A-CHOWK",
    body: "Stormwater management plus heat-island mitigation in high-traffic zones. Paired with structural soil tree pits for maximum evapotranspiration cooling. Funded through municipal MoUs and corporate stormwater-avoided-cost contracts.",
  },
  {
    title: "ROAD CORRIDORS & MIYAWAKI KILOMETERS",
    tag: "PACKAGE C · ADOPT-A-KILOMETER",
    body: "Continuous 500m–2km cool corridors on commuter walkways, flyover gaps, and median edges. Paired with Miyawaki plantings for shaded canopy integration. Annuity revenue through corporate eco-branding leases.",
  },
  {
    title: "PARKING STRUCTURES & SMART-CITY CORRIDORS",
    tag: "STANDALONE DEPLOYMENT",
    body: "Primary heat-vulnerable surfaces in corporate campuses, logistics hubs, toll plazas, and infrastructure project sites. Direct procurement through BRSR Principle 6 environmental CSR budgets.",
  },
];

export default function PavePage() {
  return (
    <main className="min-h-screen bg-bg text-text-primary overflow-x-hidden">
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-bg via-bg/90 to-transparent">
        <BrandNav />
        <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary">
          PAVE · ROAD COATING
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center px-[8%] pt-24">
        <div className="max-w-[760px]">
          <div className="font-mono text-[10px] text-accent-cool tracking-[0.12em] mb-4">
            V2 IN-HOUSE FORMULATION · R&D PIPELINE
          </div>
          <h1 className="font-headline text-4xl md:text-5xl uppercase leading-[0.95] tracking-headline font-medium mb-6">
            SUSTAINMETRIC
            <br />
            PAVE
          </h1>
          <p className="font-body text-lg leading-[1.6] text-text-secondary mb-4 max-w-[620px]">
            Bio-mimetic cool road coating for Indian cities. Safer streets,
            cooler cities.
          </p>
          <p className="font-body text-sm leading-relaxed text-text-tertiary mb-10 max-w-[620px]">
            V2 in-house formulation currently in R&D pipeline. Targeting
            validation through field testing in Delhi NCR by Q3 2026. V1
            Package B and C deployments use commercially available reflective
            coatings and permeable pavement systems.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#innovations"
              className="inline-flex items-center gap-3 border border-white px-6 py-3 text-sm uppercase tracking-button font-medium text-white hover:bg-white/[0.08] transition-all duration-rail"
            >
              VIEW THE TECHNICAL SPEC
              <span>→</span>
            </a>
            <Link
              href="/app/map"
              className="inline-flex items-center gap-3 border border-accent-cool/60 px-6 py-3 text-sm uppercase tracking-button font-medium text-accent-cool hover:bg-accent-cool/10 transition-all duration-rail"
            >
              OPEN THE AI PLATFORM
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="h-px bg-white/[0.12]" />

      {/* Problem */}
      <section className="px-[8%] py-20">
        <div className="font-mono text-[10px] text-accent-cool tracking-[0.12em] mb-4">
          THE PROBLEM
        </div>
        <p className="max-w-[720px] text-base leading-[1.7] text-text-primary/85">
          Indian roads and pavements absorb up to 90% of incident solar
          radiation, creating urban heat islands that drive mortality and
          energy demand. Existing cool pavement products either fail under
          heavy traffic load or lose reflectance within six months.
          Commercial reflective paints are designed for light-traffic
          contexts. No product on the Indian market combines heavy-traffic
          durability, driver-safety considerations, and monsoon stormwater
          integration.
        </p>
      </section>

      <div className="h-px bg-white/[0.12]" />

      {/* Innovations */}
      <section id="innovations" className="px-[8%] py-20">
        <div className="font-mono text-[10px] text-accent-cool tracking-[0.12em] mb-8">
          THE INNOVATIONS
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 max-w-[1100px]">
          {INNOVATIONS.map((inn) => (
            <div key={inn.t} className="border-l-2 border-accent-cool/50 pl-5">
              <div className="font-mono text-[12px] tracking-[0.08em] text-text-primary uppercase mb-2">
                {inn.t}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {inn.b}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-white/[0.12]" />

      {/* Manufacturing */}
      <section className="px-[8%] py-20">
        <div className="font-mono text-[10px] text-accent-cool tracking-[0.12em] mb-4">
          THE MANUFACTURING REALITY
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-[1100px]">
          <div>
            <div className="font-headline text-sm uppercase tracking-button mb-3">
              PART A · RESIN
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Aliphatic polyurethane resin with additives, dispersants, and
              stabilizers. Packaged in airtight metal drums. Shelf life
              12–24 months.
            </p>
          </div>
          <div>
            <div className="font-headline text-sm uppercase tracking-button mb-3">
              PART B · AGGREGATE MIX
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Porous zeolite, calcined bauxite, IR-reflective CICPs, hollow
              ceramic microspheres, retroreflective glass beads. Packaged in
              multi-layer laminated bags. Shelf life 6–12 months.
            </p>
          </div>
          <div>
            <div className="font-headline text-sm uppercase tracking-button mb-3">
              MIXING & APPLICATION
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              1:3 or 1:4 Part A : Part B ratio, mixed on-site immediately
              before application. Pot life 30–60 minutes after mixing.
              Applied via screeding or specialized spraying at 2–4mm
              thickness.
            </p>
          </div>
          <div>
            <div className="font-headline text-sm uppercase tracking-button mb-3">
              FIELD OPERATIONS
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Installation by civil engineering contractors operating under
              municipal MoUs for Package B, and by Miyawaki specialist
              consortia paired with Self-Help Groups for Package C
              maintenance continuity.
            </p>
          </div>
        </div>
      </section>

      <div className="h-px bg-white/[0.12]" />

      {/* Drain to roots */}
      <section className="px-[8%] py-20">
        <div className="border border-accent-cool/40 bg-accent-cool/[0.03] p-6 max-w-[900px]">
          <div className="font-mono text-[10px] text-accent-cool tracking-[0.12em] mb-3">
            DRAIN TO ROOTS · CRITICAL NOTE
          </div>
          <p className="text-[15px] text-text-primary/85 leading-[1.7]">
            For full groundwater recharge, Sustainmetric Pave must be applied
            over a pervious substrate such as porous asphalt or pervious
            concrete. When applied over conventional solid asphalt, the
            coating functions as a water-retaining evaporative topcoat that
            manages surface runoff and delivers evaporative cooling through
            the monsoon-to-dry-season cycle — but the underlying solid
            substrate blocks groundwater penetration. Deployment context
            must be specified per project.
          </p>
        </div>
      </section>

      <div className="h-px bg-white/[0.12]" />

      {/* Deployment contexts */}
      <section className="px-[8%] py-20">
        <div className="font-mono text-[10px] text-accent-cool tracking-[0.12em] mb-8">
          DEPLOYMENT CONTEXTS
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border max-w-[1100px]">
          {DEPLOYMENT_CONTEXTS.map((ctx) => (
            <div key={ctx.title} className="bg-bg p-6">
              <div className="font-mono text-[9px] text-accent-cool tracking-[0.12em] mb-2">
                {ctx.tag}
              </div>
              <div className="font-headline text-sm uppercase tracking-button text-text-primary mb-3 leading-snug">
                {ctx.title}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {ctx.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-white/[0.12]" />

      {/* AI platform */}
      <section className="px-[8%] py-20">
        <div className="font-mono text-[10px] text-accent-cool tracking-[0.12em] mb-4">
          HOW DEPLOYMENT DECISIONS GET MADE
        </div>
        <p className="max-w-[720px] text-base leading-[1.7] text-text-primary/85 mb-6">
          Sustainmetric&apos;s AI intelligence platform reads seven live data
          sources for any street in India — atmospheric conditions, air
          quality, building fabric, soil temperature, street imagery,
          ward-level geography, thermal anomalies — and identifies the
          sites where Sustainmetric Pave will deliver the highest impact
          per rupee committed. Corporate BRSR Principle 6 funds route
          directly to verified installations through the Sustainmetric
          commit flow.
        </p>
        <Link
          href="/app/map"
          className="inline-flex items-center gap-3 border border-accent-cool/60 px-6 py-3 text-sm uppercase tracking-button font-medium text-accent-cool hover:bg-accent-cool/10 transition-all duration-rail"
        >
          RUN AI ANALYSIS FOR A SPECIFIC SITE
          <span>→</span>
        </Link>
      </section>

      {/* Disclaimer footer */}
      <footer className="border-t border-white/[0.12] px-[8%] py-10">
        <p className="font-mono text-[10px] text-text-tertiary/70 leading-relaxed max-w-[700px]">
          Sustainmetric Pave is a V2 proprietary formulation currently in R&D.
          V1 Package B and C deployments use commercially available reflective
          coatings and permeable pavement systems from established
          manufacturers until Pave validates through field testing.
        </p>
      </footer>
    </main>
  );
}
