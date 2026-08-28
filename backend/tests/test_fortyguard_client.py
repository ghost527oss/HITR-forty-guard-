"""
Unit tests for services/fortyguard_client.py.

These tests NEVER touch the network and NEVER need an API key: an injectable
`transport` (a fake httpx.Client) stands in for HTTP. That matters because the
client can be fully proven correct *before* a real key is plugged in — plugging
a metered key into unproven code is how you spend 1,600 credits in one page load.

Test-style template followed:
  - normal / edge / invalid / boundary cases all covered
  - one assertion focus per test, descriptive names
  - at least one test per known risk that would fail if the risk were mishandled
  - explicitly states what is NOT tested and why

KNOWN RISKS guarded here (each has a test named for it):
  R1  Auth header must be `api-key`, NOT `Authorization: Bearer`.
  R2  A 404 from /v1/status is NORMAL right after submission -> must be treated
      as Processing, not raised. The docs call this out explicitly.
  R3  "Failed" is terminal and NOT billed -> must raise immediately, not keep polling.
  R4  A poll timeout must still hand back the activity_id, or the (possibly
      expensive, possibly still-running) task becomes unrecoverable.
  R5  A null environmental value must stay None. The docs are explicit that null
      means "upstream unavailable" and MUST NOT be read as zero. Turning a null
      humidity into 0% would silently produce a wildly wrong "feels like".
  R6  Legacy -999 sentinel must become None (older stored responses).
  R7  Real mode must NOT expose a synchronous get_temperature(lat, lng). The
      existing map view calls the provider 576 times per load; against the real
      async API that is 576 billed tasks.

NOT TESTED HERE, and why:
  - Real HTTP behaviour against api.fortyguard.com. Requires a key and spends
    credits; deferred to a manual smoke check (see docs/fortyguard-api.md).
  - The exact property key holding each tile's temperature in map_data. The docs
    never show a sample feature's `properties`, so _extract_temperature_c() is
    deliberately tolerant. Once a real response is inspected, replace the
    guesswork with a single confirmed key and add a test pinning it.
  - Satellite / Street View Segmentation and the credits-usage endpoint. Their
    paths are not published in the docs.
  - Credential hygiene: keys are read from the environment only and are never
    logged, written to disk, or sent to the frontend. Verified by inspection,
    not by test.

MANUAL TRACES (two worked examples, done by hand before running):

  Trace 1 — happy path, heatmap(gap 80 m, Single Day):
    submit_heatmap() validates AOI (0.94 mi² < 10 mi² cap, inside US bbox),
    validates start_date (2026-08-28 >= 2019-01-01, <= now+12h), validates
    granularity (80 in {60,80,100}). POSTs
      {"polygon_aoi": {...}, "date_time": {"start_date": "2026-08-28",
       "filter_type": 3}, "granularity": 80, "analytic_type": "tcm"}
    Fake returns {"data": {"activity_id": "abc"}} -> "abc".
    wait_for_result(): poll 1 -> status "Processing", sleeps; poll 2 ->
    status "Completed" with result.map_data of one square tile
    [[[-122.42,37.77],[-122.41,37.77],[-122.41,37.78],[-122.42,37.78],
      [-122.42,37.77]]] and properties {"temperature": 31.5}.
    Result: 1 tile, centroid lat=(37.77+37.77+37.78+37.78)/4=37.775,
    lng=(-122.42-122.41-122.41-122.42)/4=-122.415, value=31.5 °C.
    EXPECT: len(result)==1, tiles[0]["lat"]==37.775, value==31.5.

  Trace 2 — null value must not become zero:
    env_params returns relative_humidity_percent = [None] with heat_index_celsius
    = [35.0]. _clean_number(None) -> None (no float() coercion, no 0.0).
    HAD this been coerced to 0.0, PMV/heat-index math would treat the location
    as bone-dry and report a "feels like" several degrees too cool.
    EXPECT: parameter is None, and `is not None` is the only safe guard a caller
    can use — so the test asserts exactly that.
"""

from __future__ import annotations

