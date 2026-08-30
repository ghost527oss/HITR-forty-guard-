# HACKATHON_STATE — living handoff

Use this file to continue without the previous chat. Do not paste secrets here.

## Project overview

HITR (Heat Intelligence & Territorial Resilience) is a mobile-first web app: tap a US city block, see heat, understand why it is hot, and propose cooling interventions. FortyGuard supplies real area heat when `FORTYGUARD_API_KEY` is set on the **server**. Map tiles are MapLibre + OSM (no map key).

## Current architecture

- **Frontend:** React 18 + Vite + Tailwind + MapLibre (`frontend/`).
- **Backend:** FastAPI (`backend/`), served on Vercel via `api/index.py` + `vercel.json` rewrites `/api/*`.
- **Heat:** mock grid `/api/heat/grid` and real async `/api/heat/area` + `/api/heat/job/{id}`.
- **Analysis:** `/api/analysis/spot`, `/pattern`, `/surface`, `/simulation_3d`.
- **Planner:** `/api/planner/plan`. Design Studio uses client `uhiFactors.ts`.
- **Assistant:** grounded FastAPI + Patch offline engine on `CentralAssistantScreen`.
- **Theme:** `frontend/src/lib/theme.ts` + CSS variables in `index.css`.

## Current features (working)

Home, map heat overlay, tap-to-spot, planner levels 0–4, Design Studio, Knowledge Set (100 designs), central assistant, emergency, heat surface, city simulation, settings (theme, palettes, mock toggle, units), mock fallback.

**Batch 1 (this session):** Now/After scenario overlay, spot diagnosis card, priority list.

## Feature roadmap (from PRODUCT_FEATURE_PLAN.md)

| ID | Feature | Status |
|----|---------|--------|
| 2 | Scenario overlay Now/After | COMPLETED |
| 3 | Spot diagnosis | COMPLETED |
| 1 | Priority index MVP | COMPLETED |
| 6 | Time scrubber | NOT STARTED |
| 7 | PMV walk comfort | NOT STARTED |
| 8 | Heatwave mode | NOT STARTED |
| 12 | Walk-to-cool | NOT STARTED |
| 23 | Fix this hotspot CTA | NOT STARTED |
| others | see PRODUCT_FEATURE_PLAN.md | NOT STARTED |

## Completed work — Batch 1

### Scenario overlay
- Files: `frontend/src/lib/mapScenario.ts`, `MapScreen.tsx`
- Details: `buildMapScenario` → trees + water suggestions, `simulateDesign`. UI toggle Now | After. Does not mutate fetch state.
- Caps: `MIN_SUGGEST_TEMP_F` 95, `TOTAL_DROP_CAP_C` 3.5.

### Spot diagnosis
- Files: `App.tsx`, `BottomBar.tsx`
- Details: `Promise.all` spot + pattern; pattern failure does not fail the tap.

### Priority index
- Files: `mapScenario.ts` `rankPriorityCells`, `MapScreen.tsx`
- Details: top 3 hottest cells; click → existing `onPick`.

## API configuration (no secrets)

| API | Provides | Config | Fallback |
|-----|----------|--------|----------|
| FortyGuard | Area heatmap | `FORTYGUARD_API_KEY` env (Vercel / backend `.env`) | Mock grid if Settings mock ON; overlay message if OFF |
| Open-Meteo | Weather | none | unused on map Batch 1 |
| OSM / Overpass | Land | none | Heuristic; skipped on Vercel for `/spot` |
| Nominatim | Geocode | none | error banner |

Never put keys in `frontend/` or `VITE_*`.

## Data / state

- Heat grid in `App.heatData`. Scenario derived in MapScreen only.
- Settings: `hitr.allow-mock-heat` default ON, `hitr.theme`, `hitr.palette`.
- Spot: `picked`, `reading`, `land`, `pattern`.

## Known issues (real)

- FortyGuard live job not verifiable in this sandbox (no production key here).
- Pattern endpoint may still be slow locally (OSM); Vercel `/spot` skips OSM.
- After overlay is a **simulated** light pack, not the full Design Studio draft.

## Testing status — Batch 1

- VERIFIED: `frontend` `tsc --noEmit`; vitest `mapScenario.test.ts` 3/3.
- NOT VERIFIABLE HERE: live FortyGuard, Vercel deploy, OSM Overpass.

## Agent handoff

```
CURRENT DEVELOPMENT BATCH: 1 COMPLETE
FEATURES COMPLETED: Scenario overlay, Spot diagnosis, Priority index
FEATURES CURRENTLY IN PROGRESS: none
NEXT 3 FEATURES: Time scrubber (6), PMV walk comfort (7), Heatwave mode (8)
  — or 7+12 walk-to-cool if visual wow is preferred
IMPORTANT FILES: frontend/src/lib/mapScenario.ts, MapScreen.tsx, BottomBar.tsx, App.tsx,
  planner/uhiFactors.ts, PRODUCT_FEATURE_PLAN.md, HACKATHON_STATE.md
IMPORTANT ARCHITECTURAL DECISIONS:
  - Scenario is client-side on already-loaded heat cells (no extra FortyGuard calls).
  - Pattern fetch is best-effort so spot 500s are not reintroduced.
  - Mock/real heat loading in App.tsx was not rewritten.
KNOWN PROBLEMS: live FortyGuard unverified in sandbox
LAST VERIFIED STATE: tsc clean, mapScenario tests pass (2026-08-30)
```
