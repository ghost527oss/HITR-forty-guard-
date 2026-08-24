"""
Intervention-planning algorithm (Layer 3 — the centerpiece).

Design (agreed with the team, see docs/algorithm.md):
  * We do NOT rebuild a city from scratch. Streets & buildings stay.
  * We plan *interventions* (trees, shelter-belts, shade structures, water
    stations, building-orientation guidance, farm-layout) that improve the
    existing city.
  * Heat is ONE factor — we also weigh land use and the requested
    "change level" (how much the person wants to change the city).

The "change level" reshapes what the algorithm recommends:
  Level 1 (light)  -> only add trees / shelter-belts / water / shade.
                       City looks identical.
  Level 2 (medium) -> + building orientation / retrofit guidance.
  Level 3 (heavy)  -> + block layout / function-placement re-plan.

Output: a ranked list of interventions, each with what/where/why/impact/cost.
"""
from __future__ import annotations

from ..services import landuse

# Impact estimates (plain language) keyed by (kind, change_level bucket).
_IMPACTS = {
    "trees": "cooler streets: -2 to -4°C under canopy",
    "shelter_belt": "protects crops/fields from heat & wind stress",
    "water": "drinking-water access for people & field workers",
    "shade": "shaded walkways/rest areas reduce heat exposure",
    "orientation": "better shading + airflow: -2 to -5°C indoors",
    "roof": "reflective/insulated roof cuts indoor heat gain",
    "replan": "redesign block layout for cooler, more accessible districts",
}

# Cost buckets by intervention kind.
_COST = {
    "trees": "low",
    "shelter_belt": "medium",
    "water": "medium",
    "shade": "medium",
    "orientation": "low",
    "roof": "medium",
    "replan": "high",
}


def _heat_score(temp_f: float) -> float:
    """0..1 heat severity from a Fahrenheit temperature."""
    if temp_f <= 85:
        return 0.2
    if temp_f <= 95:
        return 0.5
    if temp_f <= 105:
        return 0.8
    return 1.0


def _base_score(heat: float, land_boost: float, level_bonus: float) -> float:
    """Overall priority score (0..~2) for ranking."""
    return round(heat * 1.0 + land_boost + level_bonus, 3)


def _candidates_for(kind: str, change_level: int) -> list[dict]:
    """Candidate interventions appropriate to the land kind + change level."""
    cands = []

    # Always available (light interventions).
    cands.append({"what": "Plant shade trees along the hottest street edges",
                  "impact": _IMPACTS["trees"], "cost": _COST["trees"], "key": "trees"})
    cands.append({"what": "Add a shade structure & drinking-water point at key walkways",
                  "impact": _IMPACTS["shade"], "cost": _COST["shade"], "key": "shade"})
    cands.append({"what": "Install a public water / refill station",
                  "impact": _IMPACTS["water"], "cost": _COST["water"], "key": "water"})

    # Farmland-specific (Level 1 too — farmer scenario from the plan).
    if kind == "farmland":
        cands.insert(0, {"what": "Plant a shelter-belt / windbreak on the hot side",
                         "impact": _IMPACTS["shelter_belt"], "cost": _COST["shelter_belt"], "key": "shelter_belt"})
        cands.insert(0, {"what": "Orient crop rows and inter-crop to reduce heat stress",
                         "impact": _IMPACTS["trees"], "cost": _COST["trees"], "key": "shelter_belt"})

    # Level 2: building retrofit / orientation guidance.
    if change_level >= 2:
        cands.append({"what": "Retrofit buildings with reflective / insulated roofs",
                      "impact": _IMPACTS["roof"], "cost": _COST["roof"], "key": "roof"})
        cands.append({"what": "Adjust building orientation & overhangs for shading + airflow",
                      "impact": _IMPACTS["orientation"], "cost": _COST["orientation"], "key": "orientation"})

    # Level 3: full re-plan.
    if change_level >= 3:
        cands.append({"what": "Re-plan the block layout to keep homes cool & services accessible",
                      "impact": _IMPACTS["replan"], "cost": _COST["replan"], "key": "replan"})

    return cands


