"""
FortyGuard heatmap service — layer B: one request per view, cached by area.

The vendor API is asynchronous and area-based:

    POST /v1/heatmap            ->  {"data": {"activity_id": "..."}}
    GET  /v1/status/{activity}  ->  {"data": {"status": ..., "result": {...}}}

That maps badly onto a page load, which wants raster data *now*. This service
bridges the two:

    submit()  ->  returns an activity_id immediately (caller answers HTTP 202)
    poll()    ->  proxies GET /v1/status and, once Completed, returns the parsed
                  tiles in the same `points` shape /api/heat/grid produces

────────────────────────────────────────────────────────────────────────────
WHY poll() IS STATELESS — this is the important design decision
────────────────────────────────────────────────────────────────────────────
poll() needs only the activity_id, never in-process memory. That is deliberate:
this app deploys to Vercel, where each request may land on a different function
instance. A job store held in a module global would be lost between the submit
call and the first poll, so a "pending job" would never resolve.

The in-memory cache is therefore strictly an OPTIMISATION — it stops us
re-submitting an identical area within CACHE_TTL_S. Losing it costs one
duplicate request, never a broken page.

Call volume, before and after (the Design Studio renders a 20x20 grid):

    before   1,600 provider calls  — one per cell, because HeatProvider exposes
                                     get_temperature(lat, lng)
    after         1 FortyGuard task per view

────────────────────────────────────────────────────────────────────────────
EDGE CASES HANDLED
────────────────────────────────────────────────────────────────────────────
 1. No API key                 -> available is False; callers fall back to mock
 2. Inverted / empty bbox      -> normalised in bbox_polygon()
 3. AOI over the plan cap      -> FortyGuardAreaError surfaced as HTTP 400 (not billed)
 4. Tiles with a null value    -> skipped, never rendered as 0 degrees
 5. Status "Failed"            -> returned as failed; the vendor does not bill these
 6. Vendor/network errors      -> raised as FortyGuardError, mapped to 502 by the router
 7. Cache entry expired        -> re-submitted transparently
 8. Concurrent identical areas -> lock-protected; both callers get the same activity_id
"""

from __future__ import annotations

import threading
import time
from typing import Any

from ..config import settings
from . import heat_provider
from .fortyguard_client import (
    DEFAULT_BASE_URL,
    VALID_GRANULARITY,
    FortyGuardClient,
    FortyGuardError,
    HeatmapResult,
    bbox_polygon,
)

CACHE_TTL_S = 900.0  # 15 min — finer than the vendor's hourly cadence
KEY_QUANTUM = 1e-4  # ~11 m; finer than any granularity the API accepts

PROCESSING = "processing"
READY = "ready"
FAILED = "failed"


def c_to_f(celsius: float) -> float:
    """FortyGuard's `tcm` analytic returns degrees C; this app speaks degrees F."""
    return celsius * 9.0 / 5.0 + 32.0


def cache_key(west: float, south: float, east: float, north: float,
              granularity: int, date: str) -> str:
    """Quantised so a 1 px pan does not produce a new cache miss."""
    q = KEY_QUANTUM
    return (
        f"{round(west / q):.0f},{round(south / q):.0f},"
        f"{round(east / q):.0f},{round(north / q):.0f}"
        f"@{granularity}m@{date}"
    )


