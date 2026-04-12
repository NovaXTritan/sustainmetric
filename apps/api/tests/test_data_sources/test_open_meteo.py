"""Test Open-Meteo fetcher against real API — Connaught Place, Delhi."""

import pytest

from services.data_sources.open_meteo import OpenMeteoFetcher

# Connaught Place, Delhi
LAT, LON = 28.6315, 77.2167


@pytest.mark.asyncio
async def test_open_meteo_returns_data():
    """Open-Meteo should return weather data with no API key."""
    fetcher = OpenMeteoFetcher()
    result = await fetcher.fetch(LAT, LON)

    assert result.source == "open_meteo"
    assert result.error is None
    assert result.freshness_seconds > 0

    data = result.data
    assert "current" in data
    assert "hourly_forecast" in data
    assert "location" in data

    # Current weather should have temperature
    current = data["current"]
    assert "temperature_2m" in current

    # Location should match roughly
    loc = data["location"]
    assert abs(loc["latitude"] - LAT) < 0.5
    assert abs(loc["longitude"] - LON) < 0.5
