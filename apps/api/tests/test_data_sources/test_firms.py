"""Test SurfaceConditionsFetcher — ERA5 surface data, Connaught Place, Delhi."""

import pytest

from services.data_sources.firms import SurfaceConditionsFetcher

LAT, LON = 28.6315, 77.2167


@pytest.mark.asyncio
async def test_surface_conditions_returns_data():
    """Should return ERA5 surface conditions data."""
    fetcher = SurfaceConditionsFetcher()
    result = await fetcher.fetch(LAT, LON)

    assert result.source == "surface_conditions_era5"
    assert result.data is not None
    assert len(result.data) > 0
    assert result.freshness_seconds > 0
