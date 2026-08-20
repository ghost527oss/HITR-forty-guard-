"""Intervention planner endpoints (Layer 3 — ranked plan with change level)."""
from fastapi import APIRouter, Query

from ..services.planner import build_plan

router = APIRouter(prefix="/api/planner", tags=["planner"])

LEVEL_LABELS = {1: "Light", 2: "Medium", 3: "Full re-plan"}


@router.get("/health")
def health():
    """Placeholder — the ranked intervention algorithm lands here in step 3."""
    return {"status": "planner-ready", "algorithm": "live", "levels": LEVEL_LABELS}


@router.get("/plan")
def plan(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    change_level: int = Query(1, ge=1, le=3),
):
    """Build a ranked intervention plan for the area around (lat, lng)."""
    return build_plan(lat, lng, change_level)