class HeatmapService:
    """Submits heatmap tasks, polls them statelessly, caches by area."""

    def __init__(self, client: FortyGuardClient | None = None,
                 ttl_s: float = CACHE_TTL_S):
        self._client = client
        self._ttl = ttl_s
        # cache_key -> (expiry_epoch, activity_id). Best-effort only.
        self._cache: dict[str, tuple[float, str]] = {}
        self._lock = threading.Lock()

    # ── Configuration ────────────────────────────────────────────────────────

    @property
    def available(self) -> bool:
        """False when no key is configured — callers should use the mock."""
        return bool(settings.fortyguard_api_key)

    @property
    def client(self) -> FortyGuardClient:
        if self._client is None:
            base_url = settings.fortyguard_base_url or DEFAULT_BASE_URL
            self._client = FortyGuardClient(
                api_key=settings.fortyguard_api_key,
                plan=settings.fortyguard_plan,
                base_url=base_url,
            )
        return self._client

    # ── Submit ───────────────────────────────────────────────────────────────

    def submit(self, west: float, south: float, east: float, north: float,
               date: str, granularity: int = 80, **kwargs) -> str:
        """Start a heatmap task for an area. Returns the activity_id.

        Cached by (bbox, granularity, date) so panning back to a viewed area
        costs nothing.
        """
        key = cache_key(west, south, east, north, granularity, date)
        now = time.time()

        with self._lock:
            hit = self._cache.get(key)
            if hit and hit[0] > now:
                return hit[1]
            # Opportunistic sweep of expired entries while we hold the lock.
            for k, (expiry, _) in list(self._cache.items()):
                if expiry <= now:
                    self._cache.pop(k, None)

        activity_id = self.client.submit_heatmap(
            bbox_polygon(west, south, east, north),
            date,
            granularity=granularity,
            **kwargs,
        )

        with self._lock:
            self._cache[key] = (now + self._ttl, activity_id)
        return activity_id

    # ── Poll (stateless) ─────────────────────────────────────────────────────

    def poll(self, activity_id: str) -> dict[str, Any]:
        """Proxy the vendor's status endpoint and parse the result if ready.

        Needs nothing but the activity_id, so it works across serverless
        instances. Always returns a dict; raises FortyGuardError on transport
        or vendor failure.
        """
        data = self.client.get_status(activity_id).get("data") or {}
        status = (data.get("status") or "").strip().lower()

        if status in ("completed", "succeeded"):
            parsed = HeatmapResult.from_payload(
                data.get("result") or {},
                activity_id=activity_id,
                analytic_type="tcm",
            )
            points = self.to_points(parsed)
            return {
                "status": READY,
                "activity_id": activity_id,
                "count": len(points),
                "points": points,
                "stats": parsed.temperature_stats_c(),
                # The vendor never documents the tile property keys. Reporting
                # them here is how we learn the real temperature field name
                # from a live response instead of guessing.
                "tile_property_keys": self._property_keys(parsed),
            }

        if status in ("failed", "error"):
            return {
                "status": FAILED,
                "activity_id": activity_id,
                "count": 0,
                "points": [],
                "stats": {},
                "error": ("FortyGuard reported this task as Failed. "
                          "Failed tasks are not billed."),
            }

        return {
            "status": PROCESSING,
            "activity_id": activity_id,
            "count": 0,
            "points": [],
            "stats": {},
        }

    # ── Conversion ───────────────────────────────────────────────────────────

    @staticmethod
    def to_points(parsed: HeatmapResult) -> list[dict[str, Any]]:
        """Real GeoJSON tiles -> the same dict shape /api/heat/grid returns,
        so the frontend needs no new wire format."""
        points: list[dict[str, Any]] = []
        for tile in parsed.tiles:
            value = tile.get("value")
            if value is None:
                # A null means upstream had no value. Rendering it as 0 °F
                # would paint an arctic tile across a heatwave.
                continue
            temp_f = round(c_to_f(value), 1)
            risk, color = heat_provider.risk_for(temp_f)
            points.append({
                "lat": tile["lat"],
                "lng": tile["lng"],
                "temp_f": temp_f,
                "temp_c": round(value, 1),
                "risk": risk,
                "color": color,
                "source": "fortyguard",
            })
        return points

    @staticmethod
    def _property_keys(parsed: HeatmapResult) -> list[str]:
        keys: set[str] = set()
        for tile in parsed.tiles:
            props = tile.get("properties")
            if isinstance(props, dict):
                keys.update(str(k) for k in props.keys())
        return sorted(keys)

    # ── Self-check ───────────────────────────────────────────────────────────

    def selfcheck(self, live: bool = False, lat: float = 37.7749,
                  lng: float = -122.4194, date: str | None = None) -> dict[str, Any]:
        """Report configuration and, optionally, liveness — never the key.

        `live=True` submits one real task and therefore costs one credit. It
        exists so the user can confirm the key works without pasting it
        anywhere or reading logs.
        """
        info: dict[str, Any] = {
            "configured": bool(settings.fortyguard_api_key),
            # Length tells you the right key is loaded without revealing it.
            "api_key": ("set" if settings.fortyguard_api_key else "missing"),
            "api_key_length": len(settings.fortyguard_api_key),
            "base_url": settings.fortyguard_base_url or DEFAULT_BASE_URL,
            "plan": settings.fortyguard_plan,
            "granularity_options": list(VALID_GRANULARITY),
            "coverage": "United States only",
        }

        if not live:
            info["live_check"] = "skipped (pass ?live=1 to submit one real task)"
            return info
        if not info["configured"]:
            info["live_check"] = "cannot run: no API key configured"
            return info

        day = date or time.strftime("%Y-%m-%d", time.gmtime())
        delta = 0.004  # ~440 m — comfortably inside every plan's area cap
        try:
            activity_id = self.submit(
                lng - delta, lat - delta, lng + delta, lat + delta,
                day, granularity=100,
            )
            info["live_check"] = {
                "submitted": True,
                "activity_id": activity_id,
                "poll_url": f"/api/heat/job/{activity_id}",
                "note": ("Poll that URL until status is 'ready'. The response "
                         "then includes tile_property_keys — the field names "
                         "FortyGuard actually uses inside each map tile."),
            }
        except FortyGuardError as exc:
            info["live_check"] = {"submitted": False, "error": str(exc)}
        return info
