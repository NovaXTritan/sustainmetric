"""Nominatim reverse-geocoding — NO API KEY NEEDED.

Returns ward, district, city, state for a given lat/lon.
Respects 1 req/sec rate limit policy.
"""

from __future__ import annotations

import httpx

from models.schemas import FetchResult
from services.data_sources.base import BaseFetcher


class NominatimFetcher(BaseFetcher):
    """Reverse-geocode via OpenStreetMap Nominatim."""

    BASE_URL = "https://nominatim.openstreetmap.org/reverse"

    async def fetch(self, lat: float, lon: float) -> FetchResult:
        async with httpx.AsyncClient(
            timeout=8.0,
            headers={"User-Agent": "Sustainmetric/1.0 (urban climate intel)"},
        ) as client:
            resp = await client.get(
                self.BASE_URL,
                params={
                    "lat": lat,
                    "lon": lon,
                    "format": "json",
                    "zoom": 16,
                    "addressdetails": 1,
                },
            )

        if resp.status_code != 200:
            return FetchResult(
                source="nominatim",
                data={"error": f"Nominatim returned {resp.status_code}"},
                source_url=f"https://www.openstreetmap.org/#map=17/{lat}/{lon}",
                freshness_seconds=0,
                error=f"HTTP {resp.status_code}",
                summary="Geocoding unavailable",
            )

        raw = resp.json()
        addr = raw.get("address", {})
        ward = (
            addr.get("suburb")
            or addr.get("neighbourhood")
            or addr.get("city_district")
            or addr.get("quarter")
        )
        district = addr.get("city_district") or addr.get("state_district")
        city = addr.get("city") or addr.get("town") or addr.get("county")
        state = addr.get("state")

        display = raw.get("display_name", "")
        short_display = ", ".join(display.split(", ")[:3]) if display else "Unknown"

        summary = (
            f"{ward or short_display}"
            + (f" · {district}" if district else "")
            + (f" · {city}" if city else "")
        )

        return FetchResult(
            source="nominatim",
            data={
                "display_name": display,
                "ward": ward,
                "district": district,
                "city": city,
                "state": state,
                "raw_address": addr,
            },
            source_url=f"https://www.openstreetmap.org/#map=17/{lat}/{lon}",
            freshness_seconds=86400,
            summary=summary,
        )
