# Changelog

All notable changes to this project are documented here. Format inspired by
[Keep a Changelog](https://keepachangelog.com/). Versioning: `v0.x` for pre-release planning/build.

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
