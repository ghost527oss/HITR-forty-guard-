"""
FortyGuard Temperature API client — real HTTP path.

Source of truth: https://docs-api.fortyguard.com/docs/  (read 2026-08-28)
Full contract notes live in docs/fortyguard-api.md.

────────────────────────────────────────────────────────────────────────────
HOW THIS API ACTUALLY WORKS (it is NOT a synchronous temperature lookup)
────────────────────────────────────────────────────────────────────────────
  POST /v1/heatmap        -> {"data": {"activity_id": "..."}}     (immediate)
  GET  /v1/status/{id}    -> {"data": {"status": "Processing"}}   (poll)
  GET  /v1/status/{id}    -> {"data": {"status": "Completed",
                                      "result": {"map_data": <GeoJSON>,
                                                 "stats_data": {...}}}}

Every analysis endpoint is ASYNC and AREA-BASED. There is no "give me the
temperature at this lat/lng" call. You submit a polygon, get an activity id,
poll, and receive the whole heatmap as GeoJSON tiles.

Auth is a plain header — `api-key: <key>` — NOT `Authorization: Bearer`.

────────────────────────────────────────────────────────────────────────────
WHY THIS CLASS DOES NOT IMPLEMENT get_temperature(lat, lng)
────────────────────────────────────────────────────────────────────────────
`heat_provider.HeatProvider.get_temperature()` is synchronous and per-point.
The real API is neither. `services/heat_provider.build_provider()` currently
calls the provider 576 times to render one map view and ~1,600 times to open
the Design Studio. Against the real API that would be 576 billed async tasks
per page load.

So this class deliberately exposes the area-based, async shape instead, and
`build_provider(use_mock=False)` raises a clear error rather than silently
hammering the API. See docs/fortyguard-api.md §"Architectural mismatch".

────────────────────────────────────────────────────────────────────────────
EDGE CASES HANDLED EXPLICITLY
────────────────────────────────────────────────────────────────────────────
 1. No API key                       -> FortyGuardConfigError at construction
 2. Polygon ring not closed          -> closed automatically (docs require it, 400 otherwise)
 3. Polygon area over plan limit     -> pre-flight check, FortyGuardAreaError (10 mi² Basic / 50 mi² Premium)
 4. Coordinates outside the US       -> pre-flight check, FortyGuardAreaError (current release is US-only)
 5. Date before 2019-01-01           -> FortyGuardRequestError (400, not billed)
 6. Date more than 12 h in the future-> FortyGuardRequestError (400, not billed)
 7. granularity not in {60,80,100}   -> FortyGuardRequestError (400, not billed)
 8. 401 missing/invalid key          -> FortyGuardAuthError
 9. 403 plan lacks the endpoint      -> FortyGuardPlanError (e.g. Heat Intelligence on Basic)
10. 404 activity not found           -> returned as Processing (docs: normal right after submit)
11. 429 rate limited                 -> FortyGuardRateLimitError (caller should back off)
12. 5xx server error                 -> FortyGuardServerError
13. Network failure / timeout        -> FortyGuardTransportError
14. Status "Failed"                  -> terminal, raised immediately (failed tasks are NOT billed)
15. Poll budget exhausted            -> FortyGuardTimeoutError carrying the activity_id so the
                                        task can still be recovered later (it may finish server-side)
16. Completed but no `result`        -> FortyGuardServerError (defensive; should not happen)
17. Empty map_data FeatureCollection -> returns an empty tile list, not a crash
18. Null parameter values            -> preserved as None, NEVER coerced to 0 (docs are explicit)
19. Legacy -999 sentinel             -> converted to None (docs: older stored responses)
20. Unknown temperature property key -> tolerant extractor, see _extract_temperature_c()

────────────────────────────────────────────────────────────────────────────
ASSUMPTIONS (flagged — these are NOT confirmed by the docs)
────────────────────────────────────────────────────────────────────────────
 A. The docs describe map_data as "GeoJSON polygons" but never show a sample
    feature's `properties`. The key holding each tile's temperature is unknown,
    so _extract_temperature_c() tries a list of candidates and falls back to
    the first numeric property. **Confirm against a real response and delete
    the guesswork.**
 B. `start_time` timezone is undocumented (local vs UTC). Assumed UTC.
 C. Satellite / Street View Segmentation paths are not published; not implemented.
 D. Credits-usage endpoint path is not published; not implemented.
 E. `threshold` / `direction` default to 30 °C / 'above' per docs.
"""

