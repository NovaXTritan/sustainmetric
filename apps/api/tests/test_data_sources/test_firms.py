"""Test NASA FIRMS / Open-Meteo thermal fetcher — Connaught Place, Delhi."""

import pytest

from services.data_sources.firms import NASAFIRMSFetcher

LAT, LON = 28.6315, 77.2167


@pytest.mark.asyncio
async def test_firms_fallback_returns_thermal_data():
    """Without FIRMS key, should fall back to Open-Meteo soil temperature."""
    fetcher = NASAFIRMSFetcher()
    result = await fetcher.fetch(LAT, LON)

    # Should get data from one source or another
    assert result.source in ("nasa_firms", "open_meteo_thermal")
    assert result.data is not None
    assert len(result.data) > 0
    assert result.freshness_seconds > 0
