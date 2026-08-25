# Architecture (planned)

> Status: planning. Confirmed direction; details will be finalized during build.

## Stack
| Layer        | Choice                                      | Why                                                                 |
|--------------|---------------------------------------------|---------------------------------------------------------------------|
| Frontend     | React + TypeScript + Vite + Tailwind + Framer Motion + MapLibre GL | Premium look/feel, smooth 60fps animations, free modern map, no map key |
| Backend      | Python + FastAPI                            | Real algorithm work, geospatial + ML tooling, same language as serious data apps |
| Database     | Supabase (PostgreSQL + PostGIS) free tier   | Geospatial queries, auth, realtime, hosted for free                  |
| City data    | OpenStreetMap / Overpass API                | Free, no key, real building/road/land data                           |
| AI assistant | Gemini Flash (Google AI Studio free tier)   | Free, reliable, function-calling for tools                           |
| Deploy       | Vercel (frontend) + Vercel (FastAPI serverless) or Railway free tier | Free hosting, easy demo                                             |

## High-level flow
1. User opens map → frontend renders city (MapLibre).
2. Frontend asks backend for temperature overlay → backend calls **FortyGuard API**, caches in DB.
3. User selects district/plot → backend runs **intervention algorithm** (multi-criteria scoring over
   OSM parcels + temperature + accessibility) → writes ranked plan to DB.
4. Frontend shows ranked interventions on the map; each highlights what/where/why/impact/cost.
5. AI assistant (function-calling) answers bounded questions grounded in our DB.

## Repo layout (proposed)
```
frontend/   # React + TypeScript app
backend/    # FastAPI + algorithm + API client
db/         # schema/migrations (SQL)
docs/       # planning & decision docs
README.md
CHANGELOG.md
PLAN.md
```

## Database feature hub (unreleased)

`App.tsx` owns location, selected map point, heat, land-use and plan state. The Database screen is a frontend navigation hub only: it routes City Planner to the existing `PlannerScreen`, so no planner/map state is duplicated or moved. The future Architectural Designs library must be added as an isolated frontend feature and must not replace the FastAPI backend, MapLibre map, Supabase schema, or existing assistant.

## Architectural Designs feature (unreleased)

The complete Patch1.0v source is isolated at `frontend/src/features/architectural-designs/`, preserving its original feature-level layout (`data/`, `components/`, `utils/`). `ArchitecturalDesignsScreen` hosts it under Database; it does not replace the React app root, FastAPI backend, MapLibre map, or HITR planner. The source is client-side only and uses `lucide-react` for its imported icon components. Its local advisor reads bundled design and medical records through `utils/offlineAiEngine.ts`; it has no remote dependency.