from __future__ import annotations

import math
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Sequence

import httpx

DEFAULT_BASE_URL = "https://api.fortyguard.com/v1"

# endpoint -> path
PATH_HEATMAP = "/heatmap"
PATH_HEAT_INTELLIGENCE = "/heat_intelligence"
PATH_ENV_PARAMS = "/env_params"
PATH_STATUS = "/status/{activity_id}"

VALID_GRANULARITY = (60, 80, 100)
VALID_ANALYTIC_TYPES = ("tcm", "time_of_measure", "exceedance", "persistence")
VALID_FILTER_TYPES = (1, 2, 3, 4)

EARLIEST_DATE = "2019-01-01"
MAX_FORECAST_HOURS = 12

# Plan caps, mi². "None" means no documented cap.
PLAN_MAX_AREA_MI2 = {"basic": 10.0, "premium": 50.0, "startup": 10.0}

M2_PER_MI2 = 2_589_988.11
EARTH_RADIUS_M = 6_371_008.8

# US bounding box, generous enough to include Alaska/Hawaii/territories.
US_BBOX = {"west": -179.15, "south": 18.91, "east": -66.0, "north": 71.44}

# Candidate property keys for a tile's temperature in map_data. See assumption A.
_TEMPERATURE_KEYS = (
    "temperature", "Temperature", "temp", "temp_c", "temperature_c",
    "temperature_celsius", "value", "tcm", "avg_temperature", "mean",
)

_LEGACY_NULL_SENTINEL = -999


class FortyGuardError(Exception):
    """Base class for every FortyGuard failure."""


class FortyGuardConfigError(FortyGuardError):
    """No API key configured."""


class FortyGuardRequestError(FortyGuardError):
    """400/422 — our request was invalid. Not billed."""


class FortyGuardAuthError(FortyGuardError):
    """401 — missing or invalid API key."""


class FortyGuardPlanError(FortyGuardError):
    """403 — the key's plan does not include this endpoint."""


class FortyGuardNotFoundError(FortyGuardError):
    """404 — activity not found. The docs warn this is NORMAL immediately after
    submitting an activity, so callers polling /v1/status should treat it as
    'not ready yet' rather than as a failure."""


class FortyGuardRateLimitError(FortyGuardError):
    """429 — rate limited; caller should back off and retry."""


class FortyGuardServerError(FortyGuardError):
    """5xx, or a Completed response with no usable result."""


class FortyGuardTransportError(FortyGuardError):
    """Network failure, timeout, or unparseable body."""


class FortyGuardTaskFailedError(FortyGuardError):
    """The async task reached terminal status 'Failed'. Not billed."""


class FortyGuardTimeoutError(FortyGuardError):
    """Polling budget exhausted. Carries activity_id so the task is recoverable."""

    def __init__(self, message: str, activity_id: str):
        super().__init__(message)
        self.activity_id = activity_id


class FortyGuardAreaError(FortyGuardRequestError):
    """AOI violates a documented area or coverage constraint."""


def bbox_polygon(west: float, south: float, east: float, north: float) -> dict:
    """Build a closed GeoJSON FeatureCollection polygon from a bounding box.

    Ring order is counter-clockwise starting south-west, and the first and last
    coordinates are identical — the docs require a closed Polygon or the request
    is rejected with 400.
    """
    if south > north:
        south, north = north, south
    if west > east:
        west, east = east, west
    ring = [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],  # close the ring
    ]
    return {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [ring]}}
        ],
    }


