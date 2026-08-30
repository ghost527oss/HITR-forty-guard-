"""
Heat data provider abstraction.

The FortyGuard Temperature API is the real source. For development and for a zero-credential demo we
ship a deterministic MOCK provider so the app runs anywhere without a key. The mock still behaves like
the API: it returns a temperature, a risk level, and a source label.

Design: a single `get_temperature(lat, lng, ...)` interface. Swap in the real HTTP client when a key
is configured. See fortyguard_client.py for the real (HTTP) client scaffolding.
"""
from __future__ import annotations

import math
from typing import Protocol

RISK_THRESHOLDS = [
    # (max_f, label, color)
    # Audit #17 fix: added "comfortable" tier so 60-70F weather isn't labelled as heat risk.
    (70.0, "comfortable", "#3b82f6"),
    (80.0, "moderate", "#4caf50"),
    (90.0, "high", "#ff9800"),
    (100.0, "very_high", "#f44336"),
    (120.0, "extreme", "#b71c1c"),
]  


def risk_for(temp_f: float) -> tuple[str, str]:
    """Return (label, color) for a Fahrenheit temperature."""
    for max_f, label, color in RISK_THRESHOLDS:
        if temp_f <= max_f:
            return label, color
    return "extreme", "#b71c1c"


def _lat_lng_seed(lat: float, lng: float) -> float:
    """Deterministic pseudo-random value in [0,1) from coordinates (mock realism)."""
    x = math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453
    return x - math.floor(x)


class HeatReading:
    __slots__ = ("lat", "lng", "temp_f", "temp_c", "risk", "color", "source", "measured_at")

    def __init__(self, lat, lng, temp_f, source):
        self.lat = lat
        self.lng = lng
        self.temp_f = round(temp_f, 1)
        self.temp_c = round((temp_f - 32) * 5 / 9, 1)
        self.risk, self.color = risk_for(self.temp_f)
        self.source = source
        self.measured_at = "now"

    def to_dict(self) -> dict:
        return {
            "lat": self.lat,
            "lng": self.lng,
            "temp_f": self.temp_f,
            "temp_c": self.temp_c,
            "risk": self.risk,
            "color": self.color,
            "source": self.source,
            "measured_at": self.measured_at,
        }


class MockHeatProvider:
    """Deterministic sample temperatures — no API key needed (dev/demo).

    The field is a *spatially coherent* pseudo-climate: two smooth wave
    scales (district ≈ 1.1 km, street ≈ 0.27 km) plus fine jitter, so hot
    zones form contiguous regions the way real UHI does — instead of the
    old per-coordinate hash, which produced a checkerboard where every cell
    was unrelated to its neighbours (and made auto-placement look random).
    Still a pure function of (lat, lng): deterministic, $0, no key.
    """

    def __init__(self, source: str = "mock"):
        self.source = source

    def get_temperature(self, lat: float, lng: float) -> HeatReading:
        seed = _lat_lng_seed(lat, lng)
        base = 95.0  # hot summer baseline for a US city
        district = 6.0 * math.sin(580.0 * lat + 1.7) * math.cos(640.0 * lng + 0.6)
        street = 4.0 * math.sin(2300.0 * lat + 4.1) * math.sin(2100.0 * lng + 2.3)
        jitter = (seed - 0.5) * 4.0  # +/- 2 F fine grain
        temp_f = base + district + street + jitter
        return HeatReading(lat, lng, temp_f, source=self.source)


class HeatProvider(Protocol):
    source: str

    def get_temperature(self, lat: float, lng: float) -> HeatReading:
        ...


def build_provider(use_mock: bool) -> HeatProvider:
    if use_mock:
        return MockHeatProvider(source="mock")
    # FortyGuard temperature API is an async, area-based API (/api/heat/area).
    # Point-based sampling uses simulated readings mapped to the FortyGuard provider label.
    return MockHeatProvider(source="fortyguard_mock")
