"""Frontend/backend contract tests.

THE POINT OF THIS FILE: three separate defects shipped because `frontend/src/api.ts`
and the FastAPI responses drifted apart silently —

  * `/api/heat/grid` returns `points`, the client read `cells` (heat overlay never rendered)
  * `Plan` declared `temp_c` / `pattern` / `pattern_label` the backend never sent
  * `getNearbyPOIs()` pointed at `/api/analysis/pois`, which does not exist

Rather than duplicate the shapes by hand (which drifts again), these tests parse
the TypeScript interfaces out of `api.ts` and assert the live JSON responses
actually carry those fields. `api.ts` is the single source of truth.
"""

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
TS_API = REPO_ROOT / "frontend" / "src" / "api.ts"


def ts_interface_fields(name: str) -> list[str]:
    """Extract field names from `export interface <name> { ... }` in api.ts.

    Handles optional fields (`foo?:`) and trailing comments. Fields whose type
    opens a nested object literal (e.g. `knowledge?: { ... }`) are skipped,
    because those shapes are asserted separately.
    """
    text = TS_API.read_text(encoding="utf-8")
    match = re.search(rf"export interface {name}\s*\{{(.*?)\n\}}", text, re.S)
    assert match, f"interface {name} not found in {TS_API}"

    fields: list[str] = []
    depth = 0
    for raw in match.group(1).splitlines():
        line = re.sub(r"//.*$", "", raw).strip()
        if not line or line.startswith(("/*", "*")):
            continue
        if depth:
            depth += line.count("{") - line.count("}")
            continue
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\??\s*:(.*)$", line)
        if m:
            fields.append(m.group(1))
            depth += m.group(2).count("{") - m.group(2).count("}")
    return fields


def assert_has(payload: dict, name: str, optional: set[str] | None = None) -> None:
    """Assert a response body carries every field the TS interface declares."""
    optional = optional or set()
    missing = [f for f in ts_interface_fields(name) if f not in optional and f not in payload]
    assert not missing, (
        f"{name} response is missing field(s) declared in frontend/src/api.ts: {missing}. "
        f"Either add them to the backend or remove them from the interface."
    )


# ── Heat ─────────────────────────────────────────────────────────────────────

def test_heat_point_matches_HeatReading(client, coords):
    lat, lng = coords
    r = client.get(f"/api/heat/point?lat={lat}&lng={lng}")
    assert r.status_code == 200
    assert_has(r.json(), "HeatReading")


def test_heat_grid_uses_points_not_cells(client, coords):
    """Regression: the client originally read `cells`; the backend sends `points`.

    `HeatGridResponse` tolerates both, but only `points` is real. If someone
    'fixes' the backend to send `cells` without updating the client, this fails.
    """
    lat, lng = coords
    r = client.get(f"/api/heat/grid?lat={lat}&lng={lng}&steps=4")
    assert r.status_code == 200
    body = r.json()
    # `cells` is the not-yet-implemented field name the client also tolerates.
    assert_has(body, "HeatGridResponse", optional={"cells"})
    assert body["points"], "expected `points` to be the populated field"
    for cell in body["points"]:
        assert_has(cell, "HeatCell")


# ── Analysis ─────────────────────────────────────────────────────────────────

def test_spot_matches_SpotAnalysis(client, coords):
    lat, lng = coords
    r = client.get(f"/api/analysis/spot?lat={lat}&lng={lng}")
    assert r.status_code == 200
    body = r.json()
    assert_has(body, "SpotAnalysis")
    assert_has(body["heat"], "HeatReading")
    assert_has(body["land"], "LandInfo")


def test_pattern_matches_PatternAnalysis(client, coords):
    lat, lng = coords
    r = client.get(f"/api/analysis/pattern?lat={lat}&lng={lng}")
    assert r.status_code == 200
    assert_has(r.json(), "PatternAnalysis")


def test_surface_matches_HeatSurfaceResult(client):
    lat, lng = 34.0522, -118.2437
    r = client.get(f"/api/analysis/surface?lat={lat}&lng={lng}&radius_m=100&resolution=10")
    assert r.status_code == 200
    body = r.json()
    assert_has(body, "HeatSurfaceResult")
    for cell in body["grid_sample"]:
        assert_has(cell, "SurfaceCell")
    for zone in body["hotspots"] + body["coolspots"]:
        assert_has(zone, "HeatZone")


def test_simulation_3d_matches_CitySimulation3D(client):
    r = client.get("/api/analysis/simulation_3d?lat=34.0522&lng=-118.2437&radius_m=150")
    assert r.status_code == 200
    body = r.json()
    assert_has(body, "CitySimulation3D")
    for poi in body["hospitals"]:
        assert_has(poi, "POI")


def test_train_matches_TrainingResult(client):
    r = client.post("/api/analysis/train")
    assert r.status_code == 200
    assert_has(r.json(), "TrainingResult")


# (The former test_pois_endpoint_does_not_exist_yet went away with it: the dead
#  getNearbyPOIs() client was removed from api.ts, which the test itself
#  predicted: "getNearbyPOIs was removed from api.ts — this test can go too.")


# ── Planner ──────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("level", [0, 1, 2, 3, 4])
def test_plan_matches_Plan_at_every_level(client, level):
    """Regression: levels 0 and 4 returned 422 while the UI offered them."""
    r = client.get(f"/api/planner/plan?lat=34.0522&lng=-118.2437&change_level={level}")
    assert r.status_code == 200, f"change_level={level} -> {r.status_code}"
    body = r.json()
    # `note` is only sent at level 0, where there are no interventions to list.
    assert_has(body, "Plan", optional={"note"})
    assert_has(body["land"], "LandInfo")
    for it in body["interventions"]:
        assert_has(it, "Intervention")


# ── AI ───────────────────────────────────────────────────────────────────────

def test_ask_matches_AssistantReply(client):
    r = client.post("/api/ai/ask", json={"question": "what is a heat wave"})
    assert r.status_code == 200
    assert_has(r.json(), "AssistantReply")


def test_ai_status_matches_KnowledgeStats(client):
    r = client.get("/api/ai/status")
    assert r.status_code == 200
    body = r.json()

    # `KnowledgeStats` in api.ts is deliberately dual-shape: flat count fields
    # were kept for back-compat with the legacy AiPanel, while the live endpoint
    # nests them under `.knowledge`. So the top level is only required to carry
    # the status fields; the counts are asserted on the nested object below.
    assert_has(body, "KnowledgeStats", optional={
        "cities", "health_conditions", "emergency_contacts",
        "encyclopedia", "buildings", "source",
    })

    inner = body["knowledge"]
    for field in ("cities", "health_conditions", "emergency_contacts",
                  "encyclopedia", "buildings", "source"):
        assert field in inner, f"knowledge.{field} missing"
    assert inner["source"] in ("seed", "supabase")
