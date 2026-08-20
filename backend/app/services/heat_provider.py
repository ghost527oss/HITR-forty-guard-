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
    """Deterministic sample temperatures — no API key needed (dev/demo)."""

    source = "mock"

    def get_temperature(self, lat: float, lng: float) -> HeatReading:
        seed = _lat_lng_seed(lat, lng)
        base = 95.0  # hot summer baseline for a US city
        variation = (seed - 0.5) * 20.0  # +/- 10 F
        temp_f = base + variation
        return HeatReading(lat, lng, temp_f, source=self.source)


class HeatProvider(Protocol):
    source: str

    def get_temperature(self, lat: float, lng: float) -> HeatReading:
        ...


def build_provider(use_mock: bool) -> HeatProvider:
    if use_mock:
        return MockHeatProvider()
    # Real client lives in fortyguard_client.py
    from .fortyguard_client import FortyGuardClient

    return FortyGuardClient()
