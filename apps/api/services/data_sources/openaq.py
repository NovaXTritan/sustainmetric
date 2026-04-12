"""OpenAQ air quality fetcher — free API key required.

Fetches real-time and recent air quality data from monitoring stations
near the target coordinates. Excellent Delhi coverage (40+ stations).
"""

from __future__ import annotations

import httpx

from config import settings
from models.schemas import FetchResult
from services.data_sources.base import BaseFetcher


class OpenAQFetcher(BaseFetcher):
    """Fetch air quality data from OpenAQ v3 API."""

    BASE_URL = "https://api.openaq.org/v3"

    async def fetch(self, lat: float, lon: float) -> FetchResult:
        headers = {}
        if settings.OPENAQ_API_KEY:
            headers["X-API-Key"] = settings.OPENAQ_API_KEY

        async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
            # Find nearby monitoring stations (25km radius)
            locations_resp = await client.get(
                f"{self.BASE_URL}/locations",
                params={
                    "coordinates": f"{lat},{lon}",
                    "radius": 25000,
                    "limit": 10,
                },
            )

            if locations_resp.status_code != 200:
                return FetchResult(
                    source="openaq",
                    data={
                        "error": f"OpenAQ API returned {locations_resp.status_code}",
                        "hint": "Set OPENAQ_API_KEY in .env.local",
                    },
                    source_url="https://explore.openaq.org",
                    freshness_seconds=0,
                    error=f"HTTP {locations_resp.status_code}",
                )

            locations_data = locations_resp.json()
            stations = locations_data.get("results", [])

            # Fetch latest measurements from each station
            measurements = []
            for station in stations[:5]:
                station_id = station.get("id")
                if not station_id:
                    continue

                # v3: get latest sensor readings
                sensors = station.get("sensors", [])
                sensor_data = []
                for sensor in sensors:
                    param = sensor.get("parameter", {})
                    sensor_data.append({
                        "parameter": param.get("name", ""),
                        "display_name": param.get("displayName", ""),
                        "units": param.get("units", ""),
                        "sensor_id": sensor.get("id"),
                    })

                measurements.append({
                    "station_id": station_id,
                    "station_name": station.get("name", ""),
                    "coordinates": station.get("coordinates"),
                    "provider": station.get("provider", {}).get("name", ""),
                    "sensors": sensor_data,
                    "is_monitor": station.get("isMonitor", False),
                })

            # Try to get actual measurement values from the sensors endpoint
            for m in measurements[:3]:
                for sensor in m.get("sensors", [])[:5]:
                    sid = sensor.get("sensor_id")
                    if not sid:
                        continue
                    try:
                        meas_resp = await client.get(
                            f"{self.BASE_URL}/sensors/{sid}/measurements",
                            params={"limit": 1},
                        )
                        if meas_resp.status_code == 200:
                            meas_data = meas_resp.json()
                            results = meas_data.get("results", [])
                            if results:
                                latest = results[0]
                                sensor["latest_value"] = latest.get("value")
                                sensor["latest_datetime"] = (
                                    latest.get("period", {})
                                    .get("datetimeTo", {})
                                    .get("utc")
                                )
                    except Exception:
                        pass

        return FetchResult(
            source="openaq",
            data={
                "stations_found": len(stations),
                "stations_with_data": len(measurements),
                "measurements": measurements,
                "search_radius_m": 25000,
            },
            source_url=f"https://explore.openaq.org/?lat={lat}&lng={lon}",
            freshness_seconds=3600,
        )
