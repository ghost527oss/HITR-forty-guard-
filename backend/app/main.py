"""HITR backend — FastAPI application entrypoint."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import ai, analysis, cities, heat, planner

app = FastAPI(title=settings.app_name, version="0.2.0")

# Allow the frontend dev server (Vite) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # relax for dev; tighten before deployment
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(heat.router)
app.include_router(analysis.router)
app.include_router(planner.router)
app.include_router(ai.router)
app.include_router(cities.router)


@app.get("/")
def root():
    return {"app": settings.app_name, "version": "0.2.0", "env": settings.app_env}


@app.get("/api/health")
def health():
    return {"status": "ok", "heat_provider": "real" if not settings.use_mock_heat else "mock"}
