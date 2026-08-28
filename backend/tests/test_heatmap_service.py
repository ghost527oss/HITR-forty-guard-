"""
Unit tests for services/heatmap_service.py (layer B) and its router.

No API key and no network are needed: a fake client stands in for HTTP, and
`settings.fortyguard_api_key` is monkeypatched only to flip `available`.

KNOWN RISKS guarded here (each has a test named for it):
  R1  poll() must be stateless. It may only depend on the activity_id, because
      on Vercel the submit and the polls can land on different instances. Any
      in-process job store would silently never resolve.
  R2  The cache must be an optimisation only. Losing it may cost a duplicate
      request, never a broken page.
  R3  Tile values are degrees C and the app speaks degrees F. A missing
      conversion would render 31 C as 31 F — freezing cold, and worse, plausible
      enough to ship.
  R4  A null tile value must be skipped, not rendered as 0 F.
  R5  selfcheck must never echo the key. It is the one endpoint a user will
      screenshot and share.
  R6  A "Failed" task must surface as failed with the not-billed note, so nobody
      re-submits in a panic and burns credits.

NOT TESTED HERE, and why:
  - Real requests against api.fortyguard.com. Costs credits; deferred to
    GET /api/fortyguard/selfcheck?live=1 run once by hand with the real key.
  - The real tile property key for temperature (docs never show one). poll()
    reports `tile_property_keys` so a live run reveals it; a test asserts only
    that the key list is reported, not what it contains.
  - Cache behaviour across processes. It is explicitly per-process and
    best-effort by design; see the service docstring.

MANUAL TRACES (worked by hand before running):

  Trace 1 — submit() caches by area:
    submit(-122.42, 37.77, -122.41, 37.78, "2026-08-28", 80)
    -> cache_key quantises to (-1224200,377700,-1224100,377800)@80m@2026-08-28
       (round(west / 1e-4) = round(-1224200.0) = -1224200)
    cache empty -> client.submit_heatmap() -> "act-1"; stored with expiry now+900
    submit(...) again with the same args -> cache hit, expiry in future
    EXPECT: returns "act-1", and client.submitted has length 1.

  Trace 2 — poll() converts C to F:
    tile value 31.0 C -> c_to_f = 31.0*9/5+32 = 87.8 F -> round 87.8
    risk_for(87.8) -> ("high", colour). point = {lat, lng, temp_f: 87.8,
    temp_c: 31.0, risk, color, source: "fortyguard"}
    HAD the conversion been omitted, temp_f would be 31.0 — a tile that reads
    as snow in a heatwave, and close enough to plausible to ship.
    EXPECT: points[0]["temp_f"] == 87.8 and temp_c == 31.0.
"""

from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.routers import fortyguard as fg_router
from app.services import heatmap_service as hs
from app.services.fortyguard_client import FortyGuardAuthError

BBOX = (-122.42, 37.77, -122.41, 37.78)  # west, south, east, north
DAY = "2026-08-28"


def _tile(value, lat=37.775, lng=-122.415, **props):
    properties = dict(props)
    if value is not None:
        properties["temperature"] = value
    return {
        "type": "Feature",
        "properties": properties,
        "geometry": {"type": "Polygon", "coordinates": [[
            [lng - 0.001, lat - 0.001], [lng + 0.001, lat - 0.001],
            [lng + 0.001, lat + 0.001], [lng - 0.001, lat + 0.001],
            [lng - 0.001, lat - 0.001],
        ]]},
    }


class FakeClient:
    """Stands in for FortyGuardClient. Never touches the network."""

    def __init__(self, activity_id="act-1", status=None):
        self.activity_id = activity_id
        self.status = status or {"data": {"activity_id": activity_id, "status": "Processing"}}
        self.submitted: list[tuple] = []

    def submit_heatmap(self, polygon_aoi, date, granularity=80, **kwargs):
        self.submitted.append((polygon_aoi, date, granularity))
        return self.activity_id

    def get_status(self, activity_id):
        return self.status


def make_service(monkeypatch, **kwargs) -> hs.HeatmapService:
    monkeypatch.setattr(settings, "fortyguard_api_key", "test-key-000")
    return hs.HeatmapService(client=FakeClient(**kwargs))


# ── Conversion ───────────────────────────────────────────────────────────────

def test_celsius_to_fahrenheit_conversion():
    assert hs.c_to_f(0) == 32.0
    assert hs.c_to_f(100) == 212.0
    assert round(hs.c_to_f(31.0), 1) == 87.8


# ── Cache key ────────────────────────────────────────────────────────────────

def test_cache_key_is_stable_for_a_one_metre_pan():
    """R2: a sub-granularity pan must not cause a cache miss."""
    a = hs.cache_key(-122.42, 37.77, -122.41, 37.78, 80, DAY)
    b = hs.cache_key(-122.42001, 37.77, -122.41001, 37.78, 80, DAY)
    assert a == b


def test_cache_key_differs_by_date_and_granularity():
    base = hs.cache_key(*BBOX, 80, DAY)
    assert base != hs.cache_key(*BBOX, 80, "2026-08-29")
    assert base != hs.cache_key(*BBOX, 100, DAY)