def polygon_area_m2(polygon_aoi: dict) -> float:
    """Spherical excess approximation of the first polygon ring, in m².

    O(n) in ring vertices. Good enough to police a 10 mi² plan cap — the exact
    geodesic area is not worth the complexity here.
    """
    try:
        ring = polygon_aoi["features"][0]["geometry"]["coordinates"][0]
    except (KeyError, IndexError, TypeError):
        return 0.0
    if len(ring) < 4:
        return 0.0

    total = 0.0
    for i in range(len(ring) - 1):
        lng1, lat1 = float(ring[i][0]), float(ring[i][1])
        lng2, lat2 = float(ring[i + 1][0]), float(ring[i + 1][1])
        total += math.radians(lng2 - lng1) * (
            2 + math.sin(math.radians(lat1)) + math.sin(math.radians(lat2))
        )
    return abs(total * EARTH_RADIUS_M * EARTH_RADIUS_M / 2.0)


def ring_bbox(polygon_aoi: dict) -> tuple[float, float, float, float] | None:
    """(west, south, east, north) of the first ring, or None if malformed."""
    try:
        ring = polygon_aoi["features"][0]["geometry"]["coordinates"][0]
    except (KeyError, IndexError, TypeError):
        return None
    lngs = [float(c[0]) for c in ring]
    lats = [float(c[1]) for c in ring]
    return min(lngs), min(lats), max(lngs), max(lats)


