"""
City Simulation Engine — analyzes land use and generates 3D city layouts.

Takes a temperature + land use surface and creates a "Digital Twin" with:
- 3D Building objects with orientation metadata
- Road network with accessibility weights (distance to hospitals)
- Heat peaks mapped to building density
- Suggested 3D interventions (where trees and water points lower the "Peaks")
"""
from __future__ import annotations

import math
from typing import Any
from .heat_surface import compute_surface
from .accessibility import find_nearby

def analyze_city_3d(lat: float, lng: float, radius_m: int = 150) -> dict[str, Any]:
    """
    Generate the 3D city digital twin.

    Inputs:
        lat, lng (lat/lon degrees).
        radius_m (int, 50-500): radius of the analysis circle in meters.

    Outputs (dict):
        center: {lat, lng}
        surface: full heat-surface result (see heat_surface.compute_surface)
        buildings[]:  {lat, lng, temp_f, kind="building", height_m}
        roads[]:      {lat, lng, temp_f, kind="road", access_weight}
                      access_weight = 1/distance to nearest hospital (m^-1)
        vegetation[]: {lat, lng, temp_f, kind="green"}
        hospitals[]:  OSM amenities within 1 km of center
        interventions[]: {type="tree"|"water_point", lat, lng, target_temp_f,
                           projected_reduction, reason}
        stats: {avg_temp, max_temp, building_count, hospital_accessible}

    Notes:
        Each cell's land kind comes from heat_surface (which uses the offline
        deterministic fallback when OSM Overpass is unreachable).
    """
    # 1. Get the baseline heat + land surface
    # We use a slightly higher resolution for the Digital Twin (20x20)
    surface = compute_surface(lat, lng, radius_m=radius_m, resolution=20)
    
    # 2. Identify nearest critical services (Hospitals)
    pois = find_nearby(lat, lng, radius=1000)
    hospitals = [p for p in pois if p["category"] == "hospital"]
    
    # 3. Process the "Digital Twin" objects
    # We group cells into objects: Buildings, Roads, Green
    buildings = []
    roads = []
    vegetation = []
    
    for cell in surface["grid_sample"]:
        clat, clng = cell["lat"], cell["lng"]
        kind = cell["land_kind"]
        temp = cell["temp_f"]
        
        # Calculate road distance weight if it's a road
        # (Inverse distance to nearest hospital)
        access_weight = 0.0
        if kind == "road" and hospitals:
            # Simple euclidean dist for demo
            min_dist = min(math.sqrt((clat - h["lat"])**2 + (clng - h["lng"])**2) for h in hospitals)
            access_weight = 1.0 / (min_dist + 0.001)
            
        obj = {
            "lat": clat,
            "lng": clng,
            "temp_f": temp,
            "kind": kind,
            "access_weight": round(access_weight, 5)
        }
        
        if kind == "building":
            # Deterministic height based on lat/lng seed
            h_seed = math.sin(clat * 1000) + math.cos(clng * 1000)
            obj["height_m"] = 5 + abs(h_seed) * 15 # 5m to 20m height
            buildings.append(obj)
        elif kind == "road":
            roads.append(obj)
        elif kind == "green":
            vegetation.append(obj)
            
    # 4. Generate Interventions in 3D
    # Find the top 5 hottest building cells
    hottest_buildings = sorted(buildings, key=lambda x: x["temp_f"], reverse=True)[:5]
    interventions = []
    for i, b in enumerate(hottest_buildings):
        interventions.append({
            "type": "tree" if i % 2 == 0 else "water_point",
            "lat": b["lat"] + 0.0001, # slightly offset to place NEXT to building
            "lng": b["lng"] + 0.0001,
            "target_temp_f": b["temp_f"],
            "projected_reduction": 4.5 if i % 2 == 0 else 2.0,
            "reason": f"Hottest building zone ({b['temp_f']}F)"
        })

    return {
        "center": {"lat": lat, "lng": lng},
        "surface": surface,
        "buildings": buildings,
        "roads": roads,
        "vegetation": vegetation,
        "hospitals": hospitals,
        "interventions": interventions,
        "stats": {
            "avg_temp": surface["surface_avg_f"],
            "max_temp": surface["surface_max_f"],
            "building_count": len(buildings),
            "hospital_accessible": len(hospitals) > 0
        }
    }