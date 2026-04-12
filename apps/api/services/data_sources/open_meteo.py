"""Open-Meteo weather fetcher — NO API KEY NEEDED.

Fetches current weather, hourly forecast, and historical ERA5 data
for urban heat island analysis. Completely free, 10k requests/day.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import httpx

from models.schemas import FetchResult
from services.data_sources.base import BaseFetcher


class OpenMeteoFetcher(BaseFetcher):
    """Fetch weather data from Open-Meteo API. Zero authentication required."""

    BASE_URL = "https://api.open-meteo.com/v1"

    async def fetch(self, lat: float, lon: float) -> FetchResult:
        async with httpx.AsyncClient(timeout=20.0) as client:
            # Current weather + 7-day hourly forecast
            forecast_resp = await client.get(
                f"{self.BASE_URL}/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": ",".join([
                        "temperature_2m",
                        "relative_humidity_2m",
                        "apparent_temperature",
                        "precipitation",
                        "wind_speed_10m",
                        "wind_direction_10m",
                        "uv_index",
                        "soil_temperature_0cm",
                        "surface_pressure",
                        "cloud_cover",
                    ]),
                    "current": ",".join([
                        "temperature_2m",
                        "relative_humidity_2m",
                        "apparent_temperature",
                        "wind_speed_10m",
                        "uv_index",
                        "is_day",
                    ]),
                    "forecast_days": 3,
                    "timezone": "Asia/Kolkata",
                },
            )
            forecast_resp.raise_for_status()
            forecast_data = forecast_resp.json()

            # Historical ERA5 data (last 7 days for trend)
            end_date = datetime.now(UTC) - timedelta(days=5)
            start_date = end_date - timedelta(days=7)
            history_resp = await client.get(
                f"{self.BASE_URL}/archive",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "start_date": start_date.strftime("%Y-%m-%d"),
                    "end_date": end_date.strftime("%Y-%m-%d"),
                    "hourly": "temperature_2m,relative_humidity_2m,soil_temperature_0cm",
                    "timezone": "Asia/Kolkata",
                },
            )
            history_data = history_resp.json() if history_resp.status_code == 200 else {}

            # Air quality (CAMS-based, also free)
            aq_resp = await client.get(
                f"{self.BASE_URL}/air-quality",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": (
                        "pm2_5,pm10,nitrogen_dioxide,"
                        "sulphur_dioxide,ozone,carbon_monoxide,uv_index"
                    ),
                    "forecast_days": 1,
                    "timezone": "Asia/Kolkata",
                },
            )
            aq_data = aq_resp.json() if aq_resp.status_code == 200 else {}

        return FetchResult(
            source="open_meteo",
            data={
                "current": forecast_data.get("current", {}),
                "hourly_forecast": forecast_data.get("hourly", {}),
                "historical_era5": history_data.get("hourly", {}),
                "air_quality_cams": aq_data.get("hourly", {}),
                "units": forecast_data.get("hourly_units", {}),
                "location": {
                    "latitude": forecast_data.get("latitude"),
                    "longitude": forecast_data.get("longitude"),
                    "elevation": forecast_data.get("elevation"),
                    "timezone": forecast_data.get("timezone"),
                },
            },
            source_url=f"https://open-meteo.com/en/docs#latitude={lat}&longitude={lon}",
            freshness_seconds=900,  # 15-minute model update cycle
        )
