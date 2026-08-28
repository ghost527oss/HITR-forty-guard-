"""Planner tests — the five change levels and the honesty of scale.

The `scale` block exists because a rebuild must never be presented as if it were
a small change. These tests hold that line.
"""

import pytest

from app.services.planner import _LEVEL_SCALE, _candidates_for, build_plan

LA = (34.0522, -118.2437)


# ── All five levels work ─────────────────────────────────────────────────────

@pytest.mark.parametrize("level", [0, 1, 2, 3, 4])
def test_every_level_returns_200(client, level):
    """Regression: 0 and 4 returned 422 while the UI shipped buttons for them."""
    r = client.get(f"/api/planner/plan?lat={LA[0]}&lng={LA[1]}&change_level={level}")
    assert r.status_code == 200, f"change_level={level} -> {r.status_code} {r.text[:200]}"


def test_level_out_of_range_still_rejected(client):
    assert client.get(f"/api/planner/plan?lat={LA[0]}&lng={LA[1]}&change_level=5").status_code == 422
    assert client.get(f"/api/planner/plan?lat={LA[0]}&lng={LA[1]}&change_level=-1").status_code == 422


# ── Level 0 = observe, genuinely nothing ─────────────────────────────────────

def test_level_zero_produces_no_interventions():
    plan = build_plan(*LA, change_level=0)
    assert plan["interventions"] == []
    assert "note" in plan
    assert plan["scale"]["changes_city"] is False


def test_level_zero_candidates_are_empty_for_every_land_kind():
    for kind in ["building", "road", "green", "farmland", "water", "other"]:
        assert _candidates_for(kind, 0) == []


# ── Level 4 = rebuild, and it says so ────────────────────────────────────────

MASTERPLAN_KEYS = {
    "street_grid",
    "zoning",
    "district_cooling",
    "green_network",
    "wind_corridor",
}


def test_level_four_includes_masterplan_interventions():
    keys = {c["key"] for c in _candidates_for("building", 4)}
    assert MASTERPLAN_KEYS <= keys


def test_masterplan_only_appears_at_level_four():
    for level in (1, 2, 3):
        keys = {c["key"] for c in _candidates_for("building", level)}
        assert not (keys & MASTERPLAN_KEYS), f"masterplan leaked into level {level}"


def test_level_four_declares_it_changes_the_city():
    plan = build_plan(*LA, change_level=4)
    assert plan["scale"]["changes_city"] is True
    assert "rebuild" in plan["scale"]["label"].lower() or plan["scale"]["label"] == "Rebuild"


# ── The scale block ──────────────────────────────────────────────────────────

def test_every_level_has_a_scale_block(client):
    for level in range(5):
        body = client.get(f"/api/planner/plan?lat={LA[0]}&lng={LA[1]}&change_level={level}").json()
        assert "scale" in body
        assert body["scale"]["label"]
        assert body["scale"]["touches"]
        assert body["scale"]["note"]
        assert isinstance(body["scale"]["changes_city"], bool)


def test_scale_labels_are_unique_and_ordered():
    labels = [_LEVEL_SCALE[i]["label"] for i in sorted(_LEVEL_SCALE)]
    assert len(set(labels)) == len(labels), "each level needs a distinct label"


def test_intervention_counts_are_monotonic_across_levels():
    """More ambition must never produce fewer options."""
    counts = [len(_candidates_for("building", lvl)) for lvl in range(1, 5)]
    assert counts == sorted(counts), f"candidate counts not monotonic: {counts}"


# ── A plan explains itself ───────────────────────────────────────────────────

def test_plan_carries_pattern_and_severity(client):
    """Without this the user sees a ranked list with no story behind it."""
    body = client.get(f"/api/planner/plan?lat={LA[0]}&lng={LA[1]}&change_level=2").json()
    assert body["pattern"]
    assert body["pattern_label"]
    assert body["heat_severity_pct"].endswith("%")


def test_plan_ranks_are_contiguous_from_one(client):
    body = client.get(f"/api/planner/plan?lat={LA[0]}&lng={LA[1]}&change_level=3").json()
    ranks = [it["rank"] for it in body["interventions"]]
    assert ranks == list(range(1, len(ranks) + 1))


def test_invalid_coordinates_rejected(client):
    assert client.get("/api/planner/plan?lat=99&lng=0&change_level=1").status_code == 422
