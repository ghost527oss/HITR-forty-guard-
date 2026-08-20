"""Analysis endpoints — Layer 2: understand a spot (heat + land use)."""
from fastapi import APIRouter, Query

from ..config import settings
from ..services import landuse
from ..services.heat_provider import build_provider

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
