"""Cache warming script — pre-analyze 20 Delhi locations.

Run this after deployment to pre-warm the cache for demo:
    python -m scripts.warm_cache

Hits the live API with 20 hand-picked Delhi locations covering
informal settlements, commercial areas, parks, and industrial zones.
"""

from __future__ import annotations

import asyncio
import sys

import httpx

# 20 hand-picked Delhi locations for demo
DELHI_LOCATIONS = [
    # Informal settlements / vulnerable areas
    {"name": "Kathputli Colony", "lat": 28.6458, "lon": 77.1722},
    {"name": "Govindpuri Slum", "lat": 28.5380, "lon": 77.2640},
    {"name": "Seemapuri", "lat": 28.6850, "lon": 77.3145},
    {"name": "Tughlakabad Extension", "lat": 28.5187, "lon": 77.2580},
    {"name": "Sangam Vihar", "lat": 28.4950, "lon": 77.2340},

    # Commercial / high-density areas
    {"name": "Connaught Place", "lat": 28.6315, "lon": 77.2167},
    {"name": "Karol Bagh", "lat": 28.6519, "lon": 77.1905},
    {"name": "Chandni Chowk", "lat": 28.6507, "lon": 77.2305},
    {"name": "Nehru Place", "lat": 28.5494, "lon": 77.2530},
    {"name": "Saket Mall Area", "lat": 28.5244, "lon": 77.2090},

    # Parks and green areas (for contrast)
    {"name": "Lodhi Garden", "lat": 28.5931, "lon": 77.2196},
    {"name": "Sanjay Van", "lat": 28.5275, "lon": 77.1866},
    {"name": "Delhi Ridge (North)", "lat": 28.7048, "lon": 77.1753},
    {"name": "Yamuna Biodiversity Park", "lat": 28.7310, "lon": 77.2284},
    {"name": "Hauz Khas Deer Park", "lat": 28.5544, "lon": 77.1959},

    # Industrial / mixed zones
    {"name": "Okhla Industrial Area", "lat": 28.5310, "lon": 77.2714},
    {"name": "Wazirpur Industrial", "lat": 28.6978, "lon": 77.1651},
    {"name": "Naraina Industrial", "lat": 28.6300, "lon": 77.1350},
    {"name": "IGI Airport Area", "lat": 28.5562, "lon": 77.1000},
    {"name": "Bhalswa (landfill area)", "lat": 28.7367, "lon": 77.1614},
]


async def warm_one(client: httpx.AsyncClient, api_url: str, location: dict) -> str:
    """Send a query for one location."""
    try:
        resp = await client.post(
            f"{api_url}/api/v1/queries",
            json={"lat": location["lat"], "lon": location["lon"]},
            timeout=30.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return f"  OK  {location['name']} -> query {data.get('id', '?')}"
        elif resp.status_code == 401:
            return f"  AUTH {location['name']} -> needs authentication (expected in demo mode)"
        else:
            return f"  ERR {location['name']} -> HTTP {resp.status_code}"
    except Exception as e:
        return f"  ERR {location['name']} -> {e}"


async def main():
    api_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"

    print(f"Warming cache against {api_url}")
    print(f"Locations: {len(DELHI_LOCATIONS)}")
    print()

    async with httpx.AsyncClient() as client:
        # Run 5 at a time to avoid overwhelming the server
        for i in range(0, len(DELHI_LOCATIONS), 5):
            batch = DELHI_LOCATIONS[i : i + 5]
            results = await asyncio.gather(
                *[warm_one(client, api_url, loc) for loc in batch]
            )
            for r in results:
                print(r)
            print()

    print("Cache warming complete.")


if __name__ == "__main__":
    asyncio.run(main())