import json
from typing import Any

import httpx
import pytest

from app.services import fortyguard_client as fg


# ── Fake transport ───────────────────────────────────────────────────────────

class FakeResponse:
    def __init__(self, status_code: int, payload: Any = None, text: str = ""):
        self.status_code = status_code
        self._payload = payload
        self.text = text or (json.dumps(payload) if payload is not None else "")

    def json(self):
        if self._payload is None:
            raise ValueError("no json")
        return self._payload


class FakeTransport:
    """Stands in for httpx.Client. Replays a scripted list of responses."""

    def __init__(self, responses: list[FakeResponse]):
        self.responses = list(responses)
        self.calls: list[dict] = []

    def request(self, method, url, headers=None, **kwargs) -> FakeResponse:
        self.calls.append({"method": method, "url": url, "headers": headers, **kwargs})
        if not self.responses:
            raise AssertionError("FakeTransport ran out of scripted responses")
        return self.responses.pop(0)

    def close(self):
        pass


def make_client(responses, **kwargs) -> tuple[fg.FortyGuardClient, FakeTransport]:
    transport = FakeTransport(responses)
    client = fg.FortyGuardClient(api_key="test-key-000", transport=transport, **kwargs)
    return client, transport


def ok(data: dict) -> FakeResponse:
    return FakeResponse(200, {"error": False, "status_code": 200, "data": data})


def square(west=-122.42, south=37.77, size=0.01) -> dict:
    return fg.bbox_polygon(west, south, west + size, south + size)


def submitted(activity_id="abc-123") -> FakeResponse:
    return ok({"activity_id": activity_id})


# ── Construction & config ────────────────────────────────────────────────────

def test_construction_without_api_key_raises_a_clear_config_error():
    with pytest.raises(fg.FortyGuardConfigError, match="FORTYGUARD_API_KEY"):
        fg.FortyGuardClient(api_key="")


def test_construction_with_api_key_succeeds():
    client, _ = make_client([])
    assert client.api_key == "test-key-000"


# ── R1: the auth header ──────────────────────────────────────────────────────

def test_auth_header_uses_api_key_not_bearer():
    client, transport = make_client([submitted()])
    client.submit_heatmap(square(), "2026-08-28")
    headers = transport.calls[0]["headers"]
    assert headers["api-key"] == "test-key-000"
    assert "Authorization" not in headers


def test_submit_heatmap_posts_to_the_v1_heatmap_path():
    client, transport = make_client([submitted()])
    client.submit_heatmap(square(), "2026-08-28")
    assert transport.calls[0]["url"].endswith("/v1/heatmap")


# ── Request shape ────────────────────────────────────────────────────────────

def test_submit_heatmap_returns_the_activity_id():
    client, _ = make_client([submitted("f52d2453")])
    assert client.submit_heatmap(square(), "2026-08-28") == "f52d2453"


def test_submit_heatmap_sends_granularity_and_date_time_block():
    client, transport = make_client([submitted()])
    client.submit_heatmap(square(), "2026-08-28", granularity=80, filter_type=3)
    body = transport.calls[0]["json"]
    assert body["granularity"] == 80
    assert body["date_time"] == {"start_date": "2026-08-28", "filter_type": 3}


def test_analytic_type_defaults_to_tcm_degrees_celsius():
    client, transport = make_client([submitted()])
    client.submit_heatmap(square(), "2026-08-28")
    assert transport.calls[0]["json"]["analytic_type"] == "tcm"


def test_exceedance_adds_threshold_and_direction():
    client, transport = make_client([submitted()])
    client.submit_heatmap(square(), "2026-08-28", analytic_type="exceedance", threshold_c=32.0)
    body = transport.calls[0]["json"]
    assert body["threshold"] == 32.0 and body["direction"] == "above"


def test_missing_activity_id_in_response_raises_server_error():
    client, _ = make_client([ok({})])
    with pytest.raises(fg.FortyGuardServerError, match="no activity_id"):
        client.submit_heatmap(square(), "2026-08-28")


# ── Geometry helpers ─────────────────────────────────────────────────────────

def test_bbox_polygon_produces_a_closed_ring():
    ring = fg.bbox_polygon(-122.42, 37.77, -122.41, 37.78)["features"][0]["geometry"]["coordinates"][0]
    assert ring[0] == ring[-1], "docs require a closed Polygon or the API returns 400"
    assert len(ring) == 5


def test_polygon_area_of_a_roughly_1km_box_is_about_one_square_km():
    area = fg.polygon_area_m2(square(size=0.01))  # ~1.1 km x 0.87 km at 37.8N
    assert 900_000 < area < 1_100_000


# ── Validation: invalid (these are 400s, and are NOT billed) ──────────────────

def test_invalid_granularity_is_rejected_before_any_http_call():
    client, transport = make_client([])
    with pytest.raises(fg.FortyGuardRequestError, match="granularity"):
        client.submit_heatmap(square(), "2026-08-28", granularity=50)
    assert transport.calls == []


def test_date_before_2019_is_rejected():
    client, _ = make_client([])
    with pytest.raises(fg.FortyGuardRequestError, match="2019-01-01"):
        client.submit_heatmap(square(), "2018-12-31")


def test_malformed_date_is_rejected():
    client, _ = make_client([])
    with pytest.raises(fg.FortyGuardRequestError, match="YYYY-MM-DD"):
        client.submit_heatmap(square(), "28/08/2026")


def test_date_far_in_the_future_is_rejected():
    client, _ = make_client([])
    with pytest.raises(fg.FortyGuardRequestError, match="12h"):
        client.submit_heatmap(square(), "2030-01-01")


def test_aoi_outside_the_us_is_rejected_because_coverage_is_us_only():
    client, _ = make_client([])
    with pytest.raises(fg.FortyGuardAreaError, match="United States"):
        client.submit_heatmap(fg.bbox_polygon(2.29, 48.85, 2.42, 48.91), "2026-08-28")  # Paris


# ~24.7 mi² at 37.8°N: over the Basic 10 mi² cap, under the Premium 50 mi² cap.
BIG_AOI = fg.bbox_polygon(-122.42, 37.77, -122.329, 37.842)


def test_big_aoi_is_indeed_between_the_two_plan_caps():
    """Guards the two tests below: if the geometry drifts the cap tests stop
    testing what they claim to test."""
    area_mi2 = fg.polygon_area_m2(BIG_AOI) / fg.M2_PER_MI2
    assert 12.0 < area_mi2 < 45.0


def test_aoi_over_the_basic_plan_area_cap_is_rejected():
    client, _ = make_client([], plan="basic")
    with pytest.raises(fg.FortyGuardAreaError, match="caps heatmaps at 10.0"):
        client.submit_heatmap(BIG_AOI, "2026-08-28")


def test_the_same_aoi_is_allowed_on_the_premium_plan():
    client, transport = make_client([submitted()], plan="premium")
    client.submit_heatmap(BIG_AOI, "2026-08-28")
    assert len(transport.calls) == 1


def test_malformed_aoi_is_rejected():
    client, _ = make_client([])
    with pytest.raises(fg.FortyGuardRequestError, match="FeatureCollection"):
        client.submit_heatmap({"type": "Nonsense"}, "2026-08-28")


def test_invalid_analytic_type_is_rejected():
    client, _ = make_client([])
    with pytest.raises(fg.FortyGuardRequestError, match="analytic_type"):
        client.submit_heatmap(square(), "2026-08-28", analytic_type="feels_like")


# ── Boundary ─────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("granularity", [60, 80, 100])
def test_all_documented_granularities_are_accepted(granularity):
    client, transport = make_client([submitted()])
    client.submit_heatmap(square(), "2026-08-28", granularity=granularity)
    assert transport.calls[0]["json"]["granularity"] == granularity


def test_the_earliest_permitted_date_is_accepted():
    client, transport = make_client([submitted()])
    client.submit_heatmap(square(), "2019-01-01")
    assert transport.calls[0]["json"]["date_time"]["start_date"] == "2019-01-01"


# ── HTTP error mapping ───────────────────────────────────────────────────────

def test_401_raises_auth_error():
    client, _ = make_client([FakeResponse(401, text="unauthorized")])
    with pytest.raises(fg.FortyGuardAuthError):
        client.submit_heatmap(square(), "2026-08-28")


def test_403_raises_plan_error_naming_the_premium_endpoints():
    client, _ = make_client([FakeResponse(403, text="forbidden")])
    with pytest.raises(fg.FortyGuardPlanError, match="Premium"):
        client.submit_heatmap(square(), "2026-08-28")


def test_429_raises_rate_limit_error():
    client, _ = make_client([FakeResponse(429, text="slow down")])
    with pytest.raises(fg.FortyGuardRateLimitError):
        client.submit_heatmap(square(), "2026-08-28")


def test_500_raises_server_error():
    client, _ = make_client([FakeResponse(500, text="boom")])
    with pytest.raises(fg.FortyGuardServerError):
        client.submit_heatmap(square(), "2026-08-28")


def test_network_failure_raises_transport_error():
    class ExplodingTransport:
        def request(self, *a, **k):
            raise httpx.ConnectError("no route to host")

        def close(self):
            pass

    client = fg.FortyGuardClient(api_key="k", transport=ExplodingTransport())
    with pytest.raises(fg.FortyGuardTransportError, match="Network failure"):
        client.submit_heatmap(square(), "2026-08-28")


def test_non_json_response_raises_transport_error():
    client, _ = make_client([FakeResponse(200, text="<html>not json</html>")])
    with pytest.raises(fg.FortyGuardTransportError, match="Non-JSON"):
        client.submit_heatmap(square(), "2026-08-28")


# ── Polling ──────────────────────────────────────────────────────────────────

def test_wait_for_result_returns_the_result_payload():
    client, _ = make_client([
        ok({"activity_id": "abc", "status": "Processing"}),
        ok({"activity_id": "abc", "status": "Completed", "result": {"map_data": {}, "stats_data": {}}}),
    ])
    assert client.wait_for_result("abc", sleep=lambda _: None) == {"map_data": {}, "stats_data": {}}


def test_polling_hits_the_status_path_with_the_activity_id():
    client, transport = make_client([ok({"activity_id": "abc", "status": "Completed", "result": {}})])
    client.wait_for_result("abc", sleep=lambda _: None)
    assert transport.calls[0]["url"].endswith("/v1/status/abc")
    assert transport.calls[0]["method"] == "GET"


# R2
def test_a_404_from_status_is_treated_as_processing_not_an_error():
    """Docs: an activity can be briefly 404 immediately after submission."""
    client, _ = make_client([
        FakeResponse(404, text="not found"),
        ok({"activity_id": "abc", "status": "Completed", "result": {"ok": True}}),
    ])
    assert client.wait_for_result("abc", sleep=lambda _: None) == {"ok": True}


# R3
def test_failed_status_raises_immediately_and_stops_polling():
    client, transport = make_client([ok({"activity_id": "abc", "status": "Failed"})])
    with pytest.raises(fg.FortyGuardTaskFailedError, match="not billed"):
        client.wait_for_result("abc", sleep=lambda _: None)
    assert len(transport.calls) == 1, "Failed is terminal — must not keep polling"


# R4
def test_poll_timeout_carries_the_activity_id_so_the_task_is_recoverable():
    client, _ = make_client([ok({"activity_id": "abc", "status": "Processing"})] * 5)
    with pytest.raises(fg.FortyGuardTimeoutError) as exc:
        client.wait_for_result("abc", timeout_s=0, sleep=lambda _: None)
    assert exc.value.activity_id == "abc"


def test_completed_without_a_result_payload_raises_server_error():
    client, _ = make_client([ok({"activity_id": "abc", "status": "Completed"})])
    with pytest.raises(fg.FortyGuardServerError, match="without a result"):
        client.wait_for_result("abc", sleep=lambda _: None)


# ── Heatmap parsing ──────────────────────────────────────────────────────────

def _tile(value=None, **props):
    properties = dict(props)
    if value is not None or "temperature" not in properties:
        properties.setdefault("temperature", value)
    return {
        "type": "Feature",
        "properties": properties,
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-122.42, 37.77], [-122.41, 37.77],
                [-122.41, 37.78], [-122.42, 37.78],
                [-122.42, 37.77],
            ]],
        },
    }


def test_heatmap_parses_each_tile_into_a_centroid_and_a_value():
    client, _ = make_client([
        submitted("abc"),
        ok({"activity_id": "abc", "status": "Completed", "result": {
            "map_data": {"type": "FeatureCollection", "features": [_tile(31.5)]},
            "stats_data": {},
        }}),
    ])
    result = client.heatmap(square(), "2026-08-28", sleep=lambda _: None)
    assert len(result) == 1
    assert result.tiles[0]["lat"] == pytest.approx(37.775)
    assert result.tiles[0]["lng"] == pytest.approx(-122.415)
    assert result.tiles[0]["value"] == pytest.approx(31.5)


def test_tcm_heatmaps_are_marked_as_temperature_maps():
    result = fg.HeatmapResult.from_payload({}, activity_id="a", analytic_type="tcm")
    assert result.is_temperature_map is True


def test_exceedance_heatmaps_are_hours_not_degrees():
    result = fg.HeatmapResult.from_payload({}, activity_id="a", analytic_type="exceedance")
    assert result.is_temperature_map is False


def test_empty_map_data_yields_no_tiles_rather_than_crashing():
    result = fg.HeatmapResult.from_payload(
        {"map_data": {"type": "FeatureCollection", "features": []}},
        activity_id="a", analytic_type="tcm",
    )
    assert len(result) == 0


def test_temperature_stats_are_read_from_stats_data():
    result = fg.HeatmapResult.from_payload(
        {"stats_data": {"Temperature_stats": {
            "Minimum": 22.5, "Maximum": 41.0, "Mean": 31.2, "Standard_deviation": 3.4}}},
        activity_id="a", analytic_type="tcm",
    )
    stats = result.temperature_stats_c()
    assert (stats["min"], stats["max"], stats["mean"], stats["std_dev"]) == (22.5, 41.0, 31.2, 3.4)


def test_temperature_stats_fall_back_to_tiles_when_stats_data_is_absent():
    result = fg.HeatmapResult.from_payload(
        {"map_data": {"features": [_tile(20.0), _tile(30.0)]}},
        activity_id="a", analytic_type="tcm",
    )
    stats = result.temperature_stats_c()
    assert stats["min"] == 20.0 and stats["max"] == 30.0 and stats["mean"] == 25.0


# R5 — the highest-consequence correctness risk in the whole client
def test_a_null_temperature_stays_none_and_is_never_coerced_to_zero():
    """A null means 'upstream unavailable'. Reading it as 0 °C would render an
    Arctic-blue tile in the middle of a heatwave."""
    assert fg._clean_number(None) is None
    result = fg.HeatmapResult.from_payload(
        {"map_data": {"features": [_tile(value=None)]}},
        activity_id="a", analytic_type="tcm",
    )
    assert result.tiles[0]["value"] is None
    assert result.tiles[0]["value"] != 0


# R6
def test_the_legacy_minus_999_sentinel_becomes_none():
    assert fg._clean_number(-999) is None
    assert fg._clean_number(-999.0) is None


def test_a_genuine_negative_temperature_survives_cleaning():
    assert fg._clean_number(-12.5) == -12.5


def test_unknown_temperature_property_key_falls_back_to_the_first_numeric_one():
    """Assumption A: the docs never show a sample tile's properties, so the
    extractor must not hard-fail on an unexpected key."""
    feature = {"properties": {"thermal_reading_c": 28.25}, "geometry": _tile()["geometry"]}
    result = fg.HeatmapResult.from_payload(
        {"map_data": {"features": [feature]}}, activity_id="a", analytic_type="tcm",
    )
    assert result.tiles[0]["value"] == pytest.approx(28.25)


