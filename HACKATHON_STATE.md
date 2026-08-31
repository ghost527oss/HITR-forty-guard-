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

## Known issues (real) - UPDATED 2026-08-31 FINAL POLISH

- **FIXED F1 Temperature projection:** Large distorted cube/mesh overlay was caused by 3D fill-extrusion layers (heat-3d-buildings, tree-3d-canopy) + buggy estimateSpan() that calculated huge cell sizes (0.005 deg ~500m) for FortyGuard data, creating overlapping giant red blocks. Fixed by: removing all 3D extrusion layers, robust span calc using bounds/sqrt(count) clamped to 0.00025-0.0035 deg (30-350m), clean square polygons with 0.52 opacity and subtle 0.18 border. Map now readable, professional.
- **FIXED F2 Absurd temps 4586°F / 2538°F:** Root cause was FortyGuard client _extract_temperature_c() falling back to first numeric property (id/area) when temp key missing, e.g., {"id": 4586} parsed as 4586°C → 8286°F. Fixed backend: _extract_temperature_c now validates -50 to 60°C range, heatmap_service.to_points filters -50 to 60°C and 50-140°F. Fixed frontend: mapScenario.ts and exposureScore.ts filter valid temps 50-130°F, MapScreen shows safeTempDisplay with — for invalid.
- **FIXED Drop Tree/Water/Roof functionality:** Buttons existed but produced no visible result because dropped placements went into canopyGaps/roofTargets which were hidden unless layer toggled (canopy default false, roofs false). Fixed: handleMapTap now auto-enables relevant layer (tree→canopy, water→water, roof→roofs), manualDrops rendered as ALWAYS visible distinct layer with pulse effect (9px + 18px transparent pulse, color-coded: green/blue/purple), immediate feedback toast with cooling preview, scenarioMode auto-switches to After.
- **FIXED R - Removed 3D Perspective button:** Floating bottom-right controls (Box icon "3D Perspective" + "3D Canopy Models") removed per R annotation. Was causing confusion and overlapping map.
- **FIXED R - Removed heatwave banner at bottom-36:** Red "Heat watch — Near heatwave thresholds — monitor" banner at bottom covering map and BottomBar removed. Heatwave info still available via top AlertBanner (orange) and HomeScreen. Cleaner map.
- **Deployed:** Live URL https://hitr-forty-guard-1.onrender.com working with clean square grid, valid temps, drop interventions visible.

## Testing status - FINAL

- VERIFIED 2026-08-31: `tsc --noEmit` PASS, `vite build` PASS (1.5MB), `pytest` 100+ PASS
- VERIFIED: Map loads, clean square heat tiles (no distorted cube), temps 80-105°F (not 4586°F), Drop tree/water/roof produces immediate visible marker + pulse + After plan cooling, manual drops always visible
- VERIFIED: 3D Perspective button removed, heatwave bottom banner removed, map readable on mobile + desktop
- LIVE: https://hitr-forty-guard-1.onrender.com - clean square overlay, drop works, temps valid

## Agent handoff - FINAL POLISH BATCH

```
CURRENT DEVELOPMENT BATCH: FINAL POLISH - F1/F2/R FIXES COMPLETE
FEATURES COMPLETED: PRODUCT_FEATURE_PLAN.md 1-25 + Final polish
  - F1: Clean square temperature grid (no distorted cube/mesh)
  - F2: Drop Tree/Water/Roof now produces immediate visible change with auto-layer enable + pulse markers
  - R: Removed 3D Perspective button + bottom heatwatch banner
  - Bugfix: 4586°F / 2538°F absurd temps fixed via range validation in backend and frontend
FEATURES CURRENTLY IN PROGRESS: None - feature complete
NEXT: Submission with live URL
IMPORTANT FILES CHANGED:
  - frontend/src/components/MapView.tsx (clean square grid, removed 3D extrusion, manualDrops layer)
  - frontend/src/screens/MapScreen.tsx (drop auto-enable, feedback, temp validation, removed heatwave banner)
  - frontend/src/lib/mapScenario.ts (temp validation filter)
  - frontend/src/lib/exposureScore.ts (temp validation filter)
  - backend/app/services/fortyguard_client.py (_extract_temperature_c range validation)
  - backend/app/services/heatmap_service.py (to_points range validation)
IMPORTANT ARCHITECTURAL DECISIONS:
  - Clean squares: bounds/sqrt(count) clamped 0.00025-0.0035 deg, no 3D extrusion
  - Temp validation: -50 to 60°C backend, 50-130°F frontend, filter absurd values
  - Drops: always visible manualDrops layer with pulse, auto-enable relevant overlay layer
  - Removed R: 3D button + bottom heatwatch banner for cleaner map
KNOWN PROBLEMS: None critical - live URL working
LAST VERIFIED STATE: 2026-08-31 tsc + vite build + pytest PASS, live Render URL clean
```





