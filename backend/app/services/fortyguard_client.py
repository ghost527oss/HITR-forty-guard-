"""
FortyGuard Temperature API client (real HTTP path).

Endpoint shape will be finalized from the official docs/quickstart (the hackathon talk references six
endpoints and snapshot / exceedance / persistence analysis layers). For now this is a documented stub:
it raises a clear error if called without a key so the app cleanly falls back to the mock provider.

Expected real usage (to be completed once endpoint details are confirmed):
    POST /v1/heat-intelligence   ->  current hyperlocal temperature + risk for a location

Returns the same `HeatReading` shape as the mock so the rest of the app is provider-agnostic.
"""
from __future__ import annotations

import os

import httpx

from .heat_provider import HeatReading


class FortyGuardClient:
    source = "fortyguard"

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or os.getenv("FORTYGUARD_API_KEY", "")
        self.base_url = base_url or os.getenv(
            "FORTYGUARD_BASE_URL", "https://api.fortyguard.com"
        )

    def get_temperature(self, lat: float, lng: float) -> HeatReading:
        if not self.api_key:
            raise RuntimeError(
                "FORTYGUARD_API_KEY is not set. Configure it in backend/.env or use the mock provider."
            )
        # TODO(fortyguard): finalize endpoint contract from official docs.
        # url = f"{self.base_url}/v1/heat-intelligence"
        # resp = httpx.post(url, json={"lat": lat, "lng": lng},
        #                   headers={"Authorization": f"Bearer {self.api_key}"})
        # resp.raise_for_status()
        # data = resp.json()
        # temp_f = data["temperature_f"]
        # return HeatReading(lat, lng, temp_f, source=self.source)
        raise NotImplementedError(
            "Real FortyGuard integration pending endpoint confirmation. Use mock provider for now."
        )