class FortyGuardClient:
    """Async, area-based client for the FortyGuard Temperature API."""

    def __init__(
        self,
        api_key: str = "",
        base_url: str = DEFAULT_BASE_URL,
        plan: str = "basic",
        timeout: float = 30.0,
        transport: httpx.Client | None = None,
    ):
        if not api_key:
            raise FortyGuardConfigError(
                "FORTYGUARD_API_KEY is not set. Add it to backend/.env (local) or to the "
                "Vercel project's Environment Variables (deployed), then redeploy."
            )
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.plan = plan.lower()
        self.timeout = timeout
        self._client = transport  # injectable so tests never touch the network

    # ── HTTP plumbing ────────────────────────────────────────────────────────

    @property
    def _headers(self) -> dict[str, str]:
        # Docs are explicit: the header is `api-key`, not `Authorization`.
        return {"api-key": self.api_key, "Content-Type": "application/json"}

    def _request(self, method: str, path: str, **kwargs) -> dict:
        client = self._client
        owns_client = client is None
        if owns_client:
            client = httpx.Client(timeout=self.timeout)
        try:
            resp = client.request(method, f"{self.base_url}{path}", headers=self._headers, **kwargs)
        except httpx.HTTPError as exc:
            raise FortyGuardTransportError(f"Network failure calling {path}: {exc}") from exc
        finally:
            if owns_client and client is not None:
                client.close()

        status = resp.status_code
        if status in (401,):
            raise FortyGuardAuthError("401 — API key missing or invalid.")
        if status == 403:
            raise FortyGuardPlanError(
                f"403 — this key's plan does not include {path}. "
                "Heat Intelligence, Satellite and Street View Segmentation are Premium-only."
            )
        if status == 429:
            raise FortyGuardRateLimitError("429 — rate limited. Back off and retry.")
        if status == 404:
            # Raised before any body parsing: a 404 may carry no JSON at all.
            raise FortyGuardNotFoundError(f"404 — not found: {path}")
        if status in (400, 422):
            raise FortyGuardRequestError(f"{status} — invalid request: {resp.text[:400]}")
        if status >= 500:
            raise FortyGuardServerError(f"{status} — FortyGuard server error: {resp.text[:400]}")

        try:
            return resp.json()
        except ValueError as exc:
            raise FortyGuardTransportError(f"Non-JSON response from {path}") from exc

    # ── Validation (all of these would be a billed-less 400) ─────────────────

    @staticmethod
    def _validate_date(start_date: str) -> None:
        try:
            day = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except (TypeError, ValueError) as exc:
            raise FortyGuardRequestError(
                f"start_date must be YYYY-MM-DD, got {start_date!r}"
            ) from exc
        if day.date() < datetime.strptime(EARLIEST_DATE, "%Y-%m-%d").date():
            raise FortyGuardRequestError(f"start_date must be {EARLIEST_DATE} or later")
        if day > datetime.now(timezone.utc) + timedelta(hours=MAX_FORECAST_HOURS):
            raise FortyGuardRequestError(
                f"start_date cannot be more than {MAX_FORECAST_HOURS}h in the future"
            )

    def _validate_aoi(self, polygon_aoi: dict) -> None:
        bbox = ring_bbox(polygon_aoi)
        if bbox is None:
            raise FortyGuardRequestError(
                "polygon_aoi must be a FeatureCollection whose geometry is a Polygon"
            )
        west, south, east, north = bbox
        if not (
            US_BBOX["west"] <= west <= US_BBOX["east"]
            and US_BBOX["south"] <= south <= US_BBOX["north"]
        ):
            raise FortyGuardAreaError(
                "The current FortyGuard release only covers the United States. "
                f"Got bbox ({west}, {south}, {east}, {north})."
            )
        cap = PLAN_MAX_AREA_MI2.get(self.plan, PLAN_MAX_AREA_MI2["basic"])
        area_mi2 = polygon_area_m2(polygon_aoi) / M2_PER_MI2
        if area_mi2 > cap:
            raise FortyGuardAreaError(
                f"AOI is {area_mi2:.2f} mi²; the '{self.plan}' plan caps heatmaps at {cap} mi²."
            )

    @staticmethod
    def _validate_granularity(granularity: int) -> None:
        if granularity not in VALID_GRANULARITY:
            raise FortyGuardRequestError(
                f"granularity must be one of {VALID_GRANULARITY}, got {granularity!r}"
            )

    # ── Submit endpoints ─────────────────────────────────────────────────────

    def submit_heatmap(
        self,
        polygon_aoi: dict,
        start_date: str,
        granularity: int = 80,
        filter_type: int = 3,
        start_time: str | None = None,
        end_time: str | None = None,
        end_date: str | None = None,
        analytic_type: str = "tcm",
        threshold_c: float = 30.0,
        direction: str = "above",
    ) -> str:
        """Submit a heatmap task. Returns the activity_id (does NOT wait)."""
        self._validate_aoi(polygon_aoi)
        self._validate_date(start_date)
        self._validate_granularity(granularity)
        if filter_type not in VALID_FILTER_TYPES:
            raise FortyGuardRequestError(f"filter_type must be one of {VALID_FILTER_TYPES}")
        if analytic_type not in VALID_ANALYTIC_TYPES:
            raise FortyGuardRequestError(f"analytic_type must be one of {VALID_ANALYTIC_TYPES}")

        date_time: dict[str, Any] = {"start_date": start_date, "filter_type": filter_type}
        if start_time is not None:
            date_time["start_time"] = start_time
        if end_time is not None:
            date_time["end_time"] = end_time
        if end_date is not None:
            date_time["end_date"] = end_date

        payload: dict[str, Any] = {
            "polygon_aoi": polygon_aoi,
            "date_time": date_time,
            "granularity": granularity,
            "analytic_type": analytic_type,
        }
        if analytic_type in ("exceedance", "persistence"):
            payload["threshold"] = threshold_c
            payload["direction"] = direction

        return self._submit(PATH_HEATMAP, payload)

    def submit_env_params(
        self,
        lat: float,
        lng: float,
        temperature_c: float,
        start_date: str,
        filter_type: int = 3,
        start_time: str | None = None,
        analysis: Sequence[str] | None = None,
    ) -> str:
        """Submit an Environmental Parameters task. Returns the activity_id.

        This is the endpoint that closes audit #14's humidity gap — it returns
        relative_humidity_percent, heat_index_celsius and
        apparent_temperature_celsius ("feels like"), all of which the planner
        has been unable to source.
        """
        if not -90 <= lat <= 90 or not -180 <= lng <= 180:
            raise FortyGuardRequestError(f"lat/lng out of range: ({lat}, {lng})")
        self._validate_date(start_date)

        date_time: dict[str, Any] = {"start_date": start_date, "filter_type": filter_type}
        if start_time is not None:
            date_time["start_time"] = start_time

        payload: dict[str, Any] = {
            "latitude": lat,
            "longitude": lng,
            "temperature": temperature_c,  # NOTE: env_params takes °C
            "date_time": date_time,
        }
        if analysis:
            if self.plan in ("basic", "startup") and len(analysis) > 3:
                raise FortyGuardPlanError(
                    f"The '{self.plan}' plan allows at most 3 environmental parameters "
                    f"per request; got {len(analysis)}."
                )
            payload["analysis"] = list(analysis)

        return self._submit(PATH_ENV_PARAMS, payload)

    def submit_heat_intelligence(
        self,
        lat: float,
        lng: float,
        temperature_f: float,
        start_date: str,
        analysis: Sequence[str],
    ) -> str:
        """Submit a Heat Intelligence report task (Premium only). Returns a PDF link."""
        if self.plan != "premium":
            raise FortyGuardPlanError("Heat Intelligence is API Premium only.")
        self._validate_date(start_date)
        payload = {
            "latitude": lat,
            "longitude": lng,
            "temperature": temperature_f,  # NOTE: heat_intelligence takes °F
            "date": start_date,
            "analysis": list(analysis),
        }
        return self._submit(PATH_HEAT_INTELLIGENCE, payload)

    def _submit(self, path: str, payload: dict) -> str:
        body = self._request("POST", path, json=payload)
        try:
            return body["data"]["activity_id"]
        except (KeyError, TypeError) as exc:
            raise FortyGuardServerError(
                f"{path} returned no activity_id: {str(body)[:300]}"
            ) from exc

    # ── Polling ──────────────────────────────────────────────────────────────

    def get_status(self, activity_id: str) -> dict:
        """Raw status payload. 404 is normalised to Processing — the docs warn the
        activity may be briefly unavailable immediately after submission."""
        try:
            return self._request("GET", PATH_STATUS.format(activity_id=activity_id))
        except FortyGuardNotFoundError:
            return {"data": {"activity_id": activity_id, "status": "Processing"}}

    def wait_for_result(
        self,
        activity_id: str,
        timeout_s: float = 180.0,
        poll_interval_s: float = 5.0,
        sleep=time.sleep,
    ) -> dict:
        """Poll until Completed or Failed. Returns data.result.

        Failed is terminal and NOT billed. On timeout the activity_id is attached
        so a later request can still recover the result.
        """
        deadline = time.monotonic() + timeout_s
        status_upper = None
        while time.monotonic() < deadline:
            body = self.get_status(activity_id)
            data = body.get("data") or {}
            status_upper = (data.get("status") or "").strip()
            lowered = status_upper.lower()

            if lowered in ("completed", "succeeded"):
                result = data.get("result")
                if result is None:
                    raise FortyGuardServerError(
                        f"Activity {activity_id} completed without a result payload."
                    )
                return result
            if lowered in ("failed", "error"):
                raise FortyGuardTaskFailedError(
                    f"Activity {activity_id} failed. Failed tasks are not billed."
                )
            # "Processing" (and a normalised 404) — keep polling.
            sleep(poll_interval_s)

        raise FortyGuardTimeoutError(
            f"Activity {activity_id} did not complete within {timeout_s:.0f}s "
            f"(last status: {status_upper!r}). It may still finish server-side — "
            f"poll /v1/status/{activity_id} later to recover it.",
            activity_id=activity_id,
        )

    # ── Convenience: submit + wait ───────────────────────────────────────────

    def heatmap(
        self,
        polygon_aoi: dict,
        start_date: str,
        granularity: int = 80,
        analytic_type: str = "tcm",
        timeout_s: float = 180.0,
        sleep=time.sleep,
        **kwargs,
    ) -> HeatmapResult:
        activity_id = self.submit_heatmap(
            polygon_aoi, start_date, granularity=granularity,
            analytic_type=analytic_type, **kwargs,
        )
        result = self.wait_for_result(activity_id, timeout_s=timeout_s, sleep=sleep)
        return HeatmapResult.from_payload(
            result, activity_id=activity_id, analytic_type=analytic_type
        )


