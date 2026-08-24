"""Heat data endpoints."""
from fastapi import APIRouter, Query

from ..config import settings
from ..services.heat_provider import build_provider

router = APIRouter(prefix="/api/heat", tags=["heat"])

_provider = None


def get_provider():
    global _provider
    if _provider is None:
        _provider = build_provider(use_mock=settings.use_mock_heat)
    return _provider


@router.get("/point")
def heat_point(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    """Live temperature for a single coordinate."""
    reading = get_provider().get_temperature(lat, lng)
    return reading.to_dict()


@router.get("/grid")
def heat_grid(
    lat: float = Query(..., ge=-90, le=90),  # audit #21 fix: validate coords
    lng: float = Query(..., ge=-180, le=180),
    span_deg: float = Query(0.05, ge=0.001, le=1.0),
    steps: int = Query(8, ge=2, le=30),
):
    """Sample a lat/lng grid for an approximate heat-map overlay."""
    provider = get_provider()
    half = span_deg / 2
    points = []
    for i in range(steps):
        for j in range(steps):
            rlat = lat - half + (i + 0.5) * span_deg / steps
            rlng = lng - half + (j + 0.5) * span_deg / steps
            points.append(provider.get_temperature(rlat, rlng).to_dict())
    return {"provider": provider.source, "count": len(points), "points": points}
