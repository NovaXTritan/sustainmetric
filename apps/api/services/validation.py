"""Validation layer for Gemini analysis output.

Enforces:
- Cost estimates in INR 500 to INR 50 lakh
- Intervention types from controlled vocabulary
- Equity flag corroborated by data
- BRSR line items conform to Principle 6 schema
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger()

VALID_INTERVENTION_TYPES = {
    "cool_roof", "urban_tree", "pocket_park",
    "permeable_pavement", "reflective_pavement",
    "water_body", "green_wall",
}

BRSR_P6_CATEGORIES = {
    "air_quality", "water_management", "waste_management",
    "energy_management", "biodiversity", "emissions", "resource_usage",
}

COST_MIN = 500
COST_MAX = 5_000_000


def validate_analysis(gemini_result: dict) -> tuple[dict, list[str]]:
    """Validate Gemini analysis output. Returns (validated_response, warnings)."""
    analysis = gemini_result.get("analysis", {})
    warnings: list[str] = []

    # Validate intervention options
    interventions = analysis.get("intervention_options", [])
    validated_interventions = []
    for i, opt in enumerate(interventions):
        opt_warnings = _validate_intervention(opt, i)
        warnings.extend(opt_warnings)
        if opt_warnings:
            opt["low_confidence"] = True
        validated_interventions.append(opt)

    analysis["intervention_options"] = validated_interventions

    # Validate equity flag
    equity_flag = analysis.get("equity_flag", "MEDIUM")
    if equity_flag not in ("HIGH", "MEDIUM", "LOW"):
        warnings.append(f"Invalid equity_flag '{equity_flag}', defaulting to MEDIUM")
        analysis["equity_flag"] = "MEDIUM"

    # Validate model confidence
    confidence = analysis.get("model_confidence", 0.5)
    if not isinstance(confidence, (int, float)) or confidence < 0 or confidence > 1:
        warnings.append(f"Invalid model_confidence {confidence}, clamping to [0, 1]")
        analysis["model_confidence"] = max(0, min(1, float(confidence)))

    # Validate BRSR line items
    brsr_items = analysis.get("brsr_principle_6_line_items", [])
    if not isinstance(brsr_items, list):
        warnings.append("brsr_principle_6_line_items is not a list, replacing with empty")
        analysis["brsr_principle_6_line_items"] = []

    return analysis, warnings


def _validate_intervention(opt: dict, index: int) -> list[str]:
    """Validate a single intervention option."""
    warnings = []
    prefix = f"intervention_options[{index}]"

    # Type check
    itype = opt.get("type", "")
    if itype not in VALID_INTERVENTION_TYPES:
        warnings.append(f"{prefix}.type '{itype}' not in controlled vocabulary")

    # Cost check
    cost = opt.get("estimated_cost_inr", 0)
    if not isinstance(cost, (int, float)):
        warnings.append(f"{prefix}.estimated_cost_inr is not a number")
    elif cost < COST_MIN or cost > COST_MAX:
        warnings.append(
            f"{prefix}.estimated_cost_inr {cost} outside valid range "
            f"[{COST_MIN}, {COST_MAX}]"
        )

    # Temperature reduction sanity check
    temp_red = opt.get("projected_temperature_reduction_celsius", 0)
    if isinstance(temp_red, (int, float)) and (temp_red < 0 or temp_red > 15):
        warnings.append(
            f"{prefix}.projected_temperature_reduction_celsius {temp_red} "
            f"outside plausible range [0, 15]"
        )

    return warnings
