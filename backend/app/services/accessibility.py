"""
Accessibility / POI service (Point 7).

For a given lat/lng, find nearby hospitals, schools, markets, transit stops,
and other points of interest from OpenStreetMap. This feeds the planner
and the frontend overlay.
"""
from __future__ import annotations

import httpx

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
TIMEOUT = 12.0

# POI types we care about for accessibility scoring.
POI_CATEGORIES = {
    "hospital": {"amenity": ["hospital", "clinic", "doctors"]},
    "school": {"amenity": ["school", "kindergarten", "college", "university"]},
    "market": {"shop": ["supermarket", "convenience", "farm", "marketplace"]},
    "transit": {"public_transport": ["station", "stop", "platform"]},
    "fire": {"amenity": ["fire_station"]},
    "police": {"amenity": ["police"]},
    "pharmacy": {"amenity": ["pharmacy"]},
}


def find_nearby(lat: float, lng: float, radius: int = 500) -> list[dict]:
    """Find POIs near (lat, lng) within `radius` meters."""
    query = f"""
    [out:json][timeout:{int(TIMEOUT)}];
    (
      node(around:{radius}, {lat}, {lng})["amenity"];
      way(around:{radius}, {lat}, {lng})["amenity"];
      node(around:{radius}, {lat}, {lng})["shop"];
      way(around:{radius}, {lat}, {lng})["shop"];
      node(around:{radius}, {lat}, {lng})["public_transport"];
      way(around:{radius}, {lat}, {lng})["public_transport"];
    );
    out center tags 20;
    """
    try:
        resp = httpx.post(
            OVERPASS_URL,
            data={"data": query},
            headers={"Accept": "application/json"},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        elements = resp.json().get("elements", [])
    except Exception:
        return _fallback_pois(lat, lng, radius)

    pois = []
    seen = set()
    for el in elements:
        tags = el.get("tags", {})
        # Determine category
        cat = _categorize(tags)
        if not cat:
            continue
        name = tags.get("name", f"{cat.title()}")
        lat_pt = el.get("lat") or (el.get("center") or {}).get("lat")
        lng_pt = el.get("lon") or (el.get("center") or {}).get("lon")
        if not lat_pt or not lng_pt:
            continue
        key = f"{name}_{lat_pt:.4f}_{lng_pt:.4f}"
        if key in seen:
            continue
        seen.add(key)
        pois.append({
            "name": name,
            "category": cat,
            "lat": lat_pt,
            "lng": lng_pt,
            "tags": tags,
        })

    return pois


def _categorize(tags: dict) -> str | None:
    """Return a POI category string based on OSM tags."""
    for cat, rules in POI_CATEGORIES.items():
        for key, values in rules.items():
            val = tags.get(key, "")
            if val in values:
                return cat
    # Generic amenity fallback
    if tags.get("amenity"):
        return "amenity"
    if tags.get("shop"):
        return "shop"
    return None


def _fallback_pois(lat: float, lng: float, radius: int) -> list[dict]:
    """Mock POIs when OSM is unreachable (for offline demo)."""
    import math
    seed = math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453
    seed = seed - math.floor(seed)

    candidates = [
        {"name": "General Hospital", "category": "hospital"},
        {"name": "Community School", "category": "school"},
        {"name": "Farmers Market", "category": "market"},
        {"name": "Bus Station", "category": "transit"},
        {"name": "Fire Station 1", "category": "fire"},
        {"name": "Police Dept", "category": "police"},
    ]
    count = int(seed * 4) + 1
    pois = []
    for i in range(min(count, len(candidates))):
        angle = seed * 6.283 + i * 1.5
        dist = (seed * 0.7 + 0.1) * radius * 0.001
        pois.append({
            "name": candidates[i]["name"],
            "category": candidates[i]["category"],
            "lat": lat + dist * math.cos(angle),
            "lng": lng + dist * math.sin(angle),
        })
    return pois