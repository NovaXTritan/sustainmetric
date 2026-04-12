"""Mapillary street imagery fetcher — free OAuth token required.

Fetches nearby street-level images and detected map features.
Gracefully returns imagery_unavailable if no coverage exists
for the given point.
"""

from __future__ import annotations

import httpx

from config import settings
from models.schemas import FetchResult
from services.data_sources.base import BaseFetcher


class MapillaryFetcher(BaseFetcher):
    """Fetch street-level imagery metadata from Mapillary API."""

    BASE_URL = "https://graph.mapillary.com"

    async def fetch(self, lat: float, lon: float) -> FetchResult:
        if not settings.MAPILLARY_TOKEN:
            return FetchResult(
                source="mapillary",
                data={
                    "imagery_unavailable": True,
                    "reason": "MAPILLARY_TOKEN not configured",
                    "hint": "Get a free token at https://www.mapillary.com/developer",
                },
                source_url="https://www.mapillary.com/developer",
                freshness_seconds=0,
                error="Not configured",
            )

        # Search for images in a bounding box around the point
        # ~200m box: 0.002 degrees latitude ≈ 222m
        delta = 0.002
        bbox = f"{lon - delta},{lat - delta},{lon + delta},{lat + delta}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self.BASE_URL}/images",
                params={
                    "access_token": settings.MAPILLARY_TOKEN,
                    "fields": "id,captured_at,compass_angle,geometry,thumb_1024_url,is_pano",
                    "bbox": bbox,
                    "limit": 10,
                },
            )

            if resp.status_code != 200:
                return FetchResult(
                    source="mapillary",
                    data={
                        "imagery_unavailable": True,
                        "reason": f"API returned {resp.status_code}",
                    },
                    source_url=f"https://www.mapillary.com/app/?lat={lat}&lng={lon}&z=17",
                    freshness_seconds=0,
                    error=f"HTTP {resp.status_code}",
                )

            data = resp.json()
            images = data.get("data", [])

            if not images:
                return FetchResult(
                    source="mapillary",
                    data={
                        "imagery_unavailable": True,
                        "reason": "No street-level images found within 200m",
                        "search_bbox": bbox,
                    },
                    source_url=f"https://www.mapillary.com/app/?lat={lat}&lng={lon}&z=17",
                    freshness_seconds=86400,
                )

            # Get map features (detected objects) near the point
            features_resp = await client.get(
                f"{self.BASE_URL}/map_features",
                params={
                    "access_token": settings.MAPILLARY_TOKEN,
                    "fields": "id,object_value,geometry,first_seen_at,last_seen_at",
                    "bbox": bbox,
                    "limit": 20,
                },
            )
            map_features = []
            if features_resp.status_code == 200:
                map_features = features_resp.json().get("data", [])

        return FetchResult(
            source="mapillary",
            data={
                "imagery_unavailable": False,
                "images_found": len(images),
                "images": [
                    {
                        "id": img["id"],
                        "captured_at": img.get("captured_at"),
                        "compass_angle": img.get("compass_angle"),
                        "thumb_url": img.get("thumb_1024_url"),
                        "is_pano": img.get("is_pano", False),
                        "geometry": img.get("geometry"),
                    }
                    for img in images
                ],
                "map_features_found": len(map_features),
                "map_features": [
                    {
                        "id": f.get("id"),
                        "object_value": f.get("object_value"),
                        "first_seen_at": f.get("first_seen_at"),
                    }
                    for f in map_features
                ],
            },
            source_url=f"https://www.mapillary.com/app/?lat={lat}&lng={lon}&z=17",
            freshness_seconds=86400,  # Imagery doesn't change daily
        )
