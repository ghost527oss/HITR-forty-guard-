"""
FortyGuard-backed heat endpoints — the async half of the heat pipeline.

    GET /api/heat/area            submit a heatmap task for a bounding box
    GET /api/heat/job/{id}        poll one task (stateless — see below)
    GET /api/fortyguard/selfcheck is the key configured, and does it work?

Why these are separate from /api/heat/grid: that endpoint is synchronous and
per-cell, which cannot be served by an async, area-based API. These endpoints
keep the old one working so the mock path is untouched.

/job/{id} is STATELESS on purpose. It needs nothing but the activity_id, so it
works when the submit and the polls land on different serverless instances —
which is exactly what happens on Vercel.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from ..services.fortyguard_client import (
    FortyGuardAreaError,
    FortyGuardAuthError,
    FortyGuardConfigError,
    FortyGuardError,
    FortyGuardPlanError,
    FortyGuardRateLimitError,
    FortyGuardRequestError,
    FortyGuardTimeoutError,
)
from ..services.heatmap_service import READY, HeatmapService

heat_router = APIRouter(prefix="/api/heat", tags=["heat"])
meta_router = APIRouter(prefix="/api/fortyguard", tags=["fortyguard"])

_service: HeatmapService | None = None


def get_service() -> HeatmapService:
    global _service
    if _service is None:
        _service = HeatmapService()
    return _service


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _translate(exc: Exception) -> HTTPException:
    """Map client exceptions onto status codes that mean something to a caller.

    Validation errors (400) are never billed by the vendor, so they are worth
    distinguishing from everything else.
    """
    if isinstance(exc, FortyGuardConfigError):
        return HTTPException(status_code=503, detail=str(exc))
    if isinstance(exc, (FortyGuardRequestError, FortyGuardAreaError)):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, FortyGuardAuthError):
        return HTTPException(status_code=401, detail=str(exc))
    if isinstance(exc, FortyGuardPlanError):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, FortyGuardRateLimitError):
        return HTTPException(status_code=429, detail=str(exc))
    if isinstance(exc, FortyGuardTimeoutError):
        return HTTPException(status_code=504, detail=str(exc))
    if isinstance(exc, FortyGuardError):
        return HTTPException(status_code=502, detail=str(exc))
    return HTTPException(status_code=502, detail=f"FortyGuard API Error: {str(exc)}")


@heat_router.get("/area")
def heat_area(
    west: float = Query(..., ge=-180, le=180),
    south: float = Query(..., ge=-90, le=90),
    east: float = Query(..., ge=-180, le=180),
    north: float = Query(..., ge=-90, le=90),
    granularity: int = Query(80),
    date: str | None = Query(None, description="YYYY-MM-DD, defaults to today UTC"),
    wait_s: float = Query(0, ge=0, le=25,
                          description="Poll inline for up to this long. 0 returns immediately."),
):
    """Start (or reuse) a heatmap task for a bounding box.

    Answers 202 with an activity_id. Poll /api/heat/job/{activity_id} until
    status is "ready". One task serves the whole area — never one per cell.
    """
    service = get_service()
    if not service.available:
        raise HTTPException(
            status_code=503,
            detail=("FORTYGUARD_API_KEY is not set, so no real heatmap is available. "
                    "Use /api/heat/grid, which serves the mock provider."),
        )

    try:
        activity_id = service.submit(west, south, east, north,
                                     date or _today(), granularity=granularity)
    except Exception as exc:
        raise _translate(exc) from exc

    if wait_s > 0:
        deadline = time.monotonic() + wait_s
        while time.monotonic() < deadline:
            try:
                result = service.poll(activity_id)
            except Exception as exc:
                raise _translate(exc) from exc
            if result["status"] == READY:
                return result
            if result["status"] == "failed":
                return JSONResponse(status_code=502, content=result)
            time.sleep(2)
        return JSONResponse(status_code=202, content={
            "status": "processing",
            "activity_id": activity_id,
            "poll_url": f"/api/heat/job/{activity_id}",
            "note": "Inline wait expired — keep polling.",
        })

    return JSONResponse(status_code=202, content={
        "status": "processing",
        "activity_id": activity_id,
        "poll_url": f"/api/heat/job/{activity_id}",
    })


@heat_router.get("/job/{activity_id}")
def heat_job(activity_id: str):
    """Poll one heatmap task. Stateless — needs only the activity_id."""
    service = get_service()
    if not service.available:
        raise HTTPException(status_code=503, detail="FORTYGUARD_API_KEY is not set.")
    try:
        result = service.poll(activity_id)
    except Exception as exc:
        raise _translate(exc) from exc
    if result["status"] == "failed":
        return JSONResponse(status_code=502, content=result)
    return result


@meta_router.get("/selfcheck")
def fortyguard_selfcheck(
    live: bool = Query(False, description="Submit one real task to prove the key works. Costs one credit."),
):
    """Confirm the key is configured and, optionally, working.

    Never echoes the API key. Reports only whether it is set and how long it is,
    which is enough to tell a missing key from a wrong one.
    """
    return get_service().selfcheck(live=live)
