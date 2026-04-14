import Link from "next/link";
import BrandNav from "@/components/BrandNav";

export const metadata = {
  title: "Sustainmetric Skin — Bio-mimetic Cool Roof Adhesive",
  description:
    "V2 in-house formulation for breathable low-VOC cool roof applications. Potassium silicate binder, dual-action evapotranspiration, anti-fungal shield, substrate versatility.",
};

const INNOVATIONS = [
  {
    t: "POTASSIUM SILICATE BINDER",
    b: "Breathable, low-VOC, GRIHA and LEED compatible. Replaces conventional acrylic binders that trap moisture and trigger dark algae growth within 12–18 months of install.",
  },
  {
    t: "DUAL-ACTION EVAPOTRANSPIRATION",
    b: "High solar reflectance combined with passive moisture release. Absorbs ambient humidity overnight, releases as cooling vapor during peak heat, delivering up to 4°C indoor temperature reduction beyond what reflection alone achieves.",
  },
  {
    t: "ANTI-FUNGAL SHIELD",
    b: "Prevents dark algae and biological growth that degrades roof reflectance within 12–18 months for conventional cool roof paints in humid Indian conditions.",
  },
  {
    t: "SUBSTRATE VERSATILITY",
    b: "Bonds to concrete, metal, tile, and asphalt rooftop surfaces without separate primer. One product, four substrates.",
  },
  {
    t: "30% COOLING ENERGY REDUCTION",
    b: "Peer-reviewed cool roof RCT data from UChicago Urban Labs / J-PAL South Asia in Delhi informal settlements, extrapolated to the Skin formulation.",
  },
];

const SUBSTRATES = [
  {
    title: "CONCRETE",
    body: "RCC slab rooftops, most common across Indian urban residential and commercial stock. Direct application, no primer required.",
  },
  {
    title: "METAL",
    body: "Galvanized steel sheds and industrial rooftops. Adhesion layer bonds without separate primer; reduces conductive heat transfer dramatically.",
  },
  {
    title: "TILE",
    body: "Mangalore tile and clay tile rooftops typical of older residential stock. Penetrates porosity for mechanical bond.",
  },
  {
    title: "ASPHALT",
    body: "Built-up roofing and asphalt-membrane rooftops on commercial buildings. UV-stable formulation prevents the degradation cycle that shortens asphalt-membrane life.",
  },
];

const CUSTOMERS = [
  {
    title: "RESIDENTIAL",
    body: "Homeowners seeking indoor comfort and electricity-bill reduction. Mahila Housing SEWA Trust partner installations for informal-settlement rooftops.",
  },
  {
    title: "COMMERCIAL",
    body: "Offices, retail complexes, and mixed-use buildings. Telangana Cool Roof Policy 2023-2028 mandates compliance for buildings above 600 sq yards.",
  },
  {
    title: "INDUSTRIAL",
    body: "Warehouses, logistics sheds, cold storage. Anti-fungal shield is critical where moisture accumulation degrades conventional cool roof paints within 18 months.",
  },
  {
    title: "INSTITUTIONAL",
    body: "Schools, anganwadis, clinics, public health centers. High-equity interventions where indoor-temperature reduction directly improves learning and clinical outcomes.",
  },
];

export default function SkinPage() {
  return (
    <main className="min-h-screen bg-bg text-text-primary overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-bg via-bg/90 to-transparent">
        <BrandNav />
        <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary">
          SKIN · ROOF COATING
        </div>
      </nav>

      <section className="min-h-screen flex items-center px-[8%] pt-24">
        <div className="max-w-[760px]">
          <div className="font-mono text-[10px] text-accent-cool tracking-[0.12em] mb-4">
            V2 IN-HOUSE FORMULATION · R&D PIPELINE
          </div>
          <h1 className="font-headline text-4xl md:text-5xl uppercase leading-[0.95] tracking-headline font-medium mb-6">
            SUSTAINMETRIC
            <br />
            SKIN
          </h1>
          <p className="font-body text-lg leading-[1.6] text-text-secondary mb-4 max-w-[620px]">
            Bio-mimetic cool roof adhesive. Active cooling, smarter savings.
          </p>
          <p className="font-body text-sm leading-relaxed text-text-tertiary mb-10 max-w-[620px]">
            V2 in-house formulation currently in R&D pipeline. Targeting
            validation through field testing by Q3 2026. V1 Package A
            deployments use commercially available reflective coatings with
            ceramic microspheres from established manufacturers.
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

      <section className="px-[8%] py-20">
        <div className="font-mono text-[10px] text-accent-cool tracking-[0.12em] mb-4">
          THE PROBLEM
        </div>
        <p className="max-w-[720px] text-base leading-[1.7] text-text-primary/85">
          Conventional cool roof paints lose reflectance within 12–18 months
          due to dark algae growth in humid Indian conditions. Acrylic
          binders trap moisture. Most products are not GRIHA or LEED
          compatible. Even when surface reflectance is initially high,
          indoor comfort impact is limited to 2–3°C because the rooftop
          surface cools but the ceiling radiates stored heat for hours
          after sunset. Indian cool roofs need to do more than reflect —
          they need to actively release heat.
        </p>
      </section>

      <div className="h-px bg-white/[0.12]" />

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

      <section className="px-[8%] py-20">
        <div className="font-mono text-[10px] text-accent-cool tracking-[0.12em] mb-8">
          SURFACE COMPATIBILITY
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border max-w-[1100px]">
          {SUBSTRATES.map((s) => (
            <div key={s.title} className="bg-bg p-6">
              <div className="font-headline text-sm uppercase tracking-button text-text-primary mb-3">
                {s.title}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-white/[0.12]" />

      <section className="px-[8%] py-20">
        <div className="font-mono text-[10px] text-accent-cool tracking-[0.12em] mb-8">
          TARGET CUSTOMERS
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border max-w-[1100px]">
          {CUSTOMERS.map((c) => (
            <div key={c.title} className="bg-bg p-6">
              <div className="font-headline text-sm uppercase tracking-button text-text-primary mb-3">
                {c.title}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-white/[0.12]" />

      <section className="px-[8%] py-20">
        <div className="font-mono text-[10px] text-accent-cool tracking-[0.12em] mb-4">
          HOW DEPLOYMENT DECISIONS GET MADE
        </div>
        <p className="max-w-[720px] text-base leading-[1.7] text-text-primary/85 mb-6">
          Sustainmetric&apos;s AI intelligence platform reads seven live data
          sources for any rooftop in India — building fabric, atmospheric
          conditions, soil temperature, street imagery — and identifies the
          sites where Sustainmetric Skin will deliver the highest indoor
          temperature reduction per rupee committed. Corporate BRSR
          Principle 6 funds route directly to verified installations
          through the Sustainmetric commit flow.
        </p>
        <Link
          href="/app/map"
          className="inline-flex items-center gap-3 border border-accent-cool/60 px-6 py-3 text-sm uppercase tracking-button font-medium text-accent-cool hover:bg-accent-cool/10 transition-all duration-rail"
        >
          RUN AI ANALYSIS FOR A SPECIFIC SITE
          <span>→</span>
        </Link>
      </section>

      <footer className="border-t border-white/[0.12] px-[8%] py-10">
        <p className="font-mono text-[10px] text-text-tertiary/70 leading-relaxed max-w-[700px]">
          Sustainmetric Skin is a V2 proprietary formulation currently in R&D.
          V1 Package A deployments use commercially available reflective
          coatings with ceramic microspheres from established manufacturers
          until Skin validates through field testing.
        </p>
      </footer>
    </main>
  );
}
