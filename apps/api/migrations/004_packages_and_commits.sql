-- Migration 004: intervention packages and commit-funding flow
-- Depends on: 002_create_tables.sql, 003_enable_rls.sql

-- ============================================================
-- intervention_packages — three productized service packages
-- that Sustainmetric routes committed corporate funds toward
-- ============================================================
CREATE TABLE IF NOT EXISTS intervention_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    full_description TEXT NOT NULL,
    intervention_types TEXT[] NOT NULL,
    cost_per_sqm_min_inr INTEGER NOT NULL,
    cost_per_sqm_max_inr INTEGER NOT NULL,
    typical_timeline_months INTEGER NOT NULL,
    implementation_partner_type TEXT NOT NULL,
    brsr_principle_6_coverage TEXT[] NOT NULL,
    is_proprietary BOOLEAN NOT NULL DEFAULT false,
    proprietary_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO intervention_packages (
    id, name, short_description, full_description, intervention_types,
    cost_per_sqm_min_inr, cost_per_sqm_max_inr, typical_timeline_months,
    implementation_partner_type, brsr_principle_6_coverage,
    is_proprietary, proprietary_notes
) VALUES
('skin',
 'Package A · The Skin',
 'Cool roofs and reflective surfaces for informal and commercial buildings',
 'Skin converts heat-absorbing rooftops and vertical surfaces into passive cooling assets. V1 deploys commercially available reflective coatings with ceramic microspheres, china mosaic tile retrofits, and green wall installations where structurally feasible. Documented surface temperature reduction of 8.7 to 34.2 degrees Celsius and indoor temperature drops of 2.1 to 4.3 degrees Celsius in peer-reviewed field studies. Mandated by Telangana Cool Roof Policy 2023-2028 for commercial buildings and residential plots above 600 square yards, with compliance gated through the TS-bPASS occupancy certificate system. V2 will deploy the Sustainmetric proprietary advanced reflective formulation currently in R&D, combining MMA-PU hybrid binder, IR-reflective complex inorganic color pigments, hollow ceramic microsphere insulation, anti-skid calcined bauxite for pavement applications, and night-visibility glass beads for road integration.',
 ARRAY['cool_roof', 'reflective_pavement', 'green_wall'],
 150, 450, 3,
 'certified_cool_roof_installer_or_sustainmetric_field_team',
 ARRAY['green_credits_generated_or_procured', 'energy_intensity_ratios', 'environmental_impact_assessment'],
 true,
 'Proprietary formulation targeting 2-3x durability of existing market leaders via MMA-PU hybrid binder. IR-reflective pigments replace TiO2 to enable dark visible surface while maintaining thermal reflectance, eliminating driver glare for road applications. Two-part packaging system (Part A resin, Part B aggregate + pigment) extends shelf life to 12-24 months. Application by screeding or specialized spraying to 2-4mm thickness.'
),
('chowk',
 'Package B · Adopt-a-Chowk',
 'Sponge-tech intersections that absorb monsoon water and cool the urban core',
 'Chowk converts traditional asphalt-and-concrete intersections into integrated urban water sinks. Permeable pavers or porous asphalt at the surface allow rainwater to pass through, structural soil and gap-graded crushed stone reservoirs underneath store monsoon runoff and prevent drain overflow, integrated tree pits with curb-cut runoff capture enable bio-retention filtering, and managed overflow connections to existing drainage handle extreme weather events. The system delivers evapotranspiration cooling through wetted soil and supported tree canopy, stormwater mitigation through subterranean storage, and pollutant filtration through bio-retention before groundwater recharge. Revenue model combines stormwater avoided-cost contracts with municipal corporations and Green Credit Programme compatibility for verified tree plantings.',
 ARRAY['permeable_pavement', 'water_body', 'urban_tree', 'pocket_park'],
 800, 2500, 6,
 'civil_engineering_contractor_under_municipal_mou',
 ARRAY['water_withdrawal_intensity', 'green_credits_generated_or_procured', 'environmental_impact_assessment'],
 false,
 NULL
),
('kilometer',
 'Package C · Adopt-a-Kilometer',
 'Miyawaki-density native forest corridors on underused urban strips',
 'Kilometer converts derelict urban strips, especially under-flyover gaps and median edges, into continuous 500-meter to 2-kilometer cool corridors. Miyawaki-method dense native plantings provide shade and biodiversity, cool pavement coatings on walkways prevent radiant heat, structural tree pits capture stormwater, pocket parks anchor high-footfall nodes, and solar-powered water ATMs and misting benches provide pedestrian heat relief. Revenue model is annuity-based: corporate sponsors lease corridors at 5 to 10 lakh rupees per kilometer per month for eco-branding rights plus real-time ESG dashboard data showing CO2 sequestered and groundwater recharged. Implementation pairs Miyawaki specialists with Self-Help Groups for ongoing maintenance, creating local employment tied to corridor health metrics.',
 ARRAY['urban_tree', 'pocket_park', 'permeable_pavement'],
 300, 900, 12,
 'miyawaki_specialist_consortium_with_shg_maintenance',
 ARRAY['green_credits_generated_or_procured', 'biodiversity_impact', 'environmental_impact_assessment'],
 false,
 NULL
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    short_description = EXCLUDED.short_description,
    full_description = EXCLUDED.full_description,
    intervention_types = EXCLUDED.intervention_types,
    cost_per_sqm_min_inr = EXCLUDED.cost_per_sqm_min_inr,
    cost_per_sqm_max_inr = EXCLUDED.cost_per_sqm_max_inr,
    typical_timeline_months = EXCLUDED.typical_timeline_months,
    implementation_partner_type = EXCLUDED.implementation_partner_type,
    brsr_principle_6_coverage = EXCLUDED.brsr_principle_6_coverage,
    is_proprietary = EXCLUDED.is_proprietary,
    proprietary_notes = EXCLUDED.proprietary_notes;

-- ============================================================
-- projects — add commit-funding columns
-- Note: query_id and intervention_option_index added beyond the
-- original prompt spec to preserve the audit link from the
-- analysis that generated the recommendation to the commit row.
-- Without these, the BRSR provenance chain has no anchor.
-- ============================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS package_id TEXT REFERENCES intervention_packages(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS committed_amount_inr INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS platform_fee_inr INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_demo_commitment BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_tier TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS query_id UUID REFERENCES queries(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS intervention_option_index INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_area_sqm INTEGER;

CREATE INDEX IF NOT EXISTS idx_projects_package_id ON projects(package_id);
CREATE INDEX IF NOT EXISTS idx_projects_query_id ON projects(query_id);

-- ============================================================
-- tenants — add customer tier column
-- Note: `plan` column already exists (billing identifier, free/paid).
-- `tier` is the customer-segment classifier (individual/community/corporate).
-- Kept separate for clarity; can be collapsed post-demo.
-- ============================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'corporate'
    CHECK (tier IN ('individual', 'community', 'corporate'));

-- monthly_query_quota already exists on tenants with default 5000; no-op
-- but re-asserted here via IF NOT EXISTS for idempotency across envs
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_query_quota INTEGER NOT NULL DEFAULT 5000;
