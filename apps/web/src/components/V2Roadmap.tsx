"use client";

/**
 * V2 ROADMAP · PROPRIETARY FORMULATIONS
 *
 * Standalone section rendered inside the About overlay (Block 6) describing
 * the team's materials R&D pipeline — the MMA-PU hybrid binder, IR-reflective
 * CICPs, ceramic microspheres, calcined bauxite anti-skid aggregates, and
 * retroreflective glass beads that V2 of Package A will deploy.
 *
 * Kept as its own component so the same copy can be reused outside the
 * About overlay (e.g. a dedicated annex page, a deck-embed, or a
 * partner-facing portal) without duplicating the text.
 */

interface Innovation {
  title: string;
  body: string;
}

const INNOVATIONS: Innovation[] = [
  {
    title: "MMA-PU HYBRID BINDER",
    body: "2 to 3 times the durability of conventional acrylic cool roof coatings under heavy-traffic loads.",
  },
  {
    title: "IR-REFLECTIVE CICPS",
    body: "Complex inorganic color pigments replace TiO2 — dark visible surface eliminates driver glare while maintaining infrared reflectance for thermal benefit.",
  },
  {
    title: "HOLLOW CERAMIC MICROSPHERES (6%)",
    body: "Thermal insulation plus reflection, balanced against structural integrity for pavement applications.",
  },
  {
    title: "CALCINED BAUXITE ANTI-SKID",
    body: "Wet-grip safety aggregate for road applications, superior to standard silica.",
  },
  {
    title: "RETROREFLECTIVE GLASS BEADS (20%)",
    body: "Night visibility — a critical safety feature absent from existing cool pavement products.",
  },
];

export default function V2Roadmap() {
  return (
    <section>
      <div className="font-mono text-[10px] tracking-[0.08em] text-accent-cool mb-4">
        V2 ROADMAP · PROPRIETARY FORMULATIONS
      </div>

      {/* The problem */}
      <div className="mb-8 max-w-[720px]">
        <div className="font-headline text-xs uppercase tracking-button text-text-primary mb-2">
          THE PROBLEM WITH EXISTING COATINGS
        </div>
        <p className="text-sm text-text-primary/85 leading-[1.7]">
          Commercial cool roof coatings achieve 2–4°C indoor cooling but most are designed
          for light-traffic pavements and prioritize reflection over durability. For heavy
          urban applications — roads, parking structures, high-footfall sidewalks — the
          available products either fail under load or lose reflectance within 6 months.
        </p>
      </div>

      {/* The approach */}
      <div className="mb-8 max-w-[720px]">
        <div className="font-headline text-xs uppercase tracking-button text-text-primary mb-2">
          THE SUSTAINMETRIC APPROACH
        </div>
        <p className="text-sm text-text-primary/85 leading-[1.7]">
          V2 of Package A will deploy an in-house formulation designed for heavy-traffic
          cool pavement applications alongside the existing commercial coatings for
          rooftops. The formulation combines five key innovations over the market leader:
        </p>
      </div>

      {/* Five innovations — monospace list */}
      <ul className="space-y-3 mb-8 max-w-[720px]">
        {INNOVATIONS.map((inn) => (
          <li
            key={inn.title}
            className="border-l-2 border-accent-cool/50 pl-4 py-1"
          >
            <div className="font-mono text-[11px] tracking-[0.08em] text-text-primary uppercase mb-1">
              {inn.title}
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              {inn.body}
            </p>
          </li>
        ))}
      </ul>

      {/* Manufacturing reality */}
      <div className="mb-8 max-w-[720px]">
        <div className="font-headline text-xs uppercase tracking-button text-text-primary mb-2">
          THE MANUFACTURING REALITY
        </div>
        <p className="text-sm text-text-primary/85 leading-[1.7]">
          The formulation is a reactive PU-based system, not a conventional paint. It
          ships as a two-part kit — Part A (resin with additives, dispersants, stabilizers
          in airtight metal drums) and Part B (aggregate mix with silica, glass beads,
          pigments, ceramic particles in multi-layer laminated bags) — mixed on-site
          immediately before application. Shelf life is 12 to 24 months for Part A and
          6 to 12 months for Part B. Applied via screeding or specialized spraying at
          2–4mm thickness.
        </p>
      </div>

      {/* What V2 unlocks */}
      <div className="mb-6 max-w-[720px]">
        <div className="font-headline text-xs uppercase tracking-button text-text-primary mb-2">
          WHAT V2 UNLOCKS
        </div>
        <p className="text-sm text-text-primary/85 leading-[1.7]">
          Once the in-house formulation validates, Sustainmetric captures margin across
          both the intelligence layer (software platform fee) and the materials layer
          (product sales to execution partners running Package A installations). This
          converts Sustainmetric from a pure software venture into a vertically integrated
          urban climate infrastructure company.
        </p>
      </div>

      {/* Disclaimer footer */}
      <p className="font-mono text-[10px] text-text-tertiary/70 leading-relaxed max-w-[680px] pt-4 border-t border-border/40">
        V2 proprietary formulation is currently in R&D. V1 Package A deployments use
        commercially available reflective coatings with ceramic microspheres from
        established manufacturers.
      </p>
    </section>
  );
}
