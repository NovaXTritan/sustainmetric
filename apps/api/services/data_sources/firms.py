"""Surface conditions fetcher — ERA5 reanalysis data (modeled, not satellite-observed).

This fetcher returns ERA5 reanalysis data via Open-Meteo (modeled atmospheric
and soil data, not satellite observation). If a NASA FIRMS API key is
configured, it also fetches fire/thermal anomaly detections as a supplement.

True Landsat surface temperature can be added in V2 via Microsoft Planetary
Computer's `landsat-c2-l2` collection (30m thermal band, 16-day revisit).
"""

from __future__ import annotations

import httpx

from config import settings
from models.schemas import FetchResult
from services.data_sources.base import BaseFetcher


class SurfaceConditionsFetcher(BaseFetcher):
    """Fetch surface conditions from ERA5 (via Open-Meteo) and optionally NASA FIRMS."""

    FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
    OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast"

    async def fetch(self, lat: float, lon: float) -> FetchResult:
        # Always fetch ERA5 surface conditions (no key needed)
        result = await self._fetch_era5_surface(lat, lon)

        # Supplement with FIRMS fire detections if key is available
        if settings.NASA_FIRMS_MAP_KEY:
            firms_data = await self._fetch_firms(lat, lon)
            result.data["fire_detections"] = firms_data

        return result

    async def _fetch_era5_surface(self, lat: float, lon: float) -> FetchResult:
        """ERA5 reanalysis: soil temperature, moisture, surface pressure."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                self.OPEN_METEO_BASE,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": (
                        "soil_temperature_0cm,"
                        "soil_temperature_6cm,"
                        "soil_moisture_0_to_1cm"
                    ),
                    "current": "temperature_2m,surface_pressure",
                    "forecast_days": 1,
                    "timezone": "Asia/Kolkata",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        hourly = data.get("hourly", {})
        soil_temps = hourly.get("soil_temperature_0cm", [])
        current_soil = soil_temps[0] if soil_temps else None
        summary = (
            f"ERA5 reanalysis · soil temp {current_soil}°C"
            if current_soil is not None
            else "ERA5 reanalysis · data incomplete"
        )

        return FetchResult(
            source="surface_conditions_era5",
            data={
                "source_note": (
                    "ERA5 reanalysis via Open-Meteo "
                    "(modeled, not satellite-observed LST)"
                ),
                "current": data.get("current", {}),
                "soil_temperature_hourly": hourly,
            },
            source_url=(
                f"https://open-meteo.com/en/docs"
                f"#latitude={lat}&longitude={lon}"
            ),
            freshness_seconds=900,
            summary=summary,
        )

    async def _fetch_firms(self, lat: float, lon: float) -> dict:
        """Optional: NASA FIRMS fire detections (375m, near-real-time)."""
        bbox = f"{lon - 0.1},{lat - 0.1},{lon + 0.1},{lat + 0.1}"
        url = (
            f"{self.FIRMS_BASE}/"
            f"{settings.NASA_FIRMS_MAP_KEY}/"
            f"VIIRS_SNPP_NRT/{bbox}/3"
        )

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                text = resp.text

            lines = text.strip().split("\n")
            if len(lines) <= 1:
                return {"hotspots_found": 0}

            header = lines[0].split(",")
            hotspots = []
            for line in lines[1:]:
                values = line.split(",")
                row = dict(zip(header, values, strict=False))
                hotspots.append({
                    "latitude": float(row.get("latitude", 0)),
                    "longitude": float(row.get("longitude", 0)),
                    "brightness": float(row.get("bright_ti4", 0)),
                    "confidence": row.get("confidence", ""),
                    "frp": float(row.get("frp", 0)),
                })

            return {
                "hotspots_found": len(hotspots),
                "hotspots": hotspots[:20],
            }
        except Exception:
            return {"hotspots_found": 0, "error": "FIRMS unavailable"}
