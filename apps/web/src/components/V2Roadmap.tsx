"use client";

import Link from "next/link";

/**
 * V2 ROADMAP · PROPRIETARY FORMULATIONS
 *
 * Two branded in-house product tracks:
 *   - Sustainmetric Pave (roads)   — aliphatic polyurethane
 *   - Sustainmetric Skin (rooftops) — potassium silicate
 *
 * Each product has its own chemistry, innovations, and deployment contexts.
 * Composed into Section 5 of the About overlay; also linked from /pave and
 * /skin dedicated product pages.
 */

interface Innovation {
  title: string;
  body: string;
}

const PAVE_INNOVATIONS: Innovation[] = [
  {
    title: "MMA-PU HYBRID BINDER",
    body: "2 to 3 times the durability of conventional acrylic cool roof systems under heavy-traffic loads. Aliphatic polyurethane chemistry maintains structural integrity against oil spills, UV degradation, and thermal cycling that destroys acrylic alternatives within six months.",
  },
  {
    title: "IR-REFLECTIVE CICPs",
    body: "Complex inorganic color pigments replace TiO2. The surface appears dark (matching conventional asphalt, eliminating driver glare) while maintaining high infrared reflectance. This is the innovation that makes cool roads road-safe, which no existing commercial product solves.",
  },
  {
    title: "POROUS ZEOLITE AGGREGATE",
    body: "Microscopically porous structural aggregate. Acts as soil-like moisture storage, enabling the drain-to-roots evapotranspiration mechanism that releases absorbed rainwater as cooling vapor during peak heat. This is the bio-mimetic innovation — the coating cools like soil cools.",
  },
  {
    title: "HOLLOW CERAMIC MICROSPHERES (6%)",
    body: "Thermal insulation plus reflection, balanced against structural integrity for pavement applications.",
  },
  {
    title: "CALCINED BAUXITE ANTI-SKID",
    body: "Wet-grip safety aggregate for road applications, superior to standard silica. Meets heavy-traffic friction standards for high-risk zones like intersections, toll plazas, and pedestrian crossings.",
  },
  {
    title: "RETROREFLECTIVE GLASS BEADS (20%)",
    body: "Night visibility under headlights — a critical safety feature absent from all existing cool pavement products in the Indian market.",
  },
];

const SKIN_INNOVATIONS: Innovation[] = [
  {
    title: "POTASSIUM SILICATE BINDER",
    body: "Breathable, low-VOC, GRIHA and LEED compatible. Replaces conventional acrylic binders that trap moisture and trigger dark algae growth within 12–18 months of install.",
  },
  {
    title: "DUAL-ACTION EVAPOTRANSPIRATION",
    body: "High solar reflectance combined with passive moisture release. Absorbs ambient humidity overnight, releases as cooling vapor during peak heat, delivering up to 4°C indoor temperature reduction beyond what reflection alone achieves.",
  },
  {
    title: "ANTI-FUNGAL SHIELD",
    body: "Prevents dark algae and biological growth that degrades roof reflectance within 12–18 months for conventional cool roof paints in humid Indian conditions.",
  },
  {
    title: "SUBSTRATE VERSATILITY",
    body: "Bonds to concrete, metal, tile, and asphalt rooftop surfaces without separate primer. One product, four substrates.",
  },
  {
    title: "30% COOLING ENERGY REDUCTION",
    body: "Peer-reviewed cool roof RCT data from UChicago Urban Labs / J-PAL South Asia in Delhi informal settlements, extrapolated to the Skin formulation.",
  },
];

function InnovationList({ items }: { items: Innovation[] }) {
  return (
    <ul className="space-y-3 mb-8 max-w-[720px]">
      {items.map((inn) => (
        <li key={inn.title} className="border-l-2 border-accent-cool/50 pl-4 py-1">
          <div className="font-mono text-[11px] tracking-[0.08em] text-text-primary uppercase mb-1">
            {inn.title}
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{inn.body}</p>
        </li>
      ))}
    </ul>
  );
}