# ── Result parsing ───────────────────────────────────────────────────────────

def _clean_number(value: Any) -> float | None:
    """Normalise a parameter value. null stays None; legacy -999 becomes None.

    The docs are explicit: a missing value is NOT zero.
    """
    if value is None:
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if num == _LEGACY_NULL_SENTINEL:
        return None
    if math.isnan(num):
        return None
    return num


def _extract_temperature_c(properties: dict) -> float | None:
    """Pull a tile's °C value out of a map_data feature.

    ASSUMPTION A: the docs never show a sample feature's properties, so this
    tries known candidates first, then falls back to the first numeric property.
    Replace with the confirmed key once a real response has been inspected.
    """
    if not isinstance(properties, dict):
        return None
    for key in _TEMPERATURE_KEYS:
        if key in properties:
            value = _clean_number(properties[key])
            if value is not None:
                return value
    for value in properties.values():
        num = _clean_number(value)
        if num is not None:
            return num
    return None


def _ring_centroid(ring: Iterable[Sequence[float]]) -> tuple[float, float] | None:
    """Centroid of a closed ring. O(n) in vertices; ignores the duplicate last point."""
    points = [(float(c[0]), float(c[1])) for c in ring]
    if len(points) < 3:
        return None
    if points[0] == points[-1]:
        points = points[:-1]
    if not points:
        return None
    lng = sum(p[0] for p in points) / len(points)
    lat = sum(p[1] for p in points) / len(points)
    return lat, lng


