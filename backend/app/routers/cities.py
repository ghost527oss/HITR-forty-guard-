"""City data pipeline endpoints (Point 12: Multi-city + California focus)."""
from fastapi import APIRouter, Query

from ..services.cities import search_cities, get_city, get_regions, project_temperature

router = APIRouter(prefix="/api/cities", tags=["cities"])


@router.get("/search")
def search(q: str = Query("", max_length=60)):
    """Search California cities by name/region/climate."""
    return {"results": search_cities(q)}


@router.get("/regions")
def regions():
    """List all California regions."""
    return {"regions": get_regions()}


@router.get("/climate")
def climate_project(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    scenario: str = Query("mild_warming"),
):
    """Point 16: Project temperature under a climate scenario.
    
    scenarios: current, mild_warming, moderate_warming, extreme_warming
    """
    from ..services.heat_provider import build_provider
    from ..config import settings
    provider = build_provider(use_mock=settings.use_mock_heat)
    current = provider.get_temperature(lat, lng)
    return project_temperature(current.temp_f, scenario)