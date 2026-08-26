# Changelog

All notable changes to this project are documented here. Format inspired by
[Keep a Changelog](https://keepachangelog.com/). Versioning: `v0.x` for pre-release planning/build.

## [v0.7.0] — 2026-08-26
### Added — Planner launch popup + Design Studio (research-grounded)
- **`uhiFactors.ts` (new, `frontend/src/planner/`)** — peer-reviewed UHI factor engine from the
  3-paper research base (`docs/research/`): Oke canyon law `Δt=7.45+3.97·ln(H/w)`, SVF proxy,
  full **Fanger PMV / PPD (ISO 7730)** with damped iteration (raw fixed-point diverges for
  summer clo), official **heatwave definitions** (35 °C × 3 days, or 3-day mean ≥ 28 °C with
  nights ≥ 21 °C — Lee & Kim 2022), wind helpers, and a **design simulator**: placements
  (tree cluster / water station / cool roofs / garden) with literature-calibrated °C effects,
  linear distance decay, per-kind stacking caps and a −3.5 °C total cap; premium temp colour
  ramp; greedy **water-station auto-placement** (hottest-first, ≥ 120 m spacing, refuge rule).
- **`PlannerStartModal.tsx` (new)** — premium glass popup when tapping *City Planner*
  (Database hub or Assistant): step 1 pick place (with "Select on map" → map-view pill flow
  that returns to the popup), step 2 level of change — 5 scopes: Spot retouch (L1), Block
  retrofit (L2), District re-plan (L3), Whole city (L4), **Farm & garden** build. Launches
  the Design Studio; "classic ranked-list planner" link kept.
- **`DesignStudioScreen.tsx` (new)** — premium dark 2D map studio (CARTO dark basemap,
  MapLibre): live heat-grid overlay (400 cells, honest "mock model (FortyGuard slot)" badge
  until real API), factor layers — **Wind** (animated streaks from live Open-Meteo vector,
  free/no key, graceful synthetic fallback), Structures (height-sized buildings from
  `/api/analysis/simulation_3d`), Green, backend tree/water suggestions with reasons, and
  auto-placed water stations (tap = why-here popup). **Design mode**: tap-to-place
  interventions with teal halos; "After design" layer shows simulated cooler map; impact
  card = avg/peak before→after °F, avg °C drop, PMV/PPD "feels" chip, undo/clear. Heatwave
  banner fires on the official definitions + 33 °C design-failure rule (Ancona 2016).
- **App wiring** — new `design_studio` view; planner buttons now open the popup; floating
  pill on Map view during location pick.
- **API** — `getWeatherNow()` (Open-Meteo current + 3-day min/max, free, no key);
  `HeatGridResponse.points` tolerated.
### Fixed
- **Heat overlay never rendered** — `/api/heat/grid` returns `points` but the client read
  `cells` (known mismatch): `loadHeatGrid()` now accepts either shape; main heat map works.

## [v0.6.2] — 2026-08-23
### Fixed — Backend correctness (audit triplet: #9 + #11 + #21)
- **#9 `/api/ai/browse` ignored Supabase.** Hardcoded `knowledge.seed.ENCYCLOPOLOGY`; live DB was never
  read. Now uses `knowledge._rows("encyclopedia", seed.ENCYCLOPEDIA)` so live Supabase rows are respected
  (same pattern as the other knowledge endpoints). When `category` doesn't match, returns *all* live rows,
  not just seed ones.
- **#11 First-aid silently returned heat-stroke.** `get_health_condition(query)` fell back to
  `rows[:2]` on miss, so "broken toe" / "splinter" silently returned heat-stroke. Now returns `[]`
  on miss, and the assistant's `_reply_first_aid()` now produces an honest "I don't have first-aid
  guidance for that; for emergencies call 911" message instead of lying about symptoms.
- **#21 `/api/heat/grid` accepted any lat/lng.** Other endpoints had `ge=-90, le=90`; `/grid` had no bounds
  and could request invalid coords. Now mirrors the same `Query(..., ge=-90, le=90)` and
  `Query(..., ge=-180, le=180)` validation — invalid inputs return 422.

## [v0.6.1] — 2026-08-23
### Fixed — User-flow polish (audit triplet: #7 + #8 + #24)
- **#7 Silent async failures.** Added `try/catch` and a `status` banner to all three async handlers
  in `App.tsx`: `handleSearch`, `handlePick`, `handleGeneratePlan`, plus the heat-grid load.
  Network errors now show an amber banner with a dismiss button instead of crashing silently.
- **#8 Home screen temperature.** `App.tsx` now fetches the current city's temperature on mount and
  whenever the city changes (via search). Home screen displays the real temperature in the user's
  selected units (°F for imperial, °C for metric). Falls back to "—" if the backend is unreachable.
- **#24 Pin on picked map spot.** `MapView.tsx` now drops an orange marker (`#ea580c`) at the picked
  coordinates. The marker is removed when `picked` is null and re-created when the user picks a new
  spot. `MapScreen.tsx` passes the picked coordinates through.

## [v0.6.0] — 2026-08-23
### Fixed — P0 audit review (3-item triplet)
- **Knowledge-stats badge (`AssistantScreen.tsx`).** Was rendering `NaN topics` because the
  endpoint payload nests counts under `.knowledge` and the UI summed the top-level (undefined)
  fields. Now reads from `.knowledge.*` with fallback to flat fields; result is the actual integer
  topic count (e.g. "23 topics"). Mirrored same fix in dead `AiPanel.tsx` so the build stays clean.
- **Map re-centering on city search (`MapView.tsx`).** The flyTo effect was already in the working
  tree; this commit just preserves it so a future revert can't silently regress it.
- **Heat-overlay race on first load (`MapView.tsx`).** The `isStyleLoaded()` + `map.once("load")`
  guard is preserved into the commit; same reason.
- **Type for `KnowledgeStats`** (`api.ts`) updated to match real backend payload (`{ status, scope,
  provider, knowledge: { ... } }`). Flat fields kept optional for back-compat with dead `AiPanel.tsx`.
- **Documentation:** `AGENT_HANDOFF.md` updated with the audit's 30 findings + this triplet's fixes.
### Added
- **Missing imports in `App.tsx`** for the four untracked screens (`DatabaseScreen`, `HeatSurfaceScreen`,
  `CitySimulationScreen`, `TrainingScreen`) so the build compiles. Screens themselves were already
  on disk; no behavioural change.

## [v0.5.0] — 2026-08-20
### Added — App redesign: home screen + bottom navigation (display layer)
- **Navigation:** new `src/nav.ts` + `BottomNav` bottom toolbar (Home, Heat Map, Assistant, Planner,
  Tools, Settings). The app now opens on a **Home screen** first instead of the map.
- **Home screen:** `screens/HomeScreen.tsx` — hero, current location + temperature, and quick-action
  buttons into Heat Map / Assistant / Planner / Tools.
- **Heat Map screen:** `screens/MapScreen.tsx` — the live heat map + tap-to-analyze (existing MapView /
  TopBar / BottomBar).
- **Assistant screen:** `screens/AssistantScreen.tsx` — full-screen grounded chat (reuses the knowledge
  assistant API).
- **Planner screen:** `screens/PlannerScreen.tsx` — change-level control + ranked plan for the picked
  spot.
- **Tools screen:** `screens/ToolsScreen.tsx` — folder-style browser (Architecture, Farming, First Aid)
  with image + text cards; folders are ready, content/image slots added via code later.
- **Settings screen:** `screens/SettingsScreen.tsx` — choose location (sets whole app), temperature
  unit, theme (light/dark), notifications toggle, emergency contact.
- **Vercel:** added `vercel.json` (build + output + API rewrite) for deployment.
- **Verified:** frontend builds; full stack works via proxy (home → assistant answers, etc.).

## [v0.3.5] — 2026-08-19
### Added — Layer 4 (grounded AI assistant) + Supabase config
- **Supabase config:** `config.py` reads `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY`, and `KNOWLEDGE_PROVIDER` (`auto`/`supabase`/`seed`). `.env.example` documents
  them. The team's real keys live only in the local, git-ignored `backend/.env` — never in the repo.
  **Security note:** a Supabase key was shared in chat; it stays out of the repo, and if it was a secret
  key the user is advised to rotate it.
- **Knowledge seed data:** `app/data/seed.py` — the bundled knowledge as Python (mirrors `db/seed/*.sql`),
  so the repository works with zero external DB/network. Replaces/consolidates the earlier
  `app/services/seed_knowledge.py` (removed — it was an unreferenced duplicate).
- **Knowledge repository** (`app/services/knowledge.py`): lookup tools for health conditions, emergency
  contacts, encyclopedia search, and building designs, with token/stem-aware matching and relevance
  ranking. Backed by the bundled seed until Supabase is configured + reachable, then swaps automatically.
- **Assistant** (`app/services/assistant.py`): deterministic, grounded assistant — intent detection
  (emergency / first-aid / buildings / plan / encyclopedia) with definition-aware routing, and
  plain-language replies from the repository. No LLM key required. Verified 11 question cases resolve
  correctly (heat stroke, shelter-belt, hydration, urban heat island, green/cool roof, cross-ventilation,
  emergency, planning).
- **Endpoints:** `POST /api/ai/ask`, `GET /api/ai/status`, `GET /api/ai/knowledge`, `GET /api/ai/browse`.
- **Frontend:** new `AiPanel` chat (left side) with suggestions and grounded answers; `askAssistant()` +
  `getKnowledgeStats()` in `api.ts`; wired into `App.tsx`; default city changed to Los Angeles, CA
  (matches the FortyGuard demo heat map in California).
- **Verified:** assistant engine unit tests pass; AI endpoints work via backend + full-stack proxy;
  frontend builds.
- **Note:** the sandbox blocks outbound internet, so the live Supabase connection was not testable here;
  the repository serves the bundled seed until Supabase is reachable. To use Supabase, put
  `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` in `backend/.env`.

## [v0.3.4] — 2026-08-19
### Added — Layer 1 knowledge seed data (the actual "reach")
- `db/seed/01_cities_health.sql` — 5 US cities + 5 health conditions (heat stroke, heat exhaustion,
  heat cramps, dehydration, sunburn) with plain-language symptoms + first-aid steps + severity.
- `db/seed/02_emergency.sql` — real national contacts (911, 211); city-specific heat-hotlines left as
  VERIFY-LATER placeholders (never publish an unconfirmed emergency number).
- `db/seed/03_encyclopedia.sql` — 12 knowledge entries (heat wave, urban heat island, heat index,
  hydration, shelter-belt, crop-row orientation, green roof, cool roof, cross-ventilation, thermal mass,
  tree canopy, evaporative cooling).
- `db/seed/04_buildings.sql` — 6 plain-language architecture/build designs with cooling estimates
  (cool roof, veranda courtyard, cross-ventilated, thermal-mass earth, insulated attic, shaded-window).
- `db/README.md` — documents the seed files + how to apply them, and clarifies GitHub↔Supabase is not
  required (you only need the project URL + anon key).
- **Layer 1 "reach" now:** 5 cities · 5 health conditions · 2 emergency contacts · 12 encyclopedia ·
  6 buildings = 30 knowledge rows to ground the AI (Layer 4).

## [v0.3.3] — 2026-08-19
### Added — Layer 3 (intervention planner with change-level control)
- **Backend:** `app/services/planner.py` — the ranked intervention-planning algorithm:
  - Multi-criteria (heat severity + land use + change level), never heat alone.
  - **Change-level control (1=Light, 2=Medium, 3=Full re-plan)** reshapes the plan: Level 1 adds
    trees/shelter-belts/shade/water; Level 2 adds building retrofit + orientation; Level 3 adds full
    block re-plan. Farmland gets farm-specific interventions (shelter-belts, crop-row orientation).
  - Output is a ranked list (what/where/why/impact/cost).
- **Backend:** `app/routers/planner.py` — `GET /api/planner/plan?lat=&lng=&change_level=`; `/health`
  now reports `algorithm: live`.
- **Frontend:** new `PlannerPanel` (right panel) with the change-level selector + "Generate plan" button
  that calls the planner and shows the ranked interventions. Added `getPlan()`, `Plan`,
  `Intervention`, `ChangeLevel` to `api.ts`; wired into `App.tsx`.
- **Verified:** endpoint returns correct plans per level (level 1 → 3 interventions, level 3 → 6);
  farmland variant present; frontend build passes; full-stack via proxy works.

## [v0.3.2] — 2026-08-19
### Added — Layer 2 (heat + land-use analysis)
- **Backend:** `app/services/landuse.py` — classify a lat/lng as building/road/water/green/farmland/
  amenity/open-ground from OpenStreetMap (Overpass API, free/no key), with a deterministic offline
  fallback so the app always returns a classification.
- **Backend:** `app/routers/analysis.py` — `GET /api/analysis/spot?lat=&lng=` merges live temperature
  (existing heat provider) + land classification into one result with a human-readable summary.
- **Frontend:** tapping a spot now calls the analysis endpoint and the bottom bar shows the land type
  ("Building", "Park / greenery", etc.) alongside temperature. Added `analyzeSpot()` to `api.ts`,
  `LandInfo`/`SpotAnalysis` types, and wired the land state through `App` → `BottomBar`.
- Registered the analysis router in `app/main.py`.
- **Verified:** backend unit tests for land classification all pass; offline fallback works when OSM is
  unreachable; endpoint + frontend build + full-stack proxy all green.
### Added
- `docs/vision.md` — the broader product vision as five layers (knowledge database, pattern recognition,
  change-level planner, emergency AI, experience) + hackathon phasing and judging fit.
- `PLAN.md` — added a pointer to `docs/vision.md` and added it to the docs index.

### Added — Layer 1 (knowledge database) scaffold
- `db/schema.sql` — PostgreSQL + PostGIS schema for the knowledge database: `cities`, `buildings`
  (plain-language architecture designs), `health_conditions`, `emergency_contacts`, `encyclopedia`,
  `saved_plans`, `pois`, `interventions`, plus indexes.
- `db/README.md` — how to apply the schema via the Supabase SQL editor.
- `docs/data.md` — updated the "Application database" section to reference the concrete `db/schema.sql`
  and the Layer-1 tables.

## [v0.2.1] — 2026-08-19
### Added — app structure/skeleton (build step 1)
- **Backend** (Python + FastAPI): `backend/app/main.py` + routers for heat/planner/ai, settings via
  pydantic-settings (`.env`), CORS for the frontend. Runs on port 8000.
  - Heat provider abstraction (`app/services/heat_provider.py`): deterministic **mock provider** so the
    app runs without an API key (dev/demo), plus a documented real `FortyGuardClient` stub
    (`app/services/fortyguard_client.py`) to be completed once endpoint details are confirmed.
  - Endpoints: `/api/health`, `/api/heat/point`, `/api/heat/grid`, `/api/planner/health`,
    `/api/ai/status`.
- **Frontend** (React + TypeScript + Vite + Tailwind + MapLibre GL): map app skeleton with a searchable
  top bar (OpenStreetMap Nominatim geocoder, any city), live heat-dot overlay (grid from backend), and a
  bottom bar showing the tapped spot's live temperature. Runs on port 5173, proxies `/api` to backend.
- **Full stack verified in sandbox:** frontend ↔ backend proxy works; preview host accepted (fixed a
  `vite.config.js` artifact emitted by `tsc -b` that was shadowing `vite.config.ts` and dropping the
  `allowedHosts` setting — switch build to `tsc --noEmit`).

### Notes
- `FORTYGUARD_API_KEY` / `GEMINI_API_KEY` still not set (see `backend/.env.example`). Heat currently
  uses the mock provider; real API integration to be completed.
- Next build steps: live heat map polish on real API (step 2), then intervention planner (step 3).

## [v0.2.0] — 2026-08-19
### Decisions locked
- **Multi-city / any-city:** the user picks the location (city/place) on the map and the app uses that
  city. HITR is not locked to one demo city. App must work wherever the user chooses.
- **Build order:** structure/skeleton first (layout, bottom bar, map options, routing), then the **live
  heat map**, then the intervention algorithm, then the AI assistant. Visual design/polish ("make it
  cooler/premium") is explicitly deferred to the end.
- **AI/LLM:** team has **Gemini free access (~2M token context)** via Google AI Studio. This is the
  primary LLM path for the assistant.
- **API:** team has the FortyGuard Temperature API (trial credits). Live heat-map integration planned.
- Note: screenshots of the FortyGuard dashboard still did not reach the workspace (upload folder empty
  on both attempts) — dashboard option review remains open; will proceed with the three confirmed API
  modes (Real-Time / Historic / Predictive) meanwhile.

## [v0.1.0] — 2026-08-18
### Added
- **Planning docs skeleton** (`PLAN.md`, `CHANGELOG.md`, `docs/` index in `PLAN.md`).
- `.gitignore` to keep secrets, dependencies, and build artifacts out of the repo.
- Confirmed product direction: intervention planning on existing cities (never rebuild from scratch),
  heat as one of several livability factors, AI limited to a defined assistive scope, any-city support.

### Added (follow-up, 2026-08-18)
- `docs/product.md`, `docs/algorithm.md`, `docs/ai.md`, `docs/data.md`, `docs/architecture.md`,
  `docs/judging.md` capturing the refined team direction:
  - Algorithm: interventions on **existing** cities (trees, shelter-belts, orientation, water points,
    farm-layout), scored on heat + accessibility + equity + productivity — never rebuild from scratch.
  - AI: bounded, grounded assistant (first-aid + city hotlines, historical cool/cheap building search,
    encyclopedia navigation, plain-language explanation of algorithm results). Never invents plans.
  - "Ranked intervention plan" = prioritized action list (what/where/why/impact/cost).
- `docs/data.md` updated with confirmed API modes (Near Real-Time / Historic / Predictive) and the
  pending dashboard-screenshot review.

### Added (follow-up)
- `docs/product.md`, `docs/algorithm.md`, `docs/ai.md`, `docs/data.md`, `docs/architecture.md`,
  `docs/judging.md` capturing the refined team direction:
  - Algorithm: interventions on **existing** cities (trees, shelter-belts, orientation, water points,
    farm-layout), scored on heat + accessibility + equity + productivity — never rebuild from scratch.
  - AI: bounded, grounded assistant (first-aid + city hotlines, historical cool/cheap building search,
    encyclopedia navigation, plain-language explanation of algorithm results). Never invents plans.
  - "Ranked intervention plan" = prioritized action list (what/where/why/impact/cost).
- `docs/data.md` updated with confirmed API modes (Near Real-Time / Historic / Predictive) and the
  pending dashboard-screenshot review.

### Notes / open decisions
- Exact demo city TBD (FortyGuard API is US-only). Phoenix, AZ is the leading candidate.
- Dashboard screenshots did not reach the workspace — need re-upload or verbal description of options.
- AI LLM path: Gemini Flash free tier (Google AI Studio) is the primary plan.

## [v0.6.3] — 2026-08-23
### Added — Pattern recognition wired into the API (was: untracked modules, unreachable)

- **New router endpoints** in `backend/app/routers/analysis.py`:
  - `GET /api/analysis/pattern?lat=&lng=` — heat-pattern classification (urban_heat_island,
    road_heat_trap, building_heat, cool_zone, water_cooling, farmland_heat, open_exposure,
    mixed_zone). Uses land-use + heat severity.
  - `GET /api/analysis/surface?lat=&lng=&radius_m=&resolution=` — 3D temperature raster with
    hotspot/coolspot detection + 24h diurnal sampling + 4-month seasonal sampling.
  - `GET /api/analysis/simulation_3d?lat=&lng=&radius_m=` — 3D city digital twin (buildings, roads,
    vegetation, hospitals, targeted interventions).
  - `POST /api/analysis/train` — pattern trainer (heuristic weight tuning).
  - `GET /api/analysis/model` — current trainer model weights.

- **New router** in `backend/app/routers/cities.py` + mounted in `main.py`:
  - `GET /api/cities/search?q=` — California city search.
  - `GET /api/cities/regions` — list unique regions.
  - `GET /api/cities/climate?lat=&lng=&scenario=` — climate-scenario temperature projection.

- **New planner helper** `planner.analyze_pattern(lat, lng)` — the endpoint was importing a
  non-existent function; this adds it (rule-based classification matching the heat-surface patterns).

- **New services** (untracked → committed, all tested end-to-end):
  - `services/heat_surface.py` — 3D temperature raster, hotspot/coolspot detection, 24h cycle, monthly
    cycle. Generates a coherent 2D temperature field from the mock provider + spatial coherence waves
    (urban heat island effect + 2D sine variations). 100 cells = 0.0 s on laptop, ~25 s when each cell
    hits OSM.
  - `services/city_simulation.py` — analyzes the heat surface, classifies each cell as building / road /
    vegetation / water / open, finds nearest hospital, generates 5 targeted interventions (alternating
    tree + water_point at the hottest buildings).
  - `services/trainer.py` — heuristic pattern trainer that refines weights based on California city
    region (Desert, Valley, Coastal) and reports simulated accuracy.
  - `services/accessibility.py` — POI finder (hospital / school / market / transit / fire / police)
    with deterministic offline fallback so the demo works without OSM.
  - `services/cities.py` + `data/california_temps.json` — California city profiles with neighborhoods
    and pre-baked realistic temperatures for LA, SF, SD, Sacramento, Fresno, etc.

### Verified

- 13/13 pattern-recognition + city endpoints return 200 against the FastAPI test client.
- Backend `py_compile` clean on every file.
- Frontend `tsc --noEmit` clean.

## [v0.6.4] — 2026-08-23
### Fixed — Cleanup triplet (audit #28 + #29 + #30)
- **#28 Deleted dead components.** `frontend/src/components/AiPanel.tsx` and
  `PlannerPanel.tsx` were left over from an earlier sidebar design — neither is
  imported anywhere now (verified via grep). The full-screen `AssistantScreen.tsx`
  and `PlannerScreen.tsx` are the live versions. Removed.
- **#29 Removed unused `httpx` import.** `backend/app/services/fortyguard_client.py`
  imported `httpx` but the only HTTP call is commented out (the real endpoint
  shape is pending FortyGuard docs). Removed the import; module still compiles.
- **#30 Typo fix.** `docs/data.md` had `heat-holotline` (extra "lo"). Fixed to
  `heat-hotline`. Pure documentation drift; no code or behavior change.

## [v0.6.5] — 2026-08-23
### Fixed — Audit #14: planner now data-driven (hotspots + hospitals + equity + protective)
- **New helper `_compute_context(lat, lng)`** in `backend/app/services/planner.py`.
  Pulls real spatial factors from already-committed modules:
  - `heat_surface.compute_surface(...)` — hotspot_count, coolspot_count, protective_score
    (fraction of grid cells ≥100°F)
  - `accessibility.find_nearby(...)` — nearest_hospital_m (great-circle distance to nearest
    hospital within 1km), equity_score (count of schools/transit/hospitals within 800m)
- **New helper `_context_bonus(ctx)`** maps the context to a score bonus (0..0.6 cap):
  - +0.3 × min(1, hotspot_count/3) → prioritizes hot-zone interventions
  - +0.2 if nearest hospital ≤300m → boosts shade/water at walkways
  - +0.15 × min(1, coolspot_count/2) → preserves cool zones
  - +0.15 × equity_score → vulnerable-population weighting
  - +0.10 × protective_score → cooling stations in extreme-heat blocks
- **`build_plan()` now appends context-driven interventions** at the front of the candidates list:
  - `hospital_access` if nearest hospital ≤300m
  - `protect_coolspot` if ≥1 cool zone detected
  - `equity_priority` if equity_score ≥ 0.5
  - `protective_cooling` if protective_score ≥ 0.4
- The context bonus flows into the score (`base_score + ctx_bonus - i*0.05`).

### Verified
- LA (34.05,-118.24) → 200, templates still drive ranking (offline-fallback hospital too far)
- SF (37.77,-122.42) → 200, `Protect the 1 cool spot(s) with tree barriers` appears at rank #1
- Palm Springs (33.83,-116.54) → 200, same coolspot intervention at #1
- Rural (36.5,-117) → 200, 4 templates returned (no surface data)
- Invalid coords (lat=99, lng=999) → 422 (existing validation unchanged)
- All 13 other pattern-recognition + city endpoints still return 200

### Stored for later (audit #14 partial — wind/humidity need real FortyGuard API)
- **Wind speed/direction factor** — requires the real FortyGuard Temperature API
  (audit #4 not yet fixed). Will plug in behind the same `_compute_context()` interface
  once the API key is wired.
- **Humidity factor** — same: requires real FortyGuard API.
- **Vulnerable-population data** (age, income, equity density) — currently approximated
  via school + transit + hospital density within 800m. Could be sharper with census data.

## [v0.6.6] — 2026-08-23
### Fixed — Audit triplet: #1 + #2 + #6 (small frontend cleanup)
- **#1 Map re-centering on city search.** The flyTo effect was already in the working tree
  (committed in earlier session). Added explicit `Audit #1 fix:` comment so the next agent
  doesn't regress it. Trigger: change in `[center.lat, center.lng, zoom]` props → smooth flyTo.
- **#2 Heat-overlay race on first load.** The `isStyleLoaded()` + `map.once("load")` guard was
  already in the working tree. Added explicit `Audit #2 fix:` comment. Trigger: heat data resolves
  before base style loads — without the guard, `addSource` throws and the overlay never appears.
- **#6 Dead `askAi()` GET wrapper removed.** `frontend/src/api.ts` defined `askAi(q)` that called
  `GET /api/ai/ask?q=` — but the backend only has `POST /api/ai/ask`. The function was never called
  anywhere. Removed the function definition. The `AiAnswer` interface is kept for now (legacy
  reference). The live path remains `askAssistant()` (POST).

## [v0.6.7] — 2026-08-23
### Fixed — Audit triplet: #17 + #18 + #22 (risk scale + _field bug + settings dead UI)
- **#17 Risk scale "comfortable" tier.** Added a new tier to `backend/app/services/heat_provider.py`:
  `comfortable` (≤70°F, blue `#3b82f6`). Previously, 65°F weather was labelled as heat risk (green
  "moderate") — pleasant weather shouldn't be a heat alert. New buckets in order: comfortable ≤70°F,
  moderate ≤80°F, high ≤90°F, very_high ≤100°F, extreme >100°F.
- **#18 `_field()` no-op duplication fix.** `backend/app/services/knowledge.py:_field` was
  `entry.get(name, entry.get(name, default)) or default` — the second `.get` had the same default
  so it was a no-op. Now properly normalizes: lists → space-joined string, dicts → "k v" pairs, None →
  default. This matters when a row has `symptoms` as a JSON string vs array — previously a string
  column could fail to match correctly.
- **#22 Settings theme + notifications now actually do something.** `frontend/src/screens/SettingsScreen.tsx`:
  - Theme choice persists to `localStorage` under `hitr.theme` and toggles a `dark` class on
    `document.documentElement` (so future CSS dark-mode rules can hook into it).
  - Notifications toggle persists to `localStorage` under `hitr.notifications` and **requests
    browser permission** via `Notification.requestPermission()` when the user opts in.

### Verified
- `risk_for(60.0)` → "comfortable" (new); `risk_for(75.0)` → "moderate" (unchanged)
- `_field({"symptoms": ["hot skin", "dizzy"]}, "symptoms")` → "hot skin dizzy" (was returning "")
- `/api/heat/point`, `/api/planner/plan`, `/api/analysis/spot`, `/api/ai/ask` all return 200

### Stored for later
- Add `html.dark { ... }` CSS rules in `frontend/src/index.css` to make the dark theme
  actually render with inverted colors. Currently the class is applied but no CSS hooks it.

## [Unreleased] — 2026-08-25
### Added — Database navigation foundation (phase 1)
- Added `frontend/src/screens/DatabaseScreen.tsx`, a mobile-first feature hub with the three requested entries:
  - **Architectural Designs** — reserved for the separately ported Patch1.0v design library; intentionally not wired until that library is added and verified.
  - **City Planner** — opens the existing planner, retaining its selected-map-point workflow.
  - **Tools** — opens the existing tools screen.
- The bottom navigation is now deliberately limited to **Home, Map, Assistant, Database, Settings**. Existing Planner and Tools source/screens were not deleted; they are accessed through Database.

### Removed — stale uncommitted integration only
- Removed the uncommitted `frontend/src/cooling-library/` and `CoolingLibraryScreen.tsx` files that came from the retired `100-cooling-ways` attempt. These files used a different data model from the requested `Patch1.0v` replica and were never committed HITR functionality.
- Removed its unneeded `lucide-react` dependency addition. No committed HITR feature, backend code, database code, or documentation was removed.

### Verification
- `npm ci` completed successfully (npm reports two existing dependency audit findings: one moderate, one high; no automatic audit upgrade was applied).
- `./node_modules/.bin/tsc --noEmit` still fails because of pre-existing missing files from the prior handoff: `EmergencyScreen`, `HeatSurfaceScreen`, `CitySimulationScreen`, `TrainingScreen`, `AlertBanner`, `HeatMapFAB`, `PlanSheet`, and the unrelated `BottomBar` `onViewSurface` prop mismatch. The new Database screen introduced no error in this check.
- Architectural Designs implementation is deferred to phase 2; Patch1.0v's offline assistant remains analysis-only and unchanged by request.

### Added — Patch1.0v Architectural Designs + offline advisor (phase 2)
- Added the complete Patch1.0v catalogue as the isolated `frontend/src/features/architectural-designs/` feature: its 100 cooling-design records, categories, catalogue, filters, design details, comparison, saved-project drawer, house-anatomy view, household cooling planner, medical knowledge and offline advisor.
- Added `ArchitecturalDesignsScreen` and connected Database → Architectural Designs. The feature keeps Patch1.0v's deterministic browser-side rule engine: it uses local design and medical records and makes no Gemini/API request.
- Restored the missing frontend feature modules that prevented compilation: heat alert banner, map action button, plan sheet, emergency screen, heat surface screen, city simulation screen and trainer screen. The map action menu is connected to Assistant, Emergency, Database and plan generation.
- `BottomBar` now accepts its already-used heat-surface action.

### Verification
- `frontend`: `./node_modules/.bin/tsc --noEmit` and `npm run build` pass.
- `backend`: FastAPI TestClient checks for health, heat point, heat surface, planner and assistant status return HTTP 200.
- Vite reports one non-blocking bundle-size warning (main JavaScript bundle is over 500 kB after minification); code splitting can be considered later.


### Changed — Knowledge Set terminology and online-first correction (unreleased follow-up)
- Renamed the Database folder visible to users from **Architectural Designs** to **Knowledge Set**. The contained Patch1.0v cooling-design/advisor feature remains unchanged.
- Corrected product direction: the application is online-first for live heat-wave, emergency-alert and weather context; bundled knowledge/mock data is a free fallback, not the intended primary source. Supabase remains optional. Documented the central-assistant direction, planner-edit limitation and current 2D-vs-3D spatial-model boundary. No planner scoring or assistant behavior changed in this follow-up.

### Added — Draft plan history foundation (next planning phase)
- Added `frontend/src/planner/draftHistory.ts`, an immutable client-side draft revision model. It keeps the analysed backend plan unchanged while allowing changes to form parent-linked alternatives, undo to move to a parent, and later revision-branch selection without deleting another scenario.
- This is a data-model foundation only; no city infrastructure is changed and no planner edit UI is exposed yet.

### Changed — central offline assistant replacement (phase 1)
- Replaced the visible Assistant route with `CentralAssistantScreen`. It uses Patch1.0v's local `offlineAiEngine` and Knowledge Set records for free deterministic symptom, heat-safety, cooling-design and household-plan guidance.
- The central assistant receives selected coordinate, current heat/risk/source, land-use and current planner result from `App.tsx`. It clearly exposes whether a source is mock or live through the supplied heat-reading source and includes a City Planner handoff button.
- The previous `AssistantScreen.tsx` remains in source as a recoverable legacy implementation; it is not deleted until the replacement receives user acceptance.

### Verification
- Frontend type-check and production build pass. Backend Python compilation and health/heat/AI-status TestClient checks pass.

### Added — California location warnings and consent-based Google fallback
- Central Assistant now shows a prominent heat warning for a selected `very_high` or `extreme` risk location, including California/US emergency guidance.
- Settings now limits the current location entry flow to California hints/cities and adds a persisted **Offer Google search after an answer** switch (`hitr.google-search`).
- When the switch is enabled, each new local-assistant answer asks whether the user wants to search Google. Search is only opened after the user presses **Yes, search Google**; no query is sent automatically. With the switch disabled, no search question is shown.

### Fixed — medical questions now take priority in the central Assistant
- Added symptom-first medical triage in `CentralAssistantScreen`. Health/symptom language now resolves against `medicalKnowledge.ts` before the architectural cooling engine runs.
- If a health question is broad but lacks a recognised precise protocol keyword, the assistant uses cautious heat-exhaustion guidance rather than returning an unrelated building recommendation.
- The legacy `AssistantScreen.tsx` remains unused/recoverable; the active central assistant is the only visible Assistant route.