def test_cache_key_quantises_coordinates():
    key = hs.cache_key(*BBOX, 80, DAY)
    assert "-1224200,377700,-1224100,377800@80m@2026-08-28" == key


# ── Availability ─────────────────────────────────────────────────────────────

def test_service_is_unavailable_without_an_api_key(monkeypatch):
    monkeypatch.setattr(settings, "fortyguard_api_key", "")
    assert hs.HeatmapService(client=FakeClient()).available is False


def test_service_is_available_with_an_api_key(monkeypatch):
    assert make_service(monkeypatch).available is True


# ── Submit ───────────────────────────────────────────────────────────────────

def test_submit_returns_the_activity_id(monkeypatch):
    svc = make_service(monkeypatch, activity_id="f52d2453")
    assert svc.submit(*BBOX, DAY) == "f52d2453"


def test_submit_calls_the_api_exactly_once(monkeypatch):
    """The whole point of layer B: one task per view, not one per cell."""
    svc = make_service(monkeypatch)
    svc.submit(*BBOX, DAY)
    assert len(svc.client.submitted) == 1


def test_an_identical_area_is_served_from_cache(monkeypatch):
    svc = make_service(monkeypatch)
    first = svc.submit(*BBOX, DAY)
    second = svc.submit(*BBOX, DAY)
    assert first == second
    assert len(svc.client.submitted) == 1, "second submit must not hit the API"


def test_a_different_area_misses_the_cache(monkeypatch):
    svc = make_service(monkeypatch)
    svc.submit(*BBOX, DAY)
    svc.submit(-123.0, 38.0, -122.9, 38.1, DAY)
    assert len(svc.client.submitted) == 2


def test_an_expired_cache_entry_is_resubmitted(monkeypatch):
    """R2: expiry costs a duplicate request, never a failure."""
    svc = make_service(monkeypatch)
    svc.submit(*BBOX, DAY)
    with svc._lock:
        for key, (_, aid) in list(svc._cache.items()):
            svc._cache[key] = (time.time() - 1, aid)
    svc.submit(*BBOX, DAY)
    assert len(svc.client.submitted) == 2


def test_submit_passes_granularity_through(monkeypatch):
    svc = make_service(monkeypatch)
    svc.submit(*BBOX, DAY, granularity=100)
    assert svc.client.submitted[0][2] == 100


# ── Poll ─────────────────────────────────────────────────────────────────────

def _ready(value=31.0, activity_id="act-1", **props):
    return {"data": {"activity_id": activity_id, "status": "Completed", "result": {
        "map_data": {"type": "FeatureCollection", "features": [_tile(value, **props)]},
        "stats_data": {},
    }}}


def test_poll_processing_returns_processing(monkeypatch):
    svc = make_service(monkeypatch, status={"data": {"status": "Processing"}})
    assert svc.poll("act-1")["status"] == hs.PROCESSING


def test_poll_ready_returns_points_in_the_grid_shape(monkeypatch):
    svc = make_service(monkeypatch, status=_ready())
    out = svc.poll("act-1")
    assert out["status"] == hs.READY
    assert out["count"] == 1
    point = out["points"][0]
    assert set(point) == {"lat", "lng", "temp_f", "temp_c", "risk", "color", "source"}
    assert point["source"] == "fortyguard"


def test_poll_converts_celsius_tiles_to_fahrenheit(monkeypatch):
    """R3: the single most dangerous conversion in the integration."""
    svc = make_service(monkeypatch, status=_ready(31.0))
    point = svc.poll("act-1")["points"][0]
    assert point["temp_c"] == 31.0
    assert point["temp_f"] == 87.8


def test_poll_assigns_a_risk_and_colour(monkeypatch):
    svc = make_service(monkeypatch, status=_ready(31.0))
    point = svc.poll("act-1")["points"][0]
    assert point["risk"] and point["color"]


# R4
def test_a_null_tile_value_is_skipped_rather_than_rendered_as_freezing(monkeypatch):
    svc = make_service(monkeypatch, status=_ready(None))
    out = svc.poll("act-1")
    assert out["count"] == 0, "a null must never become 0 degrees"


# R6
def test_a_failed_task_reports_failed_and_says_it_is_not_billed(monkeypatch):
    svc = make_service(monkeypatch, status={"data": {"status": "Failed"}})
    out = svc.poll("act-1")
    assert out["status"] == hs.FAILED
    assert "not billed" in out["error"]


# R1
def test_poll_is_stateless_and_depends_only_on_the_activity_id():
    """R1: poll() must work with no prior submit() in this process — that is
    what makes it survive a serverless instance boundary."""
    svc = hs.HeatmapService(client=FakeClient(status=_ready(20.0)))
    out = svc.poll("activity-from-another-instance")
    assert out["status"] == hs.READY


def test_poll_reports_tile_property_keys_so_the_real_field_name_can_be_learned(monkeypatch):
    """The vendor docs never show a tile's properties. Reporting the keys from
    a live response is how the guesswork in _extract_temperature_c gets removed."""
    svc = make_service(monkeypatch, status=_ready(31.0))
    assert "temperature" in svc.poll("act-1")["tile_property_keys"]


