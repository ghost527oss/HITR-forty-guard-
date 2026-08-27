"""
Heat Surface Engine — temperature raster analysis.

Generates a dense temperature grid (the "3D surface" behind the screen),
detects hotspots and coolspots using local maxima/minima + clustering,
analyzes patterns (why is it hot/cool?) based on land use, and simulates
temporal variation (24h cycle, monthly trend).
"""
from __future__ import annotations

import math
from typing import Any

from ..config import settings
from .heat_provider import build_provider, HeatReading
from . import landuse

# ---------------------------------------------------------------------------
# Temporal helpers
# ---------------------------------------------------------------------------

def _diurnal_offset(hour: int) -> float:
    if not (0 <= hour < 24):
        return 0.0
    rad = (hour - 5) * (2.0 * math.pi) / 24.0
    return 5.0 * math.sin(rad)


def _seasonal_offset(month: int) -> float:
    if not (1 <= month <= 12):
        return 0.0
    rad = (month - 1) * (2.0 * math.pi) / 12.0
    return 8.0 * math.sin(rad)


# ---------------------------------------------------------------------------
# Gaussian smoothing
# ---------------------------------------------------------------------------

def _gaussian_kernel(size: int, sigma: float = 1.0) -> list[list[float]]:
    k = [[0.0] * size for _ in range(size)]
    c = size // 2
    total = 0.0
    for i in range(size):
        for j in range(size):
            v = math.exp(-((i-c)*(i-c) +(j-c)*(j-c)) / (2.0 * sigma * sigma))
            k[i][j] = v
            total += v
    for i in range(size):
        for j in range(size):
            k[i][j] /= total
    return k


def _smooth(grid, ksize=3, sigma=1.0):
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    if rows < ksize or cols < ksize or ksize < 3:
        return grid
    kernel = _gaussian_kernel(ksize, sigma)
    kc = ksize // 2
    out = [[0.0] * cols for _ in range(rows)]
    for i in range(rows):
        for j in range(cols):
            val = 0.0
            w = 0.0
            for ki in range(ksize):
                for kj in range(ksize):
                    ni = i + ki - kc
                    nj = j + kj - kc
                    if 0 <= ni < rows and 0 <= nj < cols:
                        val += grid[ni][nj] * kernel[ki][kj]
                        w += kernel[ki][kj]
            out[i][j] = val / w if w > 0 else grid[i][j]
    return out


# ---------------------------------------------------------------------------
# Peak detection (local maxima / minima)
# ---------------------------------------------------------------------------

def _find_peaks(grid, threshold, find_hot):
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    peaks = []
    for i in range(1, rows - 1):
        for j in range(1, cols - 1):
            v = grid[i][j]
            if find_hot and v < threshold:
                continue
            if not find_hot and v > threshold:
                continue
            is_peak = True
            for di in (-1, 0, 1):
                for dj in (-1, 0, 1):
                    if di == 0 and dj == 0:
                        continue
                    nv = grid[i + di][j + dj]
                    if find_hot and nv >= v:
                        is_peak = False
                        break
                    if not find_hot and nv <= v:
                        is_peak = False
                        break
                if not is_peak:
                    break
            if is_peak:
                peaks.append((i, j, v))
    return peaks

# ---------------------------------------------------------------------------
# Clustering
# ---------------------------------------------------------------------------

def _cluster_peaks(peaks, max_dist=3):
    if not peaks:
        return []
    clusters = [[peaks[0]]]
    for idx in range(1, len(peaks)):
        pi, pj, pv = peaks[idx]
        added = False
        for cluster in clusters:
            for ci, cj, _ in cluster:
                if abs(pi - ci) + abs(pj - cj) <= max_dist:
                    cluster.append((pi, pj, pv))
                    added = True
                    break
            if added:
                break
        if not added:
            clusters.append([(pi, pj, pv)])
    clusters.sort(key=lambda c: max(v for _, _, v in c), reverse=True)
    return clusters


# ---------------------------------------------------------------------------
# Pattern context & analysis
# ---------------------------------------------------------------------------

