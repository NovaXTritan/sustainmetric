"""Test Overpass/OSM fetcher against real API — Connaught Place, Delhi."""

import pytest

from services.data_sources.overpass import OverpassFetcher

LAT, LON = 28.6315, 77.2167


@pytest.mark.asyncio
async def test_overpass_returns_urban_data():
    """Overpass should return building/road/green data or degrade gracefully."""
    fetcher = OverpassFetcher()
    result = await fetcher.fetch(LAT, LON)

    assert result.source == "overpass_osm"
    assert result.data is not None

    # If Overpass servers are up, verify real data
    if result.error is None:
        data = result.data
        assert "categories" in data
        assert "total_elements" in data
        assert data["total_elements"] > 0
        cats = data["categories"]
        assert cats["buildings"] > 0
        assert "urban_density_indicator" in data
    else:
        # Graceful degradation — servers intermittently overloaded
        assert "categories" in result.data or "error" in result.data
