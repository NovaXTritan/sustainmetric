"""NASA FIRMS thermal anomaly fetcher — simple API key (free form signup).

Detects active thermal anomalies (fires, industrial heat) from VIIRS
satellite. Useful for identifying extreme heat sources in the urban fabric.
Falls back to Open-Meteo soil temperature if FIRMS key is not set.
"""

from __future__ import annotations

import httpx

from config import settings
from models.schemas import FetchResult
from services.data_sources.base import BaseFetcher


class NASAFIRMSFetcher(BaseFetcher):
    """Fetch thermal anomaly data from NASA FIRMS or fall back to Open-Meteo."""

    FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
    OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast"

    async def fetch(self, lat: float, lon: float) -> FetchResult:
        # Try FIRMS first if key is available
        if settings.NASA_FIRMS_MAP_KEY:
            return await self._fetch_firms(lat, lon)

        # Fallback: Open-Meteo soil/surface temperature (no key needed)
        return await self._fetch_open_meteo_thermal(lat, lon)

    async def _fetch_firms(self, lat: float, lon: float) -> FetchResult:
        """Fetch from NASA FIRMS VIIRS (375m resolution, near-real-time)."""
        # Build bounding box (0.1 degree ~= 11km)
        bbox = f"{lon - 0.1},{lat - 0.1},{lon + 0.1},{lat + 0.1}"
        url = f"{self.FIRMS_BASE}/{settings.NASA_FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/{bbox}/3"

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            text = resp.text

        # Parse CSV
        lines = text.strip().split("\n")
        if len(lines) <= 1:
            return FetchResult(
                source="nasa_firms",
                data={
                    "hotspots_found": 0,
                    "message": "No thermal anomalies detected in area (good sign)",
                    "search_days": 3,
                    "sensor": "VIIRS_SNPP",
                },
                source_url=f"https://firms.modaps.eosdis.nasa.gov/map/#{lon},{lat},13",
                freshness_seconds=10800,  # 3-hour NRT latency
            )

        # Parse header and rows
        header = lines[0].split(",")
        hotspots = []
        for line in lines[1:]:
            values = line.split(",")
            row = dict(zip(header, values))
            hotspots.append({
                "latitude": float(row.get("latitude", 0)),
                "longitude": float(row.get("longitude", 0)),
                "brightness": float(row.get("bright_ti4", 0)),
                "confidence": row.get("confidence", ""),
                "acq_date": row.get("acq_date", ""),
                "frp": float(row.get("frp", 0)),  # Fire Radiative Power
            })

        return FetchResult(
            source="nasa_firms",
            data={
                "hotspots_found": len(hotspots),
                "hotspots": hotspots[:20],  # Cap at 20 for payload size
                "search_days": 3,
                "sensor": "VIIRS_SNPP",
            },
            source_url=f"https://firms.modaps.eosdis.nasa.gov/map/#{lon},{lat},13",
            freshness_seconds=10800,
        )

    async def _fetch_open_meteo_thermal(self, lat: float, lon: float) -> FetchResult:
        """Fallback: use Open-Meteo soil temperature as thermal indicator."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                self.OPEN_METEO_BASE,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "soil_temperature_0cm,soil_temperature_6cm,soil_moisture_0_to_1cm",
                    "current": "temperature_2m,surface_pressure",
                    "forecast_days": 1,
                    "timezone": "Asia/Kolkata",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        return FetchResult(
            source="open_meteo_thermal",
            data={
                "source_note": "NASA FIRMS unavailable (no API key). Using Open-Meteo soil temp.",
                "current": data.get("current", {}),
                "soil_temperature_hourly": data.get("hourly", {}),
            },
            source_url=f"https://open-meteo.com/en/docs#latitude={lat}&longitude={lon}",
            freshness_seconds=900,
        )