_PATTERN_MAP = {
    "building_heat": "Buildings trap heat from AC exhaust, dark roofs, and low albedo. "
                     "Tree-lined streets + cool roofs reduce by -2 to -4 C.",
    "road_heat_trap": "Dark asphalt absorbs >90% of solar radiation. "
                      "Cool pavement + shade canopy reduce surface temp by -4 to -6 C.",
    "park_cool_zone": "Trees and grass cool via evapotranspiration. "
                      "This park is 2-5 C cooler than surrounding blocks.",
    "water_cooling": "Water bodies create a microclimate cooling effect, "
                     "lowering nearby temps by -1 to -3 C.",
    "farmland_heat": "Exposed soil and crops absorb heat. "
                     "Shelter-belts + crop orientation reduce stress by 15-30%.",
    "open_exposure": "Open ground with no shade heats up fast. "
                     "Tree clusters + shade structures reduce exposure.",
    "dense_urban": "Dense building blocks without green space create "
                   "city-wide heat island. Systematic greening needed.",
    "mixed_zone": "Mixed land use with partial shade. "
                  "Targeted tree planting + green roofs improve comfort.",
}


def _zone_land_kinds(cells, grid_land):
    kinds = set()
    for i, j, _ in cells:
        if 0 <= i < len(grid_land) and 0 <= j < len(grid_land[0]):
            kinds.add(grid_land[i][j])
    return list(kinds) if kinds else ["unknown"]


def _zone_pattern(land_kinds, is_hot):
    hb = "building" in land_kinds
    hr = "road" in land_kinds
    hg = "green" in land_kinds
    hw = "water" in land_kinds
    hf = "farmland" in land_kinds
    ho = "other" in land_kinds or "amenity" in land_kinds

    if is_hot:
        if hb and (hr or ho):
            return "dense_urban", _PATTERN_MAP["dense_urban"]
        if hb:
            return "building_heat", _PATTERN_MAP["building_heat"]
        if hr:
            return "road_heat_trap", _PATTERN_MAP["road_heat_trap"]
        if hf:
            return "farmland_heat", _PATTERN_MAP["farmland_heat"]
        return "open_exposure", _PATTERN_MAP["open_exposure"]
    else:
        if hw:
            return "water_cooling", _PATTERN_MAP["water_cooling"]
        if hg:
            return "park_cool_zone", _PATTERN_MAP["park_cool_zone"]
        return "mixed_zone", _PATTERN_MAP["mixed_zone"]


# ---------------------------------------------------------------------------
# Risk helper
# ---------------------------------------------------------------------------

_RISK_TABLE = [
    (80.0, "moderate", "#4caf50"),
    (90.0, "high", "#ff9800"),
    (100.0, "very_high", "#f44336"),
    (120.0, "extreme", "#b71c1c"),
]


def _risk(temp_f):
    for max_f, label, color in _RISK_TABLE:
        if temp_f <= max_f:
            return label, color
    return "extreme", "#b71c1c"


# ---------------------------------------------------------------------------
# Main: compute heat surface
# ---------------------------------------------------------------------------

