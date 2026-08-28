"""Shared pytest fixtures for the HITR backend.

Puts `backend/` on sys.path so `app.*` imports resolve when pytest is run from
the repo root or from `backend/`.
"""

import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    """FastAPI test client. raise_server_exceptions=False so a 500 is asserted
    on as a status code instead of blowing up the test run."""
    return TestClient(app, raise_server_exceptions=False)


# A few real coordinates used across tests. Los Angeles is the app default.
LA = (34.0522, -118.2437)
SF = (37.7749, -122.4194)
PALM_SPRINGS = (33.8303, -116.5453)


@pytest.fixture(params=[LA, SF, PALM_SPRINGS], ids=["LA", "SF", "PalmSprings"])
def coords(request):
    return request.param
