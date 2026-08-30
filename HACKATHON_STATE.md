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

**Batch 1:** Now/After scenario overlay, spot diagnosis card, priority list.  
**Batch 2:** Heat-surface time chips, PMV walk comfort, heatwave mode (Open-Meteo + P2 rules).

## Feature roadmap (from PRODUCT_FEATURE_PLAN.md)

| ID | Feature | Status |
|----|---------|--------|
| 2 | Scenario overlay Now/After | COMPLETED |
| 3 | Spot diagnosis | COMPLETED |
| 1 | Priority index MVP | COMPLETED |
| 6 | Time scrubber | COMPLETED |
| 7 | PMV walk comfort | COMPLETED |
| 8 | Heatwave mode | COMPLETED |
| 12 | Walk-to-cool | NOT STARTED |
| 23 | Fix this hotspot CTA | NOT STARTED |
| others | see PRODUCT_FEATURE_PLAN.md | NOT STARTED |

## Completed work — Batch 2

### Time scrubber
- Files: `HeatSurfaceScreen.tsx`, `analysis.py` (`hour` query, optional), `api.ts`
- Uses `temporal.diurnal_sampling` from the default surface fetch.

### Walk comfort
- Files: `BottomBar.tsx`, `App.tsx` (`getWeatherNow` once per city)
- PMV from `uhiFactors`; no weather → no comfort line.

### Heatwave mode
- Files: `App.tsx`, `HomeScreen.tsx`, `MapScreen.tsx`, `PlanSheet.tsx`
- `heatwaveStatus` on 3-day Open-Meteo; Light recommended, not auto-applied.

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
| Open-Meteo | Weather / heatwave / PMV | none | hide PMV + heatwave UI |
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

## Testing status

- VERIFIED Batch 2: `tsc --noEmit`.
- NOT VERIFIABLE HERE: Open-Meteo live, FortyGuard, Vercel.

## Agent handoff

```
CURRENT DEVELOPMENT BATCH: 2 COMPLETE
FEATURES COMPLETED: overlay/diagnosis/priority; time scrubber; PMV; heatwave
FEATURES CURRENTLY IN PROGRESS: none
NEXT 3 FEATURES: Walk-to-cool (12), Fix this hotspot CTA (23), Water-refuge (11)
IMPORTANT FILES: HeatSurfaceScreen.tsx, BottomBar.tsx, PlanSheet.tsx, App.tsx, analysis.py
IMPORTANT ARCHITECTURAL DECISIONS:
  - Diurnal UI uses existing temporal samples (one surface fetch).
  - PMV omitted if Open-Meteo fails.
  - Heatwave recommends Light; does not auto-generate a plan.
KNOWN PROBLEMS: live FortyGuard unverified; Open-Meteo needs network
LAST VERIFIED STATE: tsc clean (2026-08-30)
```