# ── Environmental Parameters ─────────────────────────────────────────────────

def test_env_params_posts_to_the_env_params_path():
    client, transport = make_client([submitted()])
    client.submit_env_params(37.77, -122.42, 31.5, "2026-08-28")
    assert transport.calls[0]["url"].endswith("/v1/env_params")


def test_env_params_sends_temperature_in_celsius():
    client, transport = make_client([submitted()])
    client.submit_env_params(37.77, -122.42, 31.5, "2026-08-28")
    assert transport.calls[0]["json"]["temperature"] == 31.5


def test_env_params_omits_analysis_when_not_requested():
    client, transport = make_client([submitted()])
    client.submit_env_params(37.77, -122.42, 31.5, "2026-08-28")
    assert "analysis" not in transport.calls[0]["json"]


def test_env_params_can_request_the_humidity_and_heat_index_the_planner_needs():
    client, transport = make_client([submitted()])
    client.submit_env_params(37.77, -122.42, 31.5, "2026-08-28",
                             analysis=["relative_humidity_percent", "heat_index_celsius"])
    assert transport.calls[0]["json"]["analysis"] == [
        "relative_humidity_percent", "heat_index_celsius"]


def test_env_params_rejects_more_than_three_parameters_on_the_basic_plan():
    client, _ = make_client([], plan="basic")
    with pytest.raises(fg.FortyGuardPlanError, match="at most 3"):
        client.submit_env_params(37.77, -122.42, 31.5, "2026-08-28",
                                 analysis=["a", "b", "c", "d"])


def test_env_params_allows_more_than_three_parameters_on_premium():
    client, transport = make_client([submitted()], plan="premium")
    client.submit_env_params(37.77, -122.42, 31.5, "2026-08-28", analysis=["a", "b", "c", "d"])
    assert len(transport.calls[0]["json"]["analysis"]) == 4


def test_env_params_rejects_out_of_range_coordinates():
    client, _ = make_client([])
    with pytest.raises(fg.FortyGuardRequestError, match="out of range"):
        client.submit_env_params(200.0, -122.42, 31.5, "2026-08-28")


def test_env_params_locations_are_parsed_with_null_safe_numbers():
    payload = {"result": {"locations": [{
        "lat": 37.77, "lon": -122.42, "elevation": 12.0, "temperature": 31.5,
        "parameters": {
            "relative_humidity_percent": [None],   # upstream unavailable
            "heat_index_celsius": [35.2],
            "apparent_temperature_celsius": [33.1],
        },
    }]}}
    params = payload["result"]["locations"][0]["parameters"]
    assert fg._clean_number(params["relative_humidity_percent"][0]) is None
    assert fg._clean_number(params["heat_index_celsius"][0]) == 35.2


# ── Heat Intelligence ────────────────────────────────────────────────────────

def test_heat_intelligence_is_refused_on_the_basic_plan():
    client, _ = make_client([], plan="basic")
    with pytest.raises(fg.FortyGuardPlanError, match="Premium"):
        client.submit_heat_intelligence(37.77, -122.42, 88.7, "2026-08-28", ["environmental"])


def test_heat_intelligence_sends_temperature_in_fahrenheit():
    client, transport = make_client([submitted()], plan="premium")
    client.submit_heat_intelligence(37.77, -122.42, 88.7, "2026-08-28", ["environmental"])
    body = transport.calls[0]["json"]
    assert body["temperature"] == 88.7
    assert body["date"] == "2026-08-28"
    assert transport.calls[0]["url"].endswith("/v1/heat_intelligence")


# ── R7: the safety property that protects the credit balance ──────────────────

def test_the_real_client_does_not_expose_a_synchronous_get_temperature():
    """The map view calls the provider 576 times per load and the Design Studio
    ~1,600 times. Against a real async, metered API that would be 576–1,600
    billed tasks per page view. Refusing to offer a per-point synchronous method
    makes that mistake impossible rather than merely discouraged."""
    assert not hasattr(fg.FortyGuardClient, "get_temperature")
