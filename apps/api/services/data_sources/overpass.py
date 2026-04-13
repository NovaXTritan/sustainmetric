"""OpenStreetMap Overpass API fetcher — NO API KEY NEEDED.

Optimized for speed: 200m radius, 8s timeout, lean query.
"""

from __future__ import annotations

import httpx

from models.schemas import FetchResult
from services.data_sources.base import BaseFetcher


class OverpassFetcher(BaseFetcher):
    """Fetch urban fabric data from OSM via Overpass API."""

    OVERPASS_URLS = [
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass-api.de/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ]

    async def fetch(self, lat: float, lon: float) -> FetchResult:
        # 200m radius — fast enough for street-level context
        radius = 200
        # Lean query: only counts, no geometry, no tree nodes (too many)
        query = (
            f"[out:json][timeout:8];"
            f"("
            f'way["building"](around:{radius},{lat},{lon});'
            f'way["leisure"="park"](around:{radius},{lat},{lon});'
            f'way["landuse"~"grass|forest|residential|commercial|industrial"]'
            f"(around:{radius},{lat},{lon});"
            f'way["natural"~"water|wood"](around:{radius},{lat},{lon});'
            f'way["highway"~"primary|secondary|tertiary"]'
            f"(around:{radius},{lat},{lon});"
            f");"
            f"out tags;"
        )

        raw = None
        async with httpx.AsyncClient(timeout=10.0) as client:
            for url in self.OVERPASS_URLS:
                try:
                    resp = await client.post(url, data={"data": query})
                    if resp.status_code == 200:
                        raw = resp.json()
                        break
                except (
                    httpx.HTTPStatusError,
                    httpx.ConnectError,
                    httpx.ReadTimeout,
                    httpx.TimeoutException,
                ):
                    continue

        if raw is None:
            return FetchResult(
                source="overpass_osm",
                data={
                    "categories": {},
                    "error": "Overpass servers unavailable",
                },
                source_url=f"https://www.openstreetmap.org/#map=17/{lat}/{lon}",
                freshness_seconds=0,
                error="All Overpass servers returned errors",
            )

        elements = raw.get("elements", [])
        categories = {
            "buildings": 0,
            "green_spaces": 0,
            "water_bodies": 0,
            "roads": 0,
            "residential": 0,
            "commercial": 0,
            "industrial": 0,
        }

        for el in elements:
            tags = el.get("tags", {})
            if "building" in tags:
                categories["buildings"] += 1
            if tags.get("leisure") == "park" or tags.get("landuse") in (
                "grass", "forest",
            ):
                categories["green_spaces"] += 1
            if tags.get("natural") == "water":
                categories["water_bodies"] += 1
            if "highway" in tags:
                categories["roads"] += 1
            landuse = tags.get("landuse", "")
            if landuse == "residential":
                categories["residential"] += 1
            elif landuse == "commercial":
                categories["commercial"] += 1
            elif landuse == "industrial":
                categories["industrial"] += 1

        total = max(
            categories["buildings"]
            + categories["green_spaces"]
            + categories["commercial"]
            + categories["industrial"],
            1,
        )
        green_ratio = categories["green_spaces"] / total

        return FetchResult(
            source="overpass_osm",
            data={
                "categories": categories,
                "total_elements": len(elements),
                "green_cover_ratio": round(green_ratio, 3),
                "search_radius_m": radius,
                "urban_density_indicator": (
                    "high" if categories["buildings"] > 50
                    else "medium" if categories["buildings"] > 15
                    else "low"
                ),
                "has_water_bodies": categories["water_bodies"] > 0,
                "has_green_spaces": categories["green_spaces"] > 0,
            },
            source_url=f"https://www.openstreetmap.org/#map=17/{lat}/{lon}",
            freshness_seconds=86400,
        )
