"""Intervention planner endpoints (Layer 3 — ranked plan with change level)."""
from fastapi import APIRouter, Query

from ..services.planner import build_plan

router = APIRouter(prefix="/api/planner", tags=["planner"])

# Levels 0 and 4 added 2026-08-28. The frontend has shipped five change levels
# since v0.5.0 but the router rejected 0 and 4 with a 422, so "None" and
# "Rebuild" were pickable buttons that always failed.
LEVEL_LABELS = {
    0: "Observe",
    1: "Light",
    2: "Medium",
    3: "Re-plan",
    4: "Rebuild",
}


@router.get("/health")
def health():
    """Placeholder — the ranked intervention algorithm lands here in step 3."""
    return {"status": "planner-ready", "algorithm": "live", "levels": LEVEL_LABELS}


@router.get("/plan")
def plan(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    change_level: int = Query(1, ge=0, le=4),
):
    """Build a ranked intervention plan for the area around (lat, lng).

    change_level 0..4 — observe / light / medium / re-plan / rebuild.
    The response includes a `scale` block stating how much of the city the
    chosen level touches.
    """
    return build_plan(lat, lng, change_level)