class HeatmapResult:
    """Parsed Create Heatmap result — real GeoJSON tiles + real statistics."""

    def __init__(
        self,
        tiles: list[dict],
        stats: dict,
        activity_id: str,
        analytic_type: str,
        map_data: dict,
    ):
        self.tiles = tiles
        self.stats = stats
        self.activity_id = activity_id
        self.analytic_type = analytic_type
        self.map_data = map_data

    @classmethod
    def from_payload(cls, result: dict, activity_id: str, analytic_type: str) -> "HeatmapResult":
        map_data = result.get("map_data") or {}
        stats_data = result.get("stats_data") or {}
        tiles: list[dict] = []

        for feature in (map_data.get("features") or []):
            geometry = feature.get("geometry") or {}
            coords = geometry.get("coordinates")
            if not coords:
                continue
            ring = coords[0] if geometry.get("type") == "Polygon" else coords
            centroid = _ring_centroid(ring)
            if centroid is None:
                continue
            lat, lng = centroid
            properties = feature.get("properties") or {}
            value = _extract_temperature_c(properties)
            tiles.append(
                {
                    "lat": round(lat, 6),
                    "lng": round(lng, 6),
                    "value": value,
                    "properties": properties,
                    "geometry": geometry,
                }
            )

        return cls(
            tiles=tiles,
            stats=stats_data,
            activity_id=activity_id,
            analytic_type=analytic_type,
            map_data=map_data,
        )

    @property
    def is_temperature_map(self) -> bool:
        """True when values are °C. exceedance/persistence/time_of_measure are hours."""
        return self.analytic_type == "tcm"

    def temperature_stats_c(self) -> dict[str, float | None]:
        """Min/max/mean/σ in °C, straight from stats_data (falling back to tiles)."""
        block = self.stats.get("Temperature_stats") or self.stats.get("temperature_stats") or {}
        out = {
            "min": _clean_number(block.get("Minimum")),
            "max": _clean_number(block.get("Maximum")),
            "mean": _clean_number(block.get("Mean")),
            "std_dev": _clean_number(block.get("Standard_deviation")),
        }
        if out["min"] is None or out["max"] is None:
            values = [t["value"] for t in self.tiles if t["value"] is not None]
            if values:
                out["min"] = min(values)
                out["max"] = max(values)
                out["mean"] = sum(values) / len(values)
        return out

    def __len__(self) -> int:
        return len(self.tiles)
