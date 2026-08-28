"""Heat provider + heat surface tests."""

import pytest

from app.services.heat_provider import MockHeatProvider, risk_for
from app.services.heat_surface import _risk as surface_risk, compute_surface


# ── Risk thresholds ──────────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "temp_f,expected",
    [
        (60.0, "comfortable"),
        (70.0, "comfortable"),
        (75.0, "moderate"),
        (80.0, "moderate"),
        (85.0, "high"),
        (90.0, "high"),
        (95.0, "very_high"),
        (100.0, "very_high"),
        (105.0, "extreme"),
        (130.0, "extreme"),
    ],
)
def test_risk_labels(temp_f, expected):
    assert risk_for(temp_f)[0] == expected


def test_risk_returns_a_colour():
    label, colour = risk_for(95.0)
    assert label == "very_high"
    assert colour.startswith("#")


def test_provider_reading_shape():
    r = MockHeatProvider().get_temperature(34.0522, -118.2437)
    d = r.to_dict()
    for key in ("lat", "lng", "temp_f", "temp_c", "risk", "color", "source", "measured_at"):
        assert key in d
    assert d["source"] == "mock"
    # temp_c must be the real conversion of temp_f, not an independent guess
    assert abs(d["temp_c"] - (d["temp_f"] - 32) * 5 / 9) < 0.1


def test_mock_provider_is_deterministic():
    a = MockHeatProvider().get_temperature(34.0522, -118.2437).temp_f
    b = MockHeatProvider().get_temperature(34.0522, -118.2437).temp_f
    assert a == b
    assert 80.0 <= a <= 110.0


# ── Known divergence between the two risk tables ─────────────────────────────

@pytest.mark.parametrize("temp_f", [85.0, 95.0, 105.0, 115.0])
def test_risk_tables_agree_above_80f(temp_f):
    assert risk_for(temp_f)[0] == surface_risk(temp_f)[0]


@pytest.mark.xfail(
    reason=(
        "heat_surface._RISK_TABLE has no 'comfortable' tier, so below 80F it "
        "disagrees with heat_provider.RISK_THRESHOLDS (65F is labelled 'moderate' "
        "rather than 'comfortable'). Fix by importing risk_for in heat_surface."
    ),
    strict=True,
)
def test_risk_tables_agree_below_80f():
    assert surface_risk(65.0)[0] == risk_for(65.0)[0]


# ── Heat surface ─────────────────────────────────────────────────────────────

def test_compute_surface_is_deterministic():
    a = compute_surface(34.0522, -118.2437, radius_m=100, resolution=10)
    b = compute_surface(34.0522, -118.2437, radius_m=100, resolution=10)
    assert a["grid_sample"] == b["grid_sample"]
    assert a["surface_avg_f"] == b["surface_avg_f"]


def test_compute_surface_stats_are_consistent():
    s = compute_surface(34.0522, -118.2437, radius_m=100, resolution=10)
    assert s["surface_min_f"] <= s["surface_avg_f"] <= s["surface_max_f"]
    assert s["rows"] == s["cols"] == 10
    assert s["grid_sample"], "grid_sample must never be empty"


def test_compute_surface_includes_temporal_by_default():
    s = compute_surface(34.0522, -118.2437, radius_m=100, resolution=10)
    assert s["temporal"] is not None
    assert len(s["temporal"]["diurnal_sampling"]) == 4
    assert len(s["temporal"]["seasonal_sampling"]) == 4


def test_compute_surface_skips_temporal_when_hour_given():
    """Otherwise the 8 temporal sub-calls recurse forever."""
    s = compute_surface(34.0522, -118.2437, radius_m=100, resolution=10, hour=14)
    assert s["temporal"] is None


def test_zone_kinds_are_tagged():
    s = compute_surface(34.0522, -118.2437, radius_m=200, resolution=16)
    for zone in s["hotspots"] + s["coolspots"]:
        assert zone["kind"] in ("hotspot", "coolspot")
        assert zone["pattern"]
        assert zone["pattern_explanation"]
        assert 0.0 <= zone["severity"] <= 1.0