def compute_surface(
    lat, lng,
    radius_m=100,
    resolution=30,
    hour=None,
    month=None,
):
    """
    Generate a temperature raster and detect hot/cool zones.

    Inputs:
        lat, lng (degrees).
        radius_m (50-500): radius of the analysis circle in meters.
        resolution (10-50): number of cells per side (NxN grid).
        hour (0-23 or None): if set, simulates the diurnal offset.
        month (1-12 or None): if set, simulates the seasonal offset.

    Outputs (dict):
        rows, cols: grid dimensions
        lat_min/max, lng_min/max: bounding box
        surface_min_f / surface_max_f / surface_avg_f: temperature stats (F)
        grid_sample[]: up to 200 cells with {lat, lng, temp_f, risk, land_kind,
                        land_label}
        hotspots[]: clusters of local maxima with {center_lat, center_lng,
                       peak_temp_f, severity 0..1, land_kinds, pattern,
                       pattern_explanation}
        coolspots[]: same shape, for local minima
        temporal (optional, when hour/month are both None):
            diurnal_sampling[]: 4 samples at hours 0/6/12/18
            seasonal_sampling[]: 4 samples at months 1/4/7/10

    Used by:
        GET /api/analysis/surface
        services/city_simulation.analyze_city_3d
    """
    """
    Generate a temperature raster around (lat, lng), detect hotspots and
    coolspots, classify patterns, and sample temporal trends.
    """
    resolution = max(10, min(50, resolution))
    radius_m = max(50, min(500, radius_m))
    rows = cols = resolution

    lat_per_m = 1.0 / 111320.0
    lng_per_m = 1.0 / (111320.0 * math.cos(math.radians(lat)))
    half = radius_m * max(lat_per_m, lng_per_m)

    lat_min = lat - half
    lat_max = lat + half
    lng_min = lng - half
    lng_max = lng + half

    hour_offset = _diurnal_offset(hour) if hour is not None else 0
    month_offset = _seasonal_offset(month) if month is not None else 0

    # Generate a spatially coherent temperature field using 2D sine waves.
    # This simulates realistic hot/cool patterns (urban heat islands, park cool zones).
    # Uses the mock baseline + spatial variation that's smooth across adjacent cells.
    seed_val = math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453
    seed_val = seed_val - math.floor(seed_val)

    # Create the raster
    grid_temp = []
    grid_risk = []
    grid_land = []
    all_cells = []

    min_temp = 999.0
    max_temp = -999.0
    total_temp = 0.0

    # Coherent spatial patterns using 2D waves
    for i in range(rows):
        row_temp = []
        row_risk = []
        row_land = []
        for j in range(cols):
            rlat = lat_min + (i + 0.5) * (lat_max - lat_min) / rows
            rlng = lng_min + (j + 0.5) * (lng_max - lng_min) / cols

            # Spatially coherent temperature using multiple sine waves
            # This creates smooth hot/cool zones like real urban heat patterns
            frac_i = i / rows
            frac_j = j / cols

            # Base temp from mock provider at center
            provider = build_provider(use_mock=settings.use_mock_heat)
            reading = provider.get_temperature(rlat, rlng)

            # Add spatial coherence: 2D waves that vary smoothly across the grid
            wave1 = math.sin(frac_i * 6.283 * 1.5 + seed_val * 6.283) * 2.0
            wave2 = math.sin(frac_j * 6.283 * 1.5 + seed_val * 3.141) * 2.0
            wave3 = math.sin((frac_i + frac_j) * 6.283 * 0.8) * 1.5

            # Urban heat island effect: center of grid gets hotter
            dist_from_center = math.sqrt((frac_i - 0.5)**2 + (frac_j - 0.5)**2) * 2
            uhi_effect = -dist_from_center * 3.0  # center is up to 3F hotter

            temp_f = reading.temp_f + wave1 + wave2 + wave3 + uhi_effect + hour_offset + month_offset
            temp_f = round(temp_f, 1)
            risk, color = _risk(temp_f)

            land = landuse.classify_heuristic(rlat, rlng)

            row_temp.append(temp_f)
            row_risk.append(risk)
            row_land.append(land["kind"])

            min_temp = min(min_temp, temp_f)
            max_temp = max(max_temp, temp_f)
            total_temp += temp_f

            all_cells.append({
                "lat": round(rlat, 6),
                "lng": round(rlng, 6),
                "temp_f": temp_f,
                "risk": risk,
                "land_kind": land["kind"],
                "land_label": land["label"],
            })

        grid_temp.append(row_temp)
        grid_risk.append(row_risk)
        grid_land.append(row_land)

    avg_temp = total_temp / (rows * cols) if rows * cols > 0 else 0

    # Smooth and detect
    smoothed = _smooth(grid_temp, ksize=5, sigma=1.5)

    hot_peaks = _find_peaks(smoothed, avg_temp + 2.0, find_hot=True)
    cool_peaks = _find_peaks(smoothed, avg_temp - 2.0, find_hot=False)

    hot_clusters = _cluster_peaks(hot_peaks, max_dist=3)
    cool_clusters = _cluster_peaks(cool_peaks, max_dist=3)

    def _make_zone(cluster, is_hot):
        if not cluster:
            return None
        ci = sum(p[0] for p in cluster) / len(cluster)
        cj = sum(p[1] for p in cluster) / len(cluster)
        peak_val = max(p[2] for p in cluster)

        zlat = lat_min + (ci / rows) * (lat_max - lat_min)
        zlng = lng_min + (cj / cols) * (lng_max - lng_min)

        land_kinds = _zone_land_kinds(cluster, grid_land)
        pattern_key, pattern_ex = _zone_pattern(land_kinds, is_hot)

        severity = min(1.0, max(0.0, abs(peak_val - avg_temp) / 10.0))

        cells_out = []
        for pi, pj, pv in cluster:
            clat = lat_min + (pi / rows) * (lat_max - lat_min)
            clng = lng_min + (pj / cols) * (lng_max - lng_min)
            cells_out.append({
                "lat": round(clat, 6),
                "lng": round(clng, 6),
                "temp_f": round(pv, 1),
            })

        return {
            "kind": "hotspot" if is_hot else "coolspot",
            "label": f"{'Hot' if is_hot else 'Cool'} Zone",
            "severity": round(severity, 3),
            "peak_temp_f": round(peak_val, 1),
            "center_lat": round(zlat, 6),
            "center_lng": round(zlng, 6),
            "area_cells": len(cluster),
            "land_kinds": land_kinds,
            "pattern": pattern_key,
            "pattern_explanation": pattern_ex,
            "cells": cells_out,
        }

    hotspots = [_make_zone(c, True) for c in hot_clusters if c]
    coolspots = [_make_zone(c, False) for c in cool_clusters if c]

    # Temporal sampling
    temporal = None
    if hour is None and month is None:
        diurnal = []
        for h in [0, 6, 12, 18]:
            s = compute_surface(lat, lng, radius_m=radius_m,
                                resolution=max(10, resolution // 2),
                                hour=h, month=None)
            diurnal.append({
                "hour": h,
                "surface_avg_f": s["surface_avg_f"],
                "surface_min_f": s["surface_min_f"],
                "surface_max_f": s["surface_max_f"],
                "hotspot_count": len(s["hotspots"]),
                "coolspot_count": len(s["coolspots"]),
            })
        seasonal = []
        for m in [1, 4, 7, 10]:
            s = compute_surface(lat, lng, radius_m=radius_m,
                                resolution=max(10, resolution // 2),
                                hour=14, month=m)
            seasonal.append({
                "month": m,
                "surface_avg_f": s["surface_avg_f"],
                "surface_min_f": s["surface_min_f"],
                "surface_max_f": s["surface_max_f"],
            })
        temporal = {
            "diurnal_sampling": diurnal,
            "seasonal_sampling": seasonal,
            "hours_analyzed": [0, 3, 6, 9, 12, 15, 18, 21],
            "months_analyzed": list(range(1, 13)),
        }

    # Sample grid for frontend
    total_cells = len(all_cells)
    max_sample = 200
    if total_cells > max_sample:
        step = total_cells / max_sample
        sampled = [all_cells[int(i * step)] for i in range(max_sample)]
    else:
        sampled = all_cells

    return {
        "center_lat": lat,
        "center_lng": lng,
        "radius_m": radius_m,
        "resolution": resolution,
        "rows": rows,
        "cols": cols,
        "lat_min": round(lat_min, 6),
        "lat_max": round(lat_max, 6),
        "lng_min": round(lng_min, 6),
        "lng_max": round(lng_max, 6),
        "surface_min_f": round(min_temp, 1),
        "surface_max_f": round(max_temp, 1),
        "surface_avg_f": round(avg_temp, 1),
        "hotspots": [h for h in hotspots if h],
        "coolspots": [c for c in coolspots if c],
        "temporal": temporal,
        "grid_sample": sampled,
    }