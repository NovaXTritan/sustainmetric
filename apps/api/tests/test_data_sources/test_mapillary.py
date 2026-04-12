"""Test Mapillary fetcher — Connaught Place, Delhi.

Without MAPILLARY_TOKEN, verifies graceful degradation.
"""

import pytest

from services.data_sources.mapillary import MapillaryFetcher

LAT, LON = 28.6315, 77.2167


@pytest.mark.asyncio
async def test_mapillary_returns_or_degrades_gracefully():
    """Mapillary should return imagery data if token is set, or degrade gracefully."""
    fetcher = MapillaryFetcher()
    result = await fetcher.fetch(LAT, LON)

    assert result.source == "mapillary"
    assert result.data is not None
    # Without token, should indicate unavailability
    if result.data.get("imagery_unavailable"):
        assert "reason" in result.data
