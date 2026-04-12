"""Data source fetchers — each fetches from a real public API."""

from services.data_sources.firms import SurfaceConditionsFetcher
from services.data_sources.mapillary import MapillaryFetcher
from services.data_sources.open_meteo import OpenMeteoFetcher
from services.data_sources.openaq import OpenAQFetcher
from services.data_sources.overpass import OverpassFetcher

__all__ = [
    "OpenMeteoFetcher",
    "OpenAQFetcher",
    "OverpassFetcher",
    "SurfaceConditionsFetcher",
    "MapillaryFetcher",
]