def build_plan(lat: float, lng: float, change_level: int = 1) -> dict:
    """Build a ranked intervention plan for the area around (lat, lng)."""
    change_level = max(1, min(3, int(change_level)))  # clamp 1..3

    # Understand the spot: live heat + land classification.
    heat = landuse_heat(lat, lng)
    land = landuse.classify_spot(lat, lng)
    kind = land["kind"]

    temp_f = heat["temp_f"]
    h = _heat_score(temp_f)

    # Land boosts: some surfaces benefit more / are more vulnerable.
    land_boost = {"farmland": 0.3, "building": 0.2, "green": 0.1, "water": 0.0}.get(kind, 0.1)

    # Level bonus: heavier change levels are more ambitious (higher effort/intent).
    level_bonus = {1: 0.0, 2: 0.15, 3: 0.3}[change_level]

    cands = _candidates_for(kind, change_level)
    interventions = []
    for i, c in enumerate(cands):
        score = _base_score(h, land_boost, level_bonus) - i * 0.05  # stable tiebreak
        interventions.append({
            "rank": 0,  # set below after sort
            "what": c["what"],
            "where": f"{kind} area near ({lat:.4f}, {lng:.4f})",
            "why": f"{kind} at {temp_f}°F ({heat['risk']}) — heat severity {_pct(h)}",
            "impact": c["impact"],
            "cost": c["cost"],
            "score": score,
            "key": c["key"],
        })

    # Rank by descending score.
    interventions.sort(key=lambda x: x["score"], reverse=True)
    for i, it in enumerate(interventions):
        it["rank"] = i + 1
        it.pop("score", None)

    return {
        "lat": lat,
        "lng": lng,
        "change_level": change_level,
        "change_label": {1: "Light", 2: "Medium", 3: "Full re-plan"}[change_level],
        "land": land,
        "temp_f": temp_f,
        "risk": heat["risk"],
        "interventions": interventions,
    }


def _pct(x: float) -> str:
    return f"{int(round(x * 100))}%"


def landuse_heat(lat: float, lng: float) -> dict:
    """Reuse the heat provider for the temperature at a spot."""
    from .heat_provider import build_provider
    from ..config import settings
    provider = build_provider(use_mock=settings.use_mock_heat)
    return provider.get_temperature(lat, lng).to_dict()


def analyze_pattern(lat: float, lng: float) -> dict:
    """
    Heat-pattern classification for a single coordinate.

    Inputs: lat, lng.
    Outputs: heat reading, land classification, detected pattern key
    (urban_heat_island | road_heat_trap | building_heat | cool_zone |
    water_cooling | farmland_heat | open_exposure | mixed_zone),
    heat severity (0..1), and a human-readable summary.

    Used by GET /api/analysis/pattern (pattern-recognition endpoint).
    """
    # Heat + land use are the inputs; the pattern classification is the output.
    from .heat_provider import build_provider
    from ..config import settings
    from . import landuse

    provider = build_provider(use_mock=settings.use_mock_heat)
    heat = provider.get_temperature(lat, lng).to_dict()
    land = landuse.classify_spot(lat, lng)

    h = _heat_score(heat["temp_f"])
    kind = land["kind"]

    # Pattern rule (matches the rules in heat_surface._zone_pattern, kept simple here):
    is_hot = h >= 0.5
    if is_hot:
        if kind == "building":
            pattern = "building_heat"
            label = "Building Heat"
            explanation = (
                "Buildings trap heat from AC exhaust, dark roofs, and low albedo. "
                "Tree-lined streets + cool roofs reduce by -2 to -4 C."
            )
        elif kind == "road":
            pattern = "road_heat_trap"
            label = "Road Heat Trap"
            explanation = (
                "Dark asphalt absorbs >90% of solar radiation. "
                "Cool pavement + shade canopy reduce surface temp by -4 to -6 C."
            )
        elif kind == "farmland":
            pattern = "farmland_heat"
            label = "Farmland Heat Stress"
            explanation = (
                "Exposed soil and crops absorb heat. Shelter-belts + crop orientation "
                "reduce stress by 15-30%."
            )
        elif kind == "green":
            # green should not normally be hot; fall through to mixed
            pattern = "mixed_zone"
            label = "Mixed Land Use"
            explanation = (
                "Mixed land use with partial shade. Targeted tree planting "
                "+ green roofs improve comfort."
            )
        else:
            pattern = "open_exposure"
            label = "Open Exposure"
            explanation = (
                "Open ground with no shade heats up fast. "
                "Tree clusters + shade structures reduce exposure."
            )
    else:
        if kind == "green":
            pattern = "cool_zone"
            label = "Park Cool Zone"
            explanation = (
                "Trees and grass cool via evapotranspiration. "
                "This park is 2-5 C cooler than surrounding blocks."
            )
        elif kind == "water":
            pattern = "water_cooling"
            label = "Water Body Cooling"
            explanation = (
                "Water bodies create a microclimate cooling effect, "
                "lowering nearby temps by -1 to -3 C."
            )
        else:
            pattern = "mixed_zone"
            label = "Mixed Land Use"
            explanation = (
                "Mixed land use with partial shade. "
                "Targeted tree planting + green roofs improve comfort."
            )

    return {
        "lat": lat,
        "lng": lng,
        "kind": kind,
        "land_label": land["label"],
        "temp_f": heat["temp_f"],
        "temp_c": heat["temp_c"],
        "risk": heat["risk"],
        "heat_severity": h,
        "heat_severity_pct": _pct(h),
        "pattern": pattern,
        "pattern_label": label,
        "summary": f"{land['label'].capitalize()} at {heat['temp_f']}°F ({heat['risk']}). Pattern: {label}. {explanation}",
    }
