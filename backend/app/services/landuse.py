"""
Land-use / land-classification service (Layer 2 — "understand the city").

For a given lat/lng, answer: *is this a building, a road, water, a park/green,
farmland, or open ground — and how hot is it?* We combine:
  * real geometry + tags from OpenStreetMap (Overpass API — free, no key)
  * a deterministic local fallback so the app works offline / in tests

The result feeds the planner (Layer 3) and the assistant (Layer 4).
"""
from __future__ import annotations

import math
import os

import httpx

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
# Vercel Hobby kills functions at ~10s. Overpass is often slower than that,
# which produced HTTP 500 on GET /api/analysis/spot in production.
TIMEOUT = 2.5 if os.environ.get("VERCEL") else 8.0

# Human-readable labels per classification.
KIND_LABELS = {
    "building": "building",
    "road": "road",
    "water": "water body",
    "waterway": "waterway",
    "green": "park / greenery",
    "farmland": "farmland",
    "amenity": "amenity / public facility",
    "other": "open ground",
}


def _seed(lat: float, lng: float) -> float:
    """Deterministic pseudo-random value in [0,1) from coordinates (offline fallback)."""
    x = math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453
    return x - math.floor(x)


def classify(tags: dict) -> dict:
    """Classify an OpenStreetMap tag set into a (kind, label)."""
    t = {k: v for k, v in (tags or {}).items()}

    if t.get("highway"):
        return {"kind": "road", "label": KIND_LABELS["road"]}

    if t.get("amenity"):
        return {"kind": "amenity", "label": f"{KIND_LABELS['amenity']} ({t['amenity']})"}

    if t.get("water") or t.get("natural") == "water":
        return {"kind": "water", "label": KIND_LABELS["water"]}
    if t.get("waterway"):
        return {"kind": "waterway", "label": KIND_LABELS["waterway"]}

    if t.get("building"):
        kind = t.get("building")
        return {"kind": "building", "label": f"building ({kind})" if kind and kind != "yes" else "building"}

    landuse = t.get("landuse")
    if landuse in ("farmland", "farm", "meadow", "orchard", "vineyard", "greenhouse_horticulture"):
        return {"kind": "farmland", "label": f"farmland ({landuse})"}
    if landuse in ("grass", "forest", "wood", "recreation_ground", "village_green"):
        return {"kind": "green", "label": f"{KIND_LABELS['green']} ({landuse})"}

    if t.get("natural") in ("tree", "wood", "grassland", "scrub", "wetland", "heath"):
        return {"kind": "green", "label": f"{KIND_LABELS['green']} ({t['natural']})"}

    leisure = t.get("leisure")
    if leisure in ("park", "garden", "nature_reserve"):
        return {"kind": "green", "label": f"{KIND_LABELS['green']} ({leisure})"}

    return {"kind": "other", "label": KIND_LABELS["other"]}


def classify_from_osm(lat: float, lng: float) -> dict:
    """Query Overpass for features near (lat,lng) and classify the closest/strongest one.

    Returns {"kind","label","detail","source":"osm"}. On any failure raises, so callers
    should wrap this with `classify_spot` which falls back offline.
    """
    query = f"""
    [out:json][timeout:{int(TIMEOUT)}];
    (
      nwr(around:70, {lat}, {lng});
    );
    out tags;
    """
    resp = httpx.post(
        OVERPASS_URL,
        data={"data": query},
        headers={"Accept": "application/json"},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    elements = resp.json().get("elements", [])

    # Rank elements: a small count of ways/relations usually reflects the real surface.
    # Prefer ways/relations over nodes, then by class.
    priority = {"way": 2, "relation": 2, "node": 1}
    ranked = []
    for el in elements:
        tags = el.get("tags")
        if not tags:
            continue
        cls = classify(tags)
        if cls["kind"] == "other":
            continue  # ignore empty "other" tags (we only want meaningful ones)
        ranked.append((priority.get(el.get("type"), 0), cls))
    if not ranked:
        return {"kind": "other", "label": KIND_LABELS["other"], "detail": None, "source": "osm"}

    ranked.sort(key=lambda x: x[0], reverse=True)
    cls = ranked[0][1]
    return {**cls, "detail": None, "source": "osm"}


def classify_heuristic(lat: float, lng: float) -> dict:
    """Deterministic offline fallback so the app always returns a classification."""
    roll = _seed(lat, lng)
    if roll < 0.3:
        return {"kind": "building", "label": "building", "detail": "estimated", "source": "fallback"}
    if roll < 0.5:
        return {"kind": "road", "label": "road", "detail": "estimated", "source": "fallback"}
    if roll < 0.62:
        return {"kind": "green", "label": "park / greenery", "detail": "estimated", "source": "fallback"}
    if roll < 0.74:
        return {"kind": "farmland", "label": "farmland", "detail": "estimated", "source": "fallback"}
    if roll < 0.82:
        return {"kind": "water", "label": "water body", "detail": "estimated", "source": "fallback"}
    return {"kind": "other", "label": "open ground", "detail": "estimated", "source": "fallback"}


def classify_spot(lat: float, lng: float) -> dict:
    """Classify a spot: try OSM, fall back offline on any error."""
    # Skip Overpass on serverless — it is the #1 cause of 500s on Vercel.
    if os.environ.get("VERCEL"):
        return classify_heuristic(lat, lng)
    try:
        return classify_from_osm(lat, lng)
    except Exception:  # network, timeout, rate-limit, parsing
        return classify_heuristic(lat, lng)
