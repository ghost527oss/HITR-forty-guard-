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
**Batch 3:** Walk-to-cool path, Fix this hotspot CTA, water-refuge pins.  
**Batch 4:** Peak vs now, seasonal surface chips, Rebuild honesty banner.  
**Batch 5:** Canopy gaps, cool-roof targets, analysis layer toggles.  
**Batch 6:** FortyGuard job chip, block brief export, heat-adjusted hydration.  
**Batch 7:** Budget pack, cited why, Plan A vs B.  
**Batch 8:** Designs for this spot, equity lens, breeze assist.  
**Batch 9:** Drop intervention on the map.

## Feature roadmap (from PRODUCT_FEATURE_PLAN.md)

| ID | Feature | Status |
|----|---------|--------|
| 2 | Scenario overlay Now/After | COMPLETED |
| 3 | Spot diagnosis | COMPLETED |
| 1 | Priority index MVP | COMPLETED |
| 6 | Time scrubber | COMPLETED |
| 7 | PMV walk comfort | COMPLETED |
| 8 | Heatwave mode | COMPLETED |
| 12 | Walk-to-cool | COMPLETED |
| 23 | Fix this hotspot CTA | COMPLETED |
| 11 | Water-refuge pins | COMPLETED |
| 16 | Peak vs now | COMPLETED |
| 21 | Seasonal surface | COMPLETED |
| 25 | Rebuild honesty | COMPLETED |
| 9 | Canopy gap layer | COMPLETED |
| 10 | Cool-roof targets | COMPLETED |
| 15 | Analysis layer toggles | COMPLETED |
| 17 | FortyGuard job chip | COMPLETED |
| 18 | Block brief export | COMPLETED |
| 24 | Heat-adjusted hydration | COMPLETED |
| 4 | Budget pack | COMPLETED |
| 13 | Cited why | COMPLETED |
| 5 | Plan A vs B | COMPLETED |
| 14 | Design for this spot | COMPLETED |
| 19 | Equity lens | COMPLETED |
| 20 | Breeze assist | COMPLETED |
| 22 | Drop intervention | COMPLETED |
| others | PRODUCT_FEATURE_PLAN.md 1–25 | COMPLETED |

## Completed work — Batch 5

### Canopy gap
- Tree-cluster suggestions as green dots; Plant → After overlay.

### Cool roofs
- `cool_roof` only with simulation buildings; empty copy if twin missing.

### Layers
- Heat, Water, Path, Gaps, Roofs visibility on MapView.

## Completed work — Batch 4

### Peak vs now
- Files: `BottomBar.tsx` + existing `weather.days[0].t_max_c`

### Seasonal surface
- Files: `HeatSurfaceScreen.tsx` `seasonal_sampling` (no extra fetch)

### Rebuild honesty
- Files: `App.tsx` parallel Light plan on level 4, `PlannerScreen.tsx` banner

## Completed work — Batch 3

### Walk-to-cool
- Files: `mapScenario.ts` `nearestCoolerTile`, `MapView.tsx` `cool-path`, `MapScreen.tsx`, `BottomBar.tsx`
- Uses current overlay grid only; no extra surface fetch.

### Fix this hotspot
- Files: `HeatSurfaceScreen.tsx`, `App.tsx` `handleFixHotspot`
- Light plan at hotspot coords via `getPlan(lat, lng, 1)` then Planner view.

### Water-refuge
- Files: `MapView.tsx` `water-refuges`, `MapScreen.tsx` from scenario `water_station` placements.

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
- **“No index.html — will run on site root”:** Python `api/` made Vercel miss `frontend/dist`. Vite now builds to repo-root `public/`; `vercel.json` `outputDirectory` is `public`. Dashboard **Root Directory must be empty** (not `frontend`). Redeploy. Live URL still **NOT VERIFIED**.

## Testing status

- VERIFIED Batch 2: `tsc --noEmit`.
- NOT VERIFIABLE HERE: Open-Meteo live, FortyGuard, Vercel.

## Agent handoff

```
<<<<<<< HEAD
CURRENT DEVELOPMENT BATCH: 9 COMPLETE
FEATURES COMPLETED: PRODUCT_FEATURE_PLAN.md items 1–25
FEATURES CURRENTLY IN PROGRESS: none
NEXT 3 FEATURES: none numbered remaining — polish only if asked
IMPORTANT FILES: MapScreen.tsx, mapScenario.ts
IMPORTANT ARCHITECTURAL DECISIONS:
  - Drops reuse simulateDesign/cellDropC; no second Studio.
  - Tool mode intercepts tap so spot analysis is not required to place.
KNOWN PROBLEMS: live FortyGuard unverified; Open-Meteo needs network
LAST VERIFIED STATE: tsc + mapScenario vitest including mergeManualDrops (2026-08-30)
=======
CURRENT DEVELOPMENT BATCH: 9 COMPLETE + P0 white-screen audit (partial)
FEATURES COMPLETED: PRODUCT_FEATURE_PLAN.md items 1–25
FEATURES CURRENTLY IN PROGRESS: production boot (Vercel not verified)
NEXT 3 FEATURES: none numbered remaining — polish only if asked
IMPORTANT FILES: vercel.json, App.tsx, lib/heatGrid.ts, main.tsx, lib/theme.ts
IMPORTANT ARCHITECTURAL DECISIONS:
  - Drops reuse simulateDesign/cellDropC; no second Studio.
  - Tool mode intercepts tap so spot analysis is not required to place.
  - Do not import MapView from App; lazy screens after StartScreen.
KNOWN PROBLEMS: live FortyGuard unverified; Open-Meteo needs network; Vercel white screen unverified
LAST VERIFIED STATE: tsc after heatGrid extract + lazy screens (2026-08-30)
>>>>>>> 9109001 (Fix Vercel blank deploy: build SPA into public/)
```





