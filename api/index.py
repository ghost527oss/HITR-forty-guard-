"""Vercel serverless entrypoint — serves the HITR FastAPI backend.

One Vercel project hosts BOTH the frontend (static build of frontend/) and
this Python function. vercel.json rewrites every /api/* request here:

    https://your-app.vercel.app/api/heat/point?...  ->  this function
                                                        -> FastAPI app

The modern @vercel/python runtime speaks ASGI natively and picks up the
exported `app` object, with the ORIGINAL request path preserved (so FastAPI's
own /api/... routes match). `handler` is a Mangum fallback for older runtimes.

Secrets (FORTYGUARD_API_KEY, …) come from Vercel Environment Variables —
see docs/secrets.md. Local dev is unaffected: `npm run dev` still proxies /api
to a local uvicorn process.
"""
import os
import sys

_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from app.main import app  # noqa: E402  (ASGI export — primary path on Vercel)

try:  # pragma: no cover — fallback adapter for non-ASGI runtimes
    from mangum import Mangum

    handler = Mangum(app)
except Exception:  # mangum not installed / not needed
    handler = None
