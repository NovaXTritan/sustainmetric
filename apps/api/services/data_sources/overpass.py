"""OpenStreetMap Overpass API fetcher — NO API KEY NEEDED.

Fetches land use, building footprints, green spaces, water bodies,
and road network data around the target point. Essential for
characterizing the urban fabric.
"""

from __future__ import annotations

import httpx

from models.schemas import FetchResult
from services.data_sources.base import BaseFetcher


class OverpassFetcher(BaseFetcher):
    """Fetch urban fabric data from OSM via Overpass API. No authentication."""

    # Multiple endpoints for redundancy — public Overpass servers
    OVERPASS_URLS = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    ]

    async def fetch(self, lat: float, lon: float) -> FetchResult:
        # Query for urban fabric features within 500m radius
        radius = 500
        query = f"""
        [out:json][timeout:20];
        (
          // Buildings
          way["building"](around:{radius},{lat},{lon});
          // Green spaces
          way["leisure"="park"](around:{radius},{lat},{lon});
          way["landuse"="grass"](around:{radius},{lat},{lon});
          way["landuse"="forest"](around:{radius},{lat},{lon});
          way["natural"="wood"](around:{radius},{lat},{lon});
          // Water bodies
          way["natural"="water"](around:{radius},{lat},{lon});
          way["waterway"](around:{radius},{lat},{lon});
          // Roads
          way["highway"~"primary|secondary|tertiary|residential"](around:{radius},{lat},{lon});
          // Land use
          way["landuse"~"residential|commercial|industrial|retail"](around:{radius},{lat},{lon});
          // Trees
          node["natural"="tree"](around:{radius},{lat},{lon});
        );
        out body;
        >;
        out skel qt;
        """

        raw = None
        async with httpx.AsyncClient(timeout=22.0) as client:
            for url in self.OVERPASS_URLS:
                try:
                    resp = await client.post(url, data={"data": query})
                    resp.raise_for_status()
                    raw = resp.json()
                    break
                except (httpx.HTTPStatusError, httpx.ConnectError, httpx.ReadTimeout):
                    continue

        if raw is None:
            return FetchResult(
                source="overpass_osm",
                data={"error": "All Overpass servers unavailable", "categories": {}},
                source_url=f"https://www.openstreetmap.org/#map=17/{lat}/{lon}",
                freshness_seconds=0,
                error="All Overpass servers returned errors",
            )

        # Categorize elements
        elements = raw.get("elements", [])
        categories = {
            "buildings": 0,
            "green_spaces": 0,
            "water_bodies": 0,
            "roads": 0,
            "trees": 0,
            "residential": 0,
            "commercial": 0,
            "industrial": 0,
        }

        for el in elements:
            tags = el.get("tags", {})
            if "building" in tags:
                categories["buildings"] += 1
            if tags.get("leisure") == "park" or tags.get("landuse") in ("grass", "forest"):
                categories["green_spaces"] += 1
            if tags.get("natural") == "water" or "waterway" in tags:
                categories["water_bodies"] += 1
            if "highway" in tags:
                categories["roads"] += 1
            if tags.get("natural") == "tree":
                categories["trees"] += 1
            landuse = tags.get("landuse", "")
            if landuse == "residential":
                categories["residential"] += 1
            elif landuse == "commercial" or landuse == "retail":
                categories["commercial"] += 1
            elif landuse == "industrial":
                categories["industrial"] += 1

        # Calculate green cover ratio (rough estimate)
        total_features = max(
            categories["buildings"] + categories["green_spaces"]
            + categories["commercial"] + categories["industrial"],
            1,
        )
        green_ratio = categories["green_spaces"] / total_features

        return FetchResult(
            source="overpass_osm",
            data={
                "categories": categories,
                "total_elements": len(elements),
                "green_cover_ratio": round(green_ratio, 3),
                "search_radius_m": radius,
                "urban_density_indicator": (
                    "high" if categories["buildings"] > 100
                    else "medium" if categories["buildings"] > 30
                    else "low"
                ),
                "has_water_bodies": categories["water_bodies"] > 0,
                "has_green_spaces": categories["green_spaces"] > 0,
            },
            source_url=f"https://www.openstreetmap.org/#map=17/{lat}/{lon}",
            freshness_seconds=86400,  # OSM data is crowd-sourced, daily freshness
        )
