-- Migration 005: branded in-house product line
-- Depends on: 004_packages_and_commits.sql
--
-- Renames the generic "proprietary advanced reflective formulation" framing
-- to two branded products: Sustainmetric Pave (roads) and Sustainmetric Skin
-- (rooftops). Purely a data hygiene update — no schema change, no code path
-- depends on this text field's exact contents. Safe to run any time.

UPDATE intervention_packages
SET proprietary_notes = 'Two in-house bio-mimetic formulations currently in R&D pipeline, named Sustainmetric Pave (aliphatic polyurethane binder for heavy-traffic road and pavement applications) and Sustainmetric Skin (potassium silicate binder for breathable low-VOC rooftop applications compatible with GRIHA and LEED). Both replace the generic "proprietary formulation" framing and give the materials work branded product identity. V1 Package A deployments continue using commercially available reflective coatings with ceramic microspheres from established manufacturers until Pave and Skin validate through field testing.'
WHERE id = 'skin';