export default function V2Roadmap() {
  return (
    <section>
      <div className="font-mono text-[10px] tracking-[0.08em] text-accent-cool mb-4">
        V2 ROADMAP · PROPRIETARY FORMULATIONS
      </div>

      {/* Intro */}
      <p className="text-sm text-text-primary/85 leading-[1.7] mb-8 max-w-[720px]">
        Sustainmetric&apos;s V2 pipeline includes two branded in-house formulations that
        replace the generic proprietary coating described in V1. Pave targets
        heavy-traffic road and pavement applications with an aliphatic polyurethane
        chemistry optimized for durability, driver safety, and monsoon stormwater
        integration. Skin targets breathable low-VOC rooftop applications with a
        potassium silicate chemistry optimized for indoor comfort, anti-fungal
        protection, and green-building certification compatibility. Both are in R&D.
        V1 Package A deployments use commercial coatings from established manufacturers
        until Pave and Skin validate through field testing.
      </p>

      {/* ── SUSTAINMETRIC PAVE ─────────────────────────────── */}
      <div className="border-t border-white/[0.12] pt-8 mb-10">
        <div className="flex items-baseline justify-between gap-4 mb-2 flex-wrap">
          <div>
            <div className="font-headline text-lg uppercase tracking-button text-text-primary">
              SUSTAINMETRIC PAVE
            </div>
            <div className="font-mono text-[11px] text-text-tertiary mt-1">
              Bio-mimetic cool road coating. Safer streets, cooler cities.
            </div>
          </div>
          <Link
            href="/pave"
            className="font-headline text-[10px] uppercase tracking-[0.12em] text-accent-cool hover:text-text-primary border border-border hover:border-accent-cool/40 px-3 py-1.5 transition-colors"
          >
            VIEW FULL PRODUCT PAGE →
          </Link>
        </div>

        <InnovationList items={PAVE_INNOVATIONS} />

        {/* Manufacturing reality */}
        <div className="mb-6 max-w-[720px]">
          <div className="font-headline text-xs uppercase tracking-button text-text-primary mb-2">
            THE MANUFACTURING REALITY
          </div>
          <p className="text-sm text-text-primary/85 leading-[1.7]">
            The formulation is a reactive PU-based system, not a conventional paint.
            It ships as a two-part kit — Part A (aliphatic PU resin with additives,
            dispersants, stabilizers in airtight metal drums) and Part B (aggregate
            mix with porous zeolite, calcined bauxite, CICPs, glass beads in
            multi-layer laminated bags) — mixed on-site in 1:3 or 1:4 ratio
            immediately before application. Shelf life is 12 to 24 months for
            Part A and 6 to 12 months for Part B. Applied via screeding or
            specialized spraying at 2–4mm thickness. Pot life after mixing is
            30–60 minutes.
          </p>
        </div>

        {/* Drain-to-roots reality check */}
        <div className="mb-2 max-w-[720px] border border-accent-cool/40 bg-accent-cool/[0.03] p-4">
          <div className="font-headline text-xs uppercase tracking-button text-accent-cool mb-2">
            DRAIN TO ROOTS · CRITICAL NOTE
          </div>
          <p className="text-[13px] text-text-primary/85 leading-[1.7]">
            For full groundwater recharge, Sustainmetric Pave must be applied over
            a pervious substrate such as porous asphalt or pervious concrete. When
            applied over conventional solid asphalt, the coating functions as a
            water-retaining evaporative topcoat that manages surface runoff and
            delivers evaporative cooling through the monsoon-to-dry-season cycle —
            but the underlying solid substrate blocks groundwater penetration.
            Deployment context must be specified per project.
          </p>
        </div>
      </div>

      {/* ── SUSTAINMETRIC SKIN ─────────────────────────────── */}
      <div className="border-t border-white/[0.12] pt-8 mb-10">
        <div className="flex items-baseline justify-between gap-4 mb-2 flex-wrap">
          <div>
            <div className="font-headline text-lg uppercase tracking-button text-text-primary">
              SUSTAINMETRIC SKIN
            </div>
            <div className="font-mono text-[11px] text-text-tertiary mt-1">
              Bio-mimetic cool roof adhesive. Active cooling, smarter savings.
            </div>
          </div>
          <Link
            href="/skin"
            className="font-headline text-[10px] uppercase tracking-[0.12em] text-accent-cool hover:text-text-primary border border-border hover:border-accent-cool/40 px-3 py-1.5 transition-colors"
          >
            VIEW FULL PRODUCT PAGE →
          </Link>
        </div>

        <InnovationList items={SKIN_INNOVATIONS} />

        <div className="mb-2 max-w-[720px]">
          <div className="font-headline text-xs uppercase tracking-button text-text-primary mb-2">
            TARGET CUSTOMERS
          </div>
          <p className="text-sm text-text-primary/85 leading-[1.7]">
            Residential homeowners, commercial buildings, industrial sheds and
            warehouses, institutional rooftops (schools, anganwadis, clinics, cold
            storage). Installed directly by trained Eco Therm Crew installers and
            partner NGOs such as Mahila Housing SEWA Trust.
          </p>
        </div>
      </div>

      {/* ── UNIFIED DEPLOYMENT MODEL ───────────────────────── */}
      <div className="border-t border-white/[0.12] pt-8 mb-6">
        <div className="font-headline text-xs uppercase tracking-button text-text-primary mb-2">
          THE UNIFIED DEPLOYMENT MODEL
        </div>
        <p className="text-sm text-text-primary/85 leading-[1.7] max-w-[720px]">
          Both products are deployed through the same three execution packages — the
          Skin package (rooftops) uses Sustainmetric Skin, and the Chowk and
          Kilometer packages (road and intersection surfaces) use Sustainmetric
          Pave. Installation runs through the same partner network (certified cool
          roof installers, civil engineering contractors under municipal MoUs,
          Miyawaki specialists, Self-Help Groups). Funding is routed through the
          same Sustainmetric AI platform that identifies the highest-impact
          intervention sites and connects BRSR Principle 6-compliant corporate
          capital to on-ground deployment. One software brain, one service catalog,
          two branded in-house products, integrated end-to-end.
        </p>
      </div>

      {/* Disclaimer footer */}
      <p className="font-mono text-[10px] text-text-tertiary/70 leading-relaxed max-w-[680px] pt-4 border-t border-border/40">
        V2 proprietary formulations are currently in R&D. V1 Package A deployments
        use commercially available reflective coatings with ceramic microspheres
        from established manufacturers.
      </p>
    </section>
  );
}