# ── Self-check ───────────────────────────────────────────────────────────────

# R5
def test_selfcheck_never_echoes_the_api_key(monkeypatch):
    secret = "super-secret-key-abcdef123456"
    monkeypatch.setattr(settings, "fortyguard_api_key", secret)
    svc = hs.HeatmapService(client=FakeClient())
    rendered = str(svc.selfcheck()).lower()
    assert secret not in rendered
    assert "abcdef123456" not in rendered


def test_selfcheck_reports_whether_the_key_is_set_and_its_length(monkeypatch):
    monkeypatch.setattr(settings, "fortyguard_api_key", "test-key-000")
    info = hs.HeatmapService(client=FakeClient()).selfcheck()
    assert info["configured"] is True
    assert info["api_key"] == "set"
    assert info["api_key_length"] == len("test-key-000")


def test_selfcheck_reports_missing_key_without_a_live_call(monkeypatch):
    monkeypatch.setattr(settings, "fortyguard_api_key", "")
    info = hs.HeatmapService(client=FakeClient()).selfcheck(live=True)
    assert info["configured"] is False
    assert "no API key" in info["live_check"]


def test_selfcheck_live_submits_one_task_and_returns_a_poll_url(monkeypatch):
    svc = make_service(monkeypatch, activity_id="live-1")
    info = svc.selfcheck(live=True)
    assert info["live_check"]["submitted"] is True
    assert info["live_check"]["activity_id"] == "live-1"
    assert info["live_check"]["poll_url"] == "/api/heat/job/live-1"


def test_selfcheck_skips_the_live_call_by_default(monkeypatch):
    svc = make_service(monkeypatch)
    assert "skipped" in svc.selfcheck()["live_check"]


# ── Router ───────────────────────────────────────────────────────────────────

@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "fortyguard_api_key", "test-key-000")
    monkeypatch.setattr(fg_router, "_service", hs.HeatmapService(client=FakeClient()))
    return TestClient(app)


@pytest.fixture
def client_no_key(monkeypatch):
    monkeypatch.setattr(settings, "fortyguard_api_key", "")
    monkeypatch.setattr(fg_router, "_service", hs.HeatmapService(client=FakeClient()))
    return TestClient(app)


def test_area_answers_202_with_a_poll_url(client):
    r = client.get("/api/heat/area", params={
        "west": -122.42, "south": 37.77, "east": -122.41, "north": 37.78})
    assert r.status_code == 202
    body = r.json()
    assert body["activity_id"] == "act-1"
    assert body["poll_url"] == "/api/heat/job/act-1"


def test_area_answers_503_when_no_key_is_configured(client_no_key):
    r = client_no_key.get("/api/heat/area", params={
        "west": -122.42, "south": 37.77, "east": -122.41, "north": 37.78})
    assert r.status_code == 503
    assert "FORTYGUARD_API_KEY" in r.json()["detail"]


def test_area_rejects_out_of_range_coordinates(client):
    r = client.get("/api/heat/area", params={
        "west": -999, "south": 37.77, "east": -122.41, "north": 37.78})
    assert r.status_code == 422


def test_job_returns_the_parsed_result(client, monkeypatch):
    monkeypatch.setattr(
        fg_router, "_service",
        hs.HeatmapService(client=FakeClient(status=_ready(31.0))))
    r = client.get("/api/heat/job/act-1")
    assert r.status_code == 200
    assert r.json()["status"] == "ready"
    assert r.json()["points"][0]["temp_f"] == 87.8


def test_job_returns_502_when_the_vendor_failed_the_task(client, monkeypatch):
    monkeypatch.setattr(
        fg_router, "_service",
        hs.HeatmapService(client=FakeClient(status={"data": {"status": "Failed"}})))
    r = client.get("/api/heat/job/act-1")
    assert r.status_code == 502
    assert r.json()["status"] == "failed"


def test_job_maps_an_auth_failure_to_401(client, monkeypatch):
    class Unauthorized(FakeClient):
        def get_status(self, activity_id):
            raise FortyGuardAuthError("401 — API key missing or invalid.")

    monkeypatch.setattr(fg_router, "_service", hs.HeatmapService(client=Unauthorized()))
    r = client.get("/api/heat/job/act-1")
    assert r.status_code == 401


def test_selfcheck_endpoint_reports_configured(client):
    r = client.get("/api/fortyguard/selfcheck")
    assert r.status_code == 200
    assert r.json()["configured"] is True


def test_selfcheck_endpoint_does_not_echo_the_key(client):
    body = client.get("/api/fortyguard/selfcheck").text
    assert "test-key-000" not in body


def test_the_new_routes_are_registered(client):
    """Asserted over HTTP rather than by introspecting app.routes, which is an
    implementation detail — reaching them is what actually matters."""
    area = client.get("/api/heat/area", params={
        "west": -122.42, "south": 37.77, "east": -122.41, "north": 37.78})
    assert area.status_code == 202, area.text
    assert client.get("/api/heat/job/act-1").status_code == 200
    assert client.get("/api/fortyguard/selfcheck").status_code == 200
