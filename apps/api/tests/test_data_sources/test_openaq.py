"""Test OpenAQ fetcher — Connaught Place, Delhi.

Note: Requires OPENAQ_API_KEY for full functionality.
Without it, the test verifies graceful handling.
"""

import pytest

from services.data_sources.openaq import OpenAQFetcher

LAT, LON = 28.6315, 77.2167


@pytest.mark.asyncio
async def test_openaq_returns_or_degrades_gracefully():
    """OpenAQ should return station data if key is set, or degrade gracefully."""
    fetcher = OpenAQFetcher()
    result = await fetcher.fetch(LAT, LON)

    assert result.source == "openaq"
    # Should always return a FetchResult, never crash
    assert result.data is not None
