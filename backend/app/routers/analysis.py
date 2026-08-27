"""Analysis endpoints — Layer 2: understand a spot (heat + land use).

This router exposes the pattern-recognition vision:
- /spot       — single-point heat + land use (Layer 2 baseline)
- /pattern    — heat-pattern classification for a spot (urban_heat_island, road_heat_trap, etc.)
- /surface    — 3D temperature raster with hotspot/coolspot detection + 24h/monthly trends
- /simulation_3d — 3D digital twin: buildings, roads, hospital access, targeted interventions
- /train      (POST) — pattern trainer (heuristic weight tuning)
- /model      (GET)  — current trainer model weights
"""
from fastapi import APIRouter, Query

from ..config import settings
from ..services import landuse
from ..services.heat_provider import build_provider
from ..services.planner import analyze_pattern
from ..services.heat_surface import compute_surface
from ..services.city_simulation import analyze_city_3d
from ..services.trainer import trainer, HEURISTIC_MODEL

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

_provider = None


def get_provider():
    global _provider
    if _provider is None:
        _provider = build_provider(use_mock=settings.use_mock_heat)
    return _provider


@router.get("/spot")
def analyze_spot(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    """Live heat + land classification for a single coordinate."""
    heat = get_provider().get_temperature(lat, lng).to_dict()
    land = landuse.classify_spot(lat, lng)
    summary = f"{land['label'].capitalize()}, {heat['temp_f']}°F ({heat['risk']})"
    return {"heat": heat, "land": land, "summary": summary}


@router.get("/pattern")
def spot_pattern(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    """
    Heat-pattern classification for a spot.

    Inputs: lat, lng.
    Outputs: pattern key + human-readable summary (urban_heat_island, road_heat_trap,
    cool_zone, building_heat, dense_urban, mixed_zone, ...).
    """
    return analyze_pattern(lat, lng)


@router.get("/surface")
def heat_surface(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_m: int = Query(100, ge=50, le=500),
    resolution: int = Query(10, ge=8, le=20),
):
    """
    3D temperature raster (the "heat surface" behind the map screen).

    Inputs: lat, lng, radius_m (50-500), resolution (8-20 cells per side).
    Outputs: grid_sample[] (cells), hotspots[], coolspots[], surface_min/max/avg,
    temporal (diurnal + seasonal sampling).
    """
    return compute_surface(lat, lng, radius_m, resolution)


@router.get("/simulation_3d")
def city_simulation_3d(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_m: int = Query(150, ge=50, le=500),
):
    """
    3D city digital twin (the pattern-organized city view).

    Inputs: lat, lng, radius_m.
    Outputs: buildings[] (height + temp), roads[] (access_weight to nearest hospital),
    vegetation[], hospitals[], interventions[] (targeted at hotspots).
    """
    return analyze_city_3d(lat, lng, radius_m)


@router.post("/train")
def trigger_training():
    """
    Run one cycle of the pattern-recognition trainer.

    Simulates training across California city archetypes and returns the
    updated model weights + accuracy.
    """
    return trainer.train_on_california()


@router.get("/model")
def get_model():
    """Current trainer model weights (heuristic parameters)."""
    return {"weights": HEURISTIC_MODEL, "accuracy": trainer.accuracy}
