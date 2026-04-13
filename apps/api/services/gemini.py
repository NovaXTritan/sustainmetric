"""Gemini client — calls gemini-2.5-flash with structured JSON output.

Uses the google-genai SDK (new SDK, not the deprecated google-generativeai).
Retry logic: 3 attempts, exponential backoff at 1s/4s/16s.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import structlog
from jinja2 import Template

from config import settings

logger = structlog.get_logger()

# Load prompt template
_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "site_analysis.j2"


def _load_prompt_template() -> Template:
    """Load the Jinja2 prompt template."""
    if _PROMPT_PATH.exists():
        return Template(_PROMPT_PATH.read_text(encoding="utf-8"))
    # Inline fallback if file not found
    return Template(FALLBACK_PROMPT)


# The output schema Gemini must conform to
OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "site_characterization": {"type": "string"},
        "vulnerability_assessment": {"type": "string"},
        "intervention_options": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": [
                            "cool_roof", "urban_tree", "pocket_park",
                            "permeable_pavement", "reflective_pavement",
                            "water_body", "green_wall",
                        ],
                    },
                    "description": {"type": "string"},
                    "estimated_cost_inr": {"type": "number"},
                    "projected_temperature_reduction_celsius": {"type": "number"},
                    "equity_score": {"type": "number"},
                    "time_to_impact_months": {"type": "integer"},
                    "rejection_reason": {"type": "string"},
                },
                "required": [
                    "type", "description", "estimated_cost_inr",
                    "projected_temperature_reduction_celsius",
                    "equity_score", "time_to_impact_months",
                    "rejection_reason",
                ],
            },
        },
        "recommended_bundle": {"type": "string"},
        "equity_flag": {"type": "string", "enum": ["HIGH", "MEDIUM", "LOW"]},
        "projected_impact_metrics": {
            "type": "object",
            "properties": {
                "estimated_lst_reduction_celsius": {"type": "number"},
                "estimated_energy_savings_percent": {"type": "number"},
                "estimated_aqi_improvement_percent": {"type": "number"},
                "green_cover_increase_sqm": {"type": "number"},
                "beneficiary_count_estimate": {"type": "integer"},
            },
            "required": [
                "estimated_lst_reduction_celsius",
                "estimated_energy_savings_percent",
            ],
        },
        "brsr_principle_6_line_items": {
            "type": "array",
            "items": {"type": "string"},
        },
        "data_freshness_notes": {"type": "string"},
        "model_confidence": {"type": "number"},
        "reasoning_narrative": {"type": "string"},
    },
    "required": [
        "site_characterization", "vulnerability_assessment",
        "intervention_options", "recommended_bundle", "equity_flag",
        "projected_impact_metrics", "brsr_principle_6_line_items",
        "data_freshness_notes", "model_confidence",
        "reasoning_narrative",
    ],
}


async def analyze_with_gemini(lat: float, lon: float, fetcher_data: dict) -> dict:
    """Call Gemini with collected data and return structured analysis.

    Returns dict with keys: analysis (the parsed JSON), raw (full response), usage.
    """
    if not settings.GEMINI_API_KEY:
        logger.warning("gemini_api_key_not_set, returning placeholder")
        return _placeholder_response(lat, lon)

    from google import genai

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # Render prompt
    template = _load_prompt_template()
    prompt = template.render(
        lat=lat,
        lon=lon,
        fetcher_data=json.dumps(fetcher_data, indent=2, default=str),
    )

    # Retry logic: 3 attempts, exponential backoff
    backoff_delays = [1, 4, 16]
    last_error = None

    for attempt, delay in enumerate(backoff_delays):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": OUTPUT_SCHEMA,
                    "temperature": 0.2,
                    "max_output_tokens": 6144,
                },
            )

            # Parse the JSON response
            text = response.text
            analysis = json.loads(text)

            usage_meta = getattr(response, "usage_metadata", None)
            return {
                "analysis": analysis,
                "raw": {"text": text},
                "usage": {
                    "prompt_tokens": getattr(
                        usage_meta, "prompt_token_count", 0,
                    ) if usage_meta else 0,
                    "completion_tokens": getattr(
                        usage_meta, "candidates_token_count", 0,
                    ) if usage_meta else 0,
                },
            }

        except Exception as e:
            last_error = e
            logger.warning(
                "gemini_call_failed",
                attempt=attempt + 1,
                error=str(e),
                retry_in=delay,
            )
            if attempt < len(backoff_delays) - 1:
                await asyncio.sleep(delay)

    # All retries exhausted
    logger.error("gemini_all_retries_exhausted", error=str(last_error))
    raise RuntimeError(f"Gemini call failed after 3 attempts: {last_error}")


def _placeholder_response(lat: float, lon: float) -> dict:
    """Return a structured placeholder when Gemini API key is not configured."""
    return {
        "analysis": {
            "site_characterization": (
                f"Urban area at coordinates ({lat}, {lon}). "
                "Gemini API key not configured — this is placeholder data."
            ),
            "vulnerability_assessment": (
                "Unable to assess without Gemini. "
                "Configure GEMINI_API_KEY in .env.local."
            ),
            "intervention_options": [
                {
                    "type": "cool_roof",
                    "description": "Apply reflective white coating to building roofs",
                    "estimated_cost_inr": 25000,
                    "projected_temperature_reduction_celsius": 3.5,
                    "equity_score": 0.85,
                    "time_to_impact_months": 1,
                },
                {
                    "type": "urban_tree",
                    "description": "Plant native shade trees (Neem, Peepal) along streets",
                    "estimated_cost_inr": 50000,
                    "projected_temperature_reduction_celsius": 2.5,
                    "equity_score": 0.90,
                    "time_to_impact_months": 24,
                },
            ],
            "recommended_bundle": (
                "Cool roofs for immediate impact "
                "+ urban trees for long-term cooling"
            ),
            "equity_flag": "MEDIUM",
            "projected_impact_metrics": {
                "estimated_lst_reduction_celsius": 3.0,
                "estimated_energy_savings_percent": 25.0,
                "estimated_aqi_improvement_percent": 5.0,
                "green_cover_increase_sqm": 500,
                "beneficiary_count_estimate": 1000,
            },
            "brsr_principle_6_line_items": [
                "Energy management: Cool roof deployment reducing cooling energy by 25%",
                "Emissions: Avoided CO2 from reduced air conditioning usage",
            ],
            "data_freshness_notes": "Placeholder data — configure Gemini API key for real analysis",
            "model_confidence": 0.1,
        },
        "raw": {"placeholder": True},
        "usage": {"prompt_tokens": 0, "completion_tokens": 0},
    }


FALLBACK_PROMPT = """\
You are an urban climate intelligence engine \
analyzing a site in an Indian city.

Analyze the following location at coordinates ({{ lat }}, {{ lon }}) using the data below.

{{ fetcher_data }}

Provide a comprehensive site analysis following the exact JSON schema requested."""
