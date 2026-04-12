"""Base class for all data fetchers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models.schemas import FetchResult


class BaseFetcher(ABC):
    """All fetchers implement fetch(lat, lon) -> FetchResult."""

    @abstractmethod
    async def fetch(self, lat: float, lon: float) -> FetchResult:
        """Fetch data for the given coordinates. Must complete within 25 seconds."""
        ...
