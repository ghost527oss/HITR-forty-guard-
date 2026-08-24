"""
City data pipeline (Point 12: Multi-city support with California focus).

Provides city metadata, search, and data pipeline info so the frontend
can offer a rich city selector without hardcoding everything.
"""
from __future__ import annotations

import math

# California cities database — extended with climate info.
# No API key needed; entirely local.
CALIFORNIA_CITIES = [
    {"name": "Los Angeles",        "lat": 34.0522, "lng": -118.2437, "region": "Southern California", "population": "3.8M", "climate": "Mediterranean", "base_temp_f": 95, "risk_profile": "urban_heat_island"},
    {"name": "San Francisco",      "lat": 37.7749, "lng": -122.4194, "region": "Northern California",  "population": "815K", "climate": "Mediterranean/Coastal", "base_temp_f": 72, "risk_profile": "coastal_microclimate"},
    {"name": "San Diego",          "lat": 32.7157, "lng": -117.1611, "region": "Southern California", "population": "1.4M", "climate": "Semi-arid/Mediterranean", "base_temp_f": 82, "risk_profile": "coastal_arid"},
    {"name": "Sacramento",         "lat": 38.5816, "lng": -121.4944, "region": "Central Valley",       "population": "525K", "climate": "Mediterranean (hot)", "base_temp_f": 98, "risk_profile": "valley_heat"},
    {"name": "Fresno",             "lat": 36.7378, "lng": -119.7871, "region": "Central Valley",       "population": "542K", "climate": "Semi-arid", "base_temp_f": 102, "risk_profile": "valley_heat"},
    {"name": "San Jose",           "lat": 37.3382, "lng": -121.8863, "region": "Northern California",  "population": "1.0M", "climate": "Mediterranean", "base_temp_f": 88, "risk_profile": "urban_heat_island"},
    {"name": "Bakersfield",        "lat": 35.3733, "lng": -119.0187, "region": "Central Valley",       "population": "404K", "climate": "Semi-arid", "base_temp_f": 104, "risk_profile": "valley_heat"},
    {"name": "Palm Springs",       "lat": 33.8303, "lng": -116.5453, "region": "Desert",               "population": "45K",  "climate": "Hot desert", "base_temp_f": 112, "risk_profile": "desert_heat"},
    {"name": "Death Valley",       "lat": 36.5323, "lng": -116.9325, "region": "Desert",               "population": "0",    "climate": "Extreme desert", "base_temp_f": 120, "risk_profile": "extreme_heat"},
    {"name": "Santa Barbara",      "lat": 34.4208, "lng": -119.6982, "region": "Southern California", "population": "88K",  "climate": "Mediterranean", "base_temp_f": 78, "risk_profile": "coastal_mild"},
    {"name": "Monterey",           "lat": 36.6002, "lng": -121.8947, "region": "Northern California",  "population": "28K",  "climate": "Mediterranean/Coastal", "base_temp_f": 68, "risk_profile": "coastal_mild"},
    {"name": "Lake Tahoe",         "lat": 39.0968, "lng": -120.0324, "region": "Sierra Nevada",        "population": "22K",  "climate": "Alpine", "base_temp_f": 62, "risk_profile": "cool_mountain"},
    {"name": "Yosemite Valley",    "lat": 37.8651, "lng": -119.5383, "region": "Sierra Nevada",        "population": "0",    "climate": "Mountain", "base_temp_f": 65, "risk_profile": "cool_mountain"},
]


def search_cities(query: str) -> list[dict]:
    """Search California cities by name or region."""
    q = query.lower().strip()
    if not q:
        return CALIFORNIA_CITIES[:5]
    results = []
    for c in CALIFORNIA_CITIES:
        if q in c["name"].lower() or q in c["region"].lower() or q in c["climate"].lower():
            results.append(c)
    if not results:
        # Fuzzy fallback: match first 3 chars
        for c in CALIFORNIA_CITIES:
            if c["name"].lower().startswith(q[:3]):
                results.append(c)
    return results or CALIFORNIA_CITIES[:3]


def get_city(name: str) -> dict | None:
    """Get a specific city by name (case-insensitive)."""
    n = name.lower().strip()
    for c in CALIFORNIA_CITIES:
        if c["name"].lower() == n:
            return c
    return None


def get_regions() -> list[str]:
    """List all unique regions."""
    return list(dict.fromkeys(c["region"] for c in CALIFORNIA_CITIES))


# Point 16: Climate scenario projections (mock, for demo).
# These show what temperatures could look like under different scenarios.
CLIMATE_SCENARIOS = {
    "current": {"label": "Current", "temp_adjustment": 0, "desc": "Today's conditions"},
    "mild_warming": {"label": "Mild (+1.5°C)", "temp_adjustment": 2.7, "desc": "1.5°C global warming scenario (Paris Accord target)"},
    "moderate_warming": {"label": "Moderate (+3°C)", "temp_adjustment": 5.4, "desc": "3°C warming — likely by 2080 under current policies"},
    "extreme_warming": {"label": "Extreme (+5°C)", "temp_adjustment": 9.0, "desc": "5°C warming — worst-case high-emissions scenario"},
}

def project_temperature(base_temp_f: float, scenario: str) -> dict:
    """Project temperature under a climate scenario."""
    info = CLIMATE_SCENARIOS.get(scenario, CLIMATE_SCENARIOS["current"])
    adjusted_f = base_temp_f + info["temp_adjustment"]
    adjusted_c = (adjusted_f - 32) * 5 / 9
    return {
        "scenario": scenario,
        "scenario_label": info["label"],
        "scenario_desc": info["desc"],
        "base_temp_f": round(base_temp_f, 1),
        "projected_temp_f": round(adjusted_f, 1),
        "projected_temp_c": round(adjusted_c, 1),
        "increase_f": round(info["temp_adjustment"], 1),
    }