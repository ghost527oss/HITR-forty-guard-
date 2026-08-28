"""
Intervention-planning algorithm (Layer 3 — the centerpiece).

Design (agreed with the team, see docs/algorithm.md):
  * Interventions come FIRST. At levels 0-3 we improve the existing city:
    trees, shelter-belts, shade structures, water stations,
    building-orientation guidance, farm-layout. Streets & buildings stay.
  * At level 4 (rebuild) we may also propose a MASTERPLAN — new street grid,
    zoning, district cooling, green network. This is never a silent default;
    every level states plainly how much of the city it touches.
  * Heat is ONE factor — we also weigh land use and the requested
    "change level" (how much the person wants to change the city).

The "change level" reshapes what the algorithm recommends:
  Level 0 (observe) -> no interventions. Report conditions only.
  Level 1 (light)   -> only add trees / shelter-belts / water / shade.
                       City looks identical.
  Level 2 (medium)  -> + building orientation / retrofit guidance.
  Level 3 (heavy)   -> + block layout / function-placement re-plan.
  Level 4 (rebuild) -> + masterplan: new street grid, zoning, district
                       cooling, green network, wind corridors.

Output: a ranked list of interventions, each with what/where/why/impact/cost,
plus a `scale` block describing how much of the city the level touches.
"""
from __future__ import annotations

import math

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
    # Level 4 — masterplan. Vision layer: directional, not engineering drawings.
    "street_grid": "reorients streets to prevailing wind; wider shaded boulevards",
    "zoning": "moves heat-exposed functions away from the hottest blocks",
    "district_cooling": "shared cooling plant cuts peak load across the district",
    "green_network": "connected park chain, not scattered trees: -2 to -4°C district-wide",
    "wind_corridor": "channels cool air into the urban core at night",
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
    "street_grid": "high",
    "zoning": "medium",
    "district_cooling": "high",
    "green_network": "high",
    "wind_corridor": "high",
}

