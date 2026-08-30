"""HITR backend — FastAPI application entrypoint.

Single-URL deployment ready (Render / Railway / Fly):
- /api/* routes = backend API
- /assets/* + /index.html = frontend static (if public/ exists)
- / = API info when no frontend built, else serves frontend
This lets ONE service host both frontend + backend on one URL (judges love single URL).
"""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import ai, analysis, cities, fortyguard, heat, planner

app = FastAPI(title=settings.app_name, version="0.8.0")

# Allow the frontend dev server (Vite) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(heat.router)
app.include_router(fortyguard.heat_router)
app.include_router(fortyguard.meta_router)
app.include_router(analysis.router)
app.include_router(planner.router)
app.include_router(ai.router)
app.include_router(cities.router)

# --- API health (always works) ---
@app.get("/api/health")
def health():
    return {"status": "ok", "heat_provider": "real" if not settings.use_mock_heat else "mock"}


@app.get("/api")
def api_root():
    return {"app": settings.app_name, "version": "0.8.0", "env": settings.app_env, "docs": "/docs"}


# --- SINGLE-URL DEPLOY: Serve frontend from public/ if it exists ---
# public/ is at repo root: backend/app/main.py -> ../../public
PUBLIC_DIR = Path(__file__).resolve().parents[2] / "public"
PUBLIC_DIR.mkdir(exist_ok=True)

if PUBLIC_DIR.exists():
    assets_dir = PUBLIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Serve index.html for SPA routes (everything not /api/* and not /assets/* and not /docs)
    @app.get("/")
    def serve_root():
        index = PUBLIC_DIR / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return {"app": settings.app_name, "version": "0.8.0", "env": settings.app_env, "note": "frontend not built yet - run: cd frontend && npm install && npm run build"}

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Don't intercept API or docs
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json") or full_path.startswith("redoc"):
            # Let FastAPI return 404 for unknown API routes
            return {"error": "API route not found", "path": full_path}
        # Try to serve exact file if exists (e.g. vite.svg, etc)
        file_path = PUBLIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        # Fallback to index.html for SPA client routing
        index = PUBLIC_DIR / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return {"app": settings.app_name, "error": "frontend not built"}
else:
    @app.get("/")
    def root_fallback():
        return {"app": settings.app_name, "version": "0.8.0", "env": settings.app_env, "frontend": "not built - public/ missing"}