# How much of the city each level touches. This exists so the UI can never imply
# that a rebuild is a small change — the honest answer is always one lookup away.
_LEVEL_SCALE = {
    0: {
        "label": "Observe",
        "touches": "nothing",
        "changes_city": False,
        "note": "No physical change of any kind. Reports current heat conditions only.",
    },
    1: {
        "label": "Light",
        "touches": "surface treatments only",
        "changes_city": False,
        "note": "Trees, shade structures and water points. Streets, buildings and plots stay exactly where they are.",
    },
    2: {
        "label": "Medium",
        "touches": "buildings — envelope & orientation",
        "changes_city": False,
        "note": "Everything in Light, plus roof / overhang / window retrofit on existing buildings. Streets and plots unchanged.",
    },
    3: {
        "label": "Re-plan",
        "touches": "blocks & land use",
        "changes_city": True,
        "note": "Everything in Medium, plus block layout and where functions sit. The street network is still unchanged.",
    },
    4: {
        "label": "Rebuild",
        "touches": "the whole area — streets, zoning, utilities",
        "changes_city": True,
        "note": "Full masterplan. Street grid, zoning, district cooling and green network are all redesigned. "
                "This is a vision-layer proposal, not a finished engineering plan.",
    },
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


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in meters between two lat/lng points."""
    R = 6_371_000.0
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlng / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _compute_context(lat: float, lng: float) -> dict:
    """
    Compute data-driven context for a planner call (audit #14 fix).

    Pulls from heat_surface (hotspots/coolspots) and accessibility.find_nearby
    (POI proximity) to give the planner real spatial factors, not just templates.

    Returns a dict with:
        hotspot_count (int): number of hot zones in a 150m radius
        coolspot_count (int): number of cool zones in a 150m radius
        nearest_hospital_m (float | None): meters to nearest hospital
        equity_score (float 0..1): vulnerable-population density (schools +
            hospitals + transit) — higher = more equity-sensitive
        protective_score (float 0..1): fraction of area cells >100F within
            300m of a hospital (more vulnerable = more protective action needed)
        ok (bool): False if any data source failed (so caller can fall back)

    Wind/humidity factors (audit #14) are intentionally NOT implemented yet —
    they require the real FortyGuard API and are stored for future work.
    """
    import math as _m

    ctx = {
        "hotspot_count": 0,
        "coolspot_count": 0,
        "nearest_hospital_m": None,
        "equity_score": 0.0,
        "protective_score": 0.0,
        "ok": False,
    }

    # Heat surface analysis
    try:
        from .heat_surface import compute_surface
        surface = compute_surface(lat, lng, radius_m=150, resolution=12)
        ctx["hotspot_count"] = len(surface.get("hotspots", []))
        ctx["coolspot_count"] = len(surface.get("coolspots", []))
        # Protective score: fraction of hot cells near any POI (proxy until
        # we get vulnerable-population data; hospitals are the sentinel).
        grid_sample = surface.get("grid_sample", [])
        if grid_sample:
            hot_cells = [c for c in grid_sample if c.get("temp_f", 0) >= 100]
            ctx["protective_score"] = min(1.0, len(hot_cells) / max(1, len(grid_sample)))
    except Exception:
        # Surface analysis failed (e.g. OSM unreachable); return partial ctx.
        return ctx

    # Accessibility / POI proximity
    try:
        from .accessibility import find_nearby
        pois = find_nearby(lat, lng, radius=1000)
        if pois:
            # Hospital distance
            hospitals = [p for p in pois if p.get("category") == "hospital"]
            if hospitals:
                nearest_h_m = min(
                    _haversine_m(lat, lng, h["lat"], h["lng"]) for h in hospitals
                )
                ctx["nearest_hospital_m"] = round(nearest_h_m, 1)
            # Equity: vulnerable-population density. Schools + transit + hospitals
            # in walking distance (≤800m) raise the equity score.
            equity_categories = {"school", "transit", "hospital"}
            equity_count = sum(
                1 for p in pois
                if p.get("category") in equity_categories
                and _haversine_m(lat, lng, p["lat"], p["lng"]) <= 800
            )
            # Normalize: 0 equity POIs -> 0.0; 6+ within 800m -> 1.0
            ctx["equity_score"] = min(1.0, equity_count / 6.0)
        ctx["ok"] = True
    except Exception:
        return ctx

    ctx["ok"] = True
    return ctx


def _context_bonus(ctx: dict) -> float:
    """
    Convert planner context into an additive score bonus (audit #14).

    Each factor contributes 0..1 capped; sum is capped at 0.6 so templates
    still drive ranking when context is empty.
    """
    if not ctx.get("ok"):
        return 0.0
    bonus = 0.0
    # Hotspot count: 0.3 max — if there are ≥3 hot zones, intervene hard
    bonus += 0.3 * min(1.0, ctx.get("hotspot_count", 0) / 3.0)
    # Hospital proximity: 0.2 max — if nearest hospital ≤300m, boost
    # accessibility-driven interventions (shade/water station at walkways).
    nh = ctx.get("nearest_hospital_m")
    if nh is not None and nh <= 300:
        bonus += 0.2 * (1.0 - nh / 300.0)
    # Coolspot preservation: 0.15 max — preserve cool zones with tree barriers.
    bonus += 0.15 * min(1.0, ctx.get("coolspot_count", 0) / 2.0)
    # Equity: 0.15 max — vulnerable populations near the spot raise the priority
    # of shade + water + shelter interventions.
    bonus += 0.15 * ctx.get("equity_score", 0.0)
    # Protective: 0.1 max — heat-on-people near hospitals/critical services.
    bonus += 0.1 * ctx.get("protective_score", 0.0)
    return round(min(0.6, bonus), 3)


def _candidates_for(kind: str, change_level: int) -> list[dict]:
    """Candidate interventions appropriate to the land kind + change level.

    Level 0 (observe) deliberately returns an EMPTY list — there is no such
    thing as a "lightest" intervention when the person asked only to watch.
    """
    cands = []

    # Level 0 = observe only. No interventions, by definition.
    if change_level <= 0:
        return []

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

    # Level 2: building retrofit / orientation guidance. PREPENDED, not
    # appended: at this level the retrofit IS the headline — the plan must
    # visibly start with what this level adds (previously these items sat at
    # the bottom, so Light/Medium/Re-plan looked identical).
    if change_level >= 2:
        cands.insert(0, {"what": "Retrofit buildings with reflective / insulated roofs",
                         "impact": _IMPACTS["roof"], "cost": _COST["roof"], "key": "roof"})
        cands.insert(0, {"what": "Adjust building orientation & overhangs for shading + airflow",
                         "impact": _IMPACTS["orientation"], "cost": _COST["orientation"], "key": "orientation"})

    # Level 3: full re-plan. PREPENDED: the re-plan is the headline at this level.
    if change_level >= 3:
        cands.insert(0, {"what": "Re-plan the block layout to keep homes cool & services accessible",
                         "impact": _IMPACTS["replan"], "cost": _COST["replan"], "key": "replan"})

    # Level 4: masterplan / rebuild. Prepended, because at this level these are
    # the headline items — and each is explicitly a vision-layer proposal.
    if change_level >= 4:
        cands.insert(0, {"what": "Design a connected green network (park chain, not scattered trees)",
                         "impact": _IMPACTS["green_network"], "cost": _COST["green_network"], "key": "green_network"})
        cands.insert(0, {"what": "Reorient the street grid to prevailing wind & shade it with boulevards",
                         "impact": _IMPACTS["street_grid"], "cost": _COST["street_grid"], "key": "street_grid"})
        cands.insert(0, {"what": "Rezone: move heat-exposed functions off the hottest blocks",
                         "impact": _IMPACTS["zoning"], "cost": _COST["zoning"], "key": "zoning"})
        cands.insert(0, {"what": "Add district cooling for the densest blocks",
                         "impact": _IMPACTS["district_cooling"], "cost": _COST["district_cooling"], "key": "district_cooling"})
        cands.insert(0, {"what": "Open night wind corridors to flush heat out of the urban core",
                         "impact": _IMPACTS["wind_corridor"], "cost": _COST["wind_corridor"], "key": "wind_corridor"})

    return cands


def build_plan(lat: float, lng: float, change_level: int = 1) -> dict:
    """Build a ranked intervention plan for the area around (lat, lng).

    change_level 0..4 (observe / light / medium / re-plan / rebuild). Returns a
    `scale` block describing how much of the city that level touches, so the UI
    can never imply a rebuild is a small change.
    """
    change_level = max(0, min(4, int(change_level)))  # clamp 0..4

    # Understand the spot: live heat + land classification.
    heat = landuse_heat(lat, lng)
    land = landuse.classify_spot(lat, lng)
    kind = land["kind"]

    temp_f = heat["temp_f"]
    h = _heat_score(temp_f)

    # Land boosts: some surfaces benefit more / are more vulnerable.
    land_boost = {"farmland": 0.3, "building": 0.2, "green": 0.1, "water": 0.0}.get(kind, 0.1)

    # Level bonus: heavier change levels are more ambitious (higher effort/intent).
    level_bonus = {0: 0.0, 1: 0.0, 2: 0.15, 3: 0.3, 4: 0.45}[change_level]

    # Audit #14 fix: compute data-driven context bonus (hotspots, hospitals,
    # equity, protective). Wind/humidity factors intentionally stored for
    # later — they require the real FortyGuard API and are not yet wired.
    ctx = _compute_context(lat, lng)
    ctx_bonus = _context_bonus(ctx)

    cands = _candidates_for(kind, change_level)

    # Audit #14 fix: append data-driven interventions based on context.
    # These are inserted at the FRONT so they get ranked highest.
    # Skipped entirely at level 0 — "observe" means no interventions, full stop.
    context_interventions = []
    if ctx.get("ok") and change_level > 0:
        if ctx.get("nearest_hospital_m") is not None and ctx["nearest_hospital_m"] <= 300:
            context_interventions.append({
                "what": f"Add water + shade station within 300m of nearest hospital "
                        f"({ctx['nearest_hospital_m']:.0f}m away)",
                "impact": "cuts pre-hospital wait heat exposure; reduces mortality risk",
                "cost": "medium", "key": "hospital_access"})
        if ctx.get("coolspot_count", 0) >= 1:
            context_interventions.append({
                "what": f"Protect the {ctx['coolspot_count']} cool spot(s) with tree barriers "
                        f"to prevent encroachment",
                "impact": "preserves -2 to -4°C natural cooling in surrounding blocks",
                "cost": "low", "key": "protect_coolspot"})
        if ctx.get("equity_score", 0) >= 0.5:
            context_interventions.append({
                "what": f"Prioritize shade structures near vulnerable populations "
                        f"(equity score {ctx['equity_score']:.0%})",
                "impact": "shelters schools, transit stops, and elderly housing",
                "cost": "medium", "key": "equity_priority"})
        if ctx.get("protective_score", 0) >= 0.4:
            context_interventions.append({
                "what": f"Deploy cooling stations to protect residents in extreme-heat blocks "
                        f"({ctx['protective_score']:.0%} of area ≥100°F)",
                "impact": "lives saved during heat waves; indoor cooling for elderly/children",
                "cost": "high", "key": "protective_cooling"})
    cands = context_interventions + cands
    interventions = []
    for i, c in enumerate(cands):
        # Audit #14 fix: data-driven context bonus now flows into the score.
        score = _base_score(h, land_boost, level_bonus) + ctx_bonus - i * 0.05
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

    scale = dict(_LEVEL_SCALE[change_level])
    scale["level"] = change_level

    # Why this plan looks the way it does. Without this the user sees a ranked
    # list and a temperature with no story connecting them.
    pattern, pattern_label, _explanation = _pattern_for(kind, h)

    result = {
        "lat": lat,
        "lng": lng,
        "change_level": change_level,
        "change_label": scale["label"],
        "scale": scale,
        "land": land,
        "temp_f": temp_f,
        "temp_c": heat["temp_c"],
        "risk": heat["risk"],
        "pattern": pattern,
        "pattern_label": pattern_label,
        "heat_severity_pct": _pct(h),
        "interventions": interventions,
    }
    if change_level == 0:
        result["note"] = (
            "Observe-only: no interventions were generated. This level reports the "
            "current heat conditions for the selected spot so you can watch before acting."
        )
    return result


def _pct(x: float) -> str:
    return f"{int(round(x * 100))}%"


def landuse_heat(lat: float, lng: float) -> dict:
    """Reuse the heat provider for the temperature at a spot."""
    from .heat_provider import build_provider
    from ..config import settings
    provider = build_provider(use_mock=settings.use_mock_heat)
    return provider.get_temperature(lat, lng).to_dict()


def _pattern_for(kind: str, h: float) -> tuple[str, str, str]:
    """Classify (land kind, heat severity) -> (pattern key, label, explanation).

    Extracted from `analyze_pattern` so `build_plan` can attach the same
    classification to a plan. A plan that cannot say why it was produced is the
    root of "the user cannot tell what changed or why".
    """
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

    return pattern, label, explanation


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

    h = _heat_score(heat["temp_f"])
    kind = land["kind"]
    pattern, pattern_label, explanation = _pattern_for(kind, h)

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
        "pattern_label": pattern_label,
        "summary": f"{land['label'].capitalize()} at {heat['temp_f']}°F ({heat['risk']}). "
                   f"Pattern: {pattern_label}. {explanation}",
    }
