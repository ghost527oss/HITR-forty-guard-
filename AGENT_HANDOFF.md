# HITR Hackathon Project — AI Agent Handoff

> **Audience:** a future AI agent (or you, the user, after a break) picking up where this session ended.

---

## Part 1 — What HITR is

**Heat Intelligence & Territorial Resilience** — a FortyGuard Hackathon'26 entry. Track 01 (Resilient Cities & Infrastructure) + Track 06 (Agentic AI).

**One liner:** a mobile-first web app that turns a live heat map into a ranked, location-specific plan for trees, shade, water points, and building orientation. Powered by FortyGuard's hyperlocal Temperature API.

**Demo scope:** California only, US-style emergency numbers. Default city Los Angeles (34.0522, -118.2437).

**Repo:** `https://github.com/ghost527oss/HITR-forty-guard-`
**Branch always:** `arena/01a046c2-hitr-forty-guard` (don't switch — the session is tracked by it)
**Constraints:** user is on phone 95% of time, $0 budget, occasional laptop only.
**Keys:** the user HAS a FortyGuard API key and has already deployed to Vercel. It goes in
`FORTYGUARD_API_KEY` (backend env / Vercel Environment Variables). Never in the frontend, never
in a commit. See Part 18.

---

## Part 2 — Tech stack (don't change this)

| Layer | Tech |
|-------|------|
| Backend | Python 3.10+, FastAPI, pydantic-settings |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Map | MapLibre GL (no API key — OSM raster tiles) |
| Geocoding | Nominatim (OSM, public) |
| POIs | OpenStreetMap Overpass (public) |
| Optional DB | Supabase (configured but NOT yet wired in) |
| Optional LLM | Gemini Flash (configured but NOT yet wired in) |
| Deploy | Vercel (frontend + serverless backend) |

---

## Part 3 — Where the repo is RIGHT NOW

> **⚡ Session update 2026-08-26 (read this first):**
> - New flagship flow: **Database → City Planner → popup → Design Studio** (`DesignStudioScreen.tsx`
>   + `PlannerStartModal.tsx` + `planner/uhiFactors.ts`). Premium dark 2D map: heat overlay
>   (mock/FortyGuard slot), wind streaks (Open-Meteo, free), structures/green layers, backend
>   suggestions, auto water-station placement, tap-to-place design tools with simulated
>   before→after temps (literature-calibrated, capped −3.5 °C), PMV/PPD feels-chip, heatwave
>   banner (35 °C×3d or 28-mean/21-night rules). Scopes: spot/block/district/city/farm.
> - **3 research papers** analyzed in `docs/research/` (untracked by user request):
>   PAPER-1 Ancona (physics), PAPER-2 Lee & Kim (evidence + planning scales),
>   PAPER-3 Wicki (trade-off UX), SYNTHESIS.md (merged factor system + roadmap).
> - Fixed: heat-grid `points`/`cells` mismatch — main map heat overlay now renders.
> - Classic `PlannerScreen.tsx` unchanged, reachable via popup footer.
> - Backend untouched this session. Test: `cd frontend && npm ci && ./node_modules/.bin/tsc --noEmit && npm run build`.

**Branch tip right now:** `3546ec0` (v0.5.0 — `app redesign: home screen + bottom navigation`). This is the last known safe, Vercel-deployable state.

Earlier in the session, we force-reset back to this because the previous broken commits referenced files (`HeatCell`, `HeatMapFAB`, `PlanSheet`) that didn't exist in their parent commit. Vercel builds failed. The remote was force-reset to `3546ec0` to recover. **All "shipped" features from earlier tonight live only as untracked-disk files, not in git history.**

When you start, the **disk has BOTH**:
1. The v0.5.0 baseline (committed at `3546ec0`)
2. Some untracked experimental files written over the session

**The untracked files might compile, might not — verify before relying on them.** Run these health checks first thing:

```bash
# Frontend
cd frontend && ./node_modules/.bin/tsc --noEmit

# Backend
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m py_compile app/services/*.py app/routers/*.py
```

---

## Part 4 — Committed code at `3546ec0` (safe baseline)

### Backend

- `backend/app/main.py` — FastAPI app, CORS=*, mounts `heat/`, `analysis/`, `planner/`, `ai/` routers
- `backend/app/config.py` — pydantic-settings reading `backend/.env`
- `backend/app/routers/heat.py` — `GET /api/heat/point`, `GET /api/heat/grid`
- `backend/app/routers/analysis.py` — `GET /api/analysis/spot` (temp + OSM land classification)
- `backend/app/routers/planner.py` — `GET /api/planner/plan?change_level=1..3`, `/health`
- `backend/app/routers/ai.py` — `POST /api/ai/ask`, `GET /api/ai/status`, `GET /api/ai/knowledge`, `GET /api/ai/browse`
- `backend/app/services/heat_provider.py` — `MockHeatProvider` (deterministic lat/lng → temp). `fortyguard_client.py` is a stub (raises NotImplementedError)
- `backend/app/services/landuse.py` — OSM Overpass classification with offline deterministic fallback
- `backend/app/services/planner.py` — Ranked intervention algorithm. Currently has **3 levels**: Light (3 templates) / Medium (5) / Full re-plan (6). **Templates, not real multi-criteria.**
- `backend/app/services/assistant.py` — Deterministic intent-based Q&A. **Routes questions to 5 intents:** emergency / first_aid / buildings / plan / encyclopedia. Falls back to "I cannot find that" when uncertain.
- `backend/app/services/knowledge.py` — Reads Supabase if configured, falls back to bundled `seed.py`
- `backend/app/data/seed.py` — Bundled health conditions, emergency contacts, encyclopedia entries, building designs, cities
- `backend/requirements.txt` — fastapi, uvicorn, pydantic, pydantic-settings, httpx, python-dotenv, supabase

### Frontend

- `frontend/src/api.ts` — Typed client. Important shapes:
  - `HeatReading` (single point) — has `lat, lng, temp_f, temp_c, risk, color, source`
  - `HeatGridResponse` — currently uses **`points: HeatReading[]`** (NOT cells — see Part 6)
  - `LandInfo`, `SpotAnalysis`, `Intervention`, `Plan`
  - `ChangeLevel` = `1 | 2 | 3` (Light, Medium, Full re-plan) — NOT 5 levels yet
- `frontend/src/nav.ts` — `View = 'home' | 'map' | 'assistant' | 'planner' | 'tools' | 'settings'`
- `frontend/src/components/MapView.tsx` — MapLibre setup, **circle-style heat dots**, click to pick spot
- `frontend/src/components/TopBar.tsx` — city search + units toggle
- `frontend/src/components/BottomBar.tsx` — picked-spot summary
- `frontend/src/components/BottomNav.tsx` — nav toolbar
- `frontend/src/components/AiPanel.tsx`, `frontend/src/components/PlannerPanel.tsx` — **stale leftovers**; screens take precedence; safe to delete
- `frontend/src/screens/HomeScreen.tsx` — landing with 4 quick-action cards
- `frontend/src/screens/MapScreen.tsx` — wraps MapView + bars
- `frontend/src/screens/AssistantScreen.tsx` — chat UI with suggestion chips
- `frontend/src/screens/PlannerScreen.tsx` — change-level buttons + ranked plan
- `frontend/src/screens/ToolsScreen.tsx` — folder browser (placeholders)
- `frontend/src/screens/SettingsScreen.tsx` — location/units/theme/emergency

### Docs (committed, useful)

`docs/{product,algorithm,ai,data,architecture,vision,judging}.md`, plus `RUNNING.md`, `README.md`, `PLAN.md`, `CHANGELOG.md`.

---

## Part 5 — Untracked files (write once, may have bugs)

These exist on disk from this session but are NOT in any commit. The user must review them before merging.

**Frontend untracked:**
- `frontend/src/components/AlertBanner.tsx` — color-coded heat alert banner (90°F/100°F/110°F thresholds)
- `frontend/src/components/HeatMapFAB.tsx` — bottom-right circle (Plan/Assistant/SOS/Database)
- `frontend/src/components/HeatSurface3D.tsx` — Canvas isometric 3D temperature surface viz
- `frontend/src/components/PlanSheet.tsx` — iPhone-style bottom drawer for change level
- `frontend/src/downloadReport.ts` — `.txt` and `.json` plan exports
- `frontend/src/savedPlans.ts` — localStorage save/load
- `frontend/src/screens/CitySimulationScreen.tsx` — 3D city twin (Canvas-rendered buildings, roads, hospitals)
- `frontend/src/screens/DatabaseScreen.tsx` — placeholder ("Coming soon")
- `frontend/src/screens/EmergencyScreen.tsx` — step-by-step heat emergency triage
- `frontend/src/screens/HeatSurfaceScreen.tsx` — 3D surface viewer page
- `frontend/src/screens/TrainingScreen.tsx` — pattern-trainer dashboard

**Backend untracked:**
- `backend/app/services/accessibility.py` — POI finder (hospitals, schools, transit)
- `backend/app/services/cities.py` — California city profiles
- `backend/app/services/city_simulation.py` — 3D digital twin analysis
- `backend/app/services/heat_surface.py` — 3D temperature surface + hotspot detection
- `backend/app/services/trainer.py` — Heuristic ML trainer simulator
- `backend/app/routers/cities.py` — City endpoints
- `backend/app/data/california_temps.json` — Pre-baked CA neighborhood temps

**Trust level:** LOW. Verify each file line-by-line.

---

## Part 6 — Known things to do (user's explicit asks)

In order of what the user has confirmed they want:

### A. Replace circle heat dots with the FortyGuard tile grid style
The user screenshotted the FortyGuard dashboard (colored rectangular tiles in a grid). The current `MapView.tsx` still uses circles. The user explicitly wants tiles.

**Does in two places:**
1. `backend/app/routers/heat.py` — change the grid generator to return `cells: { lat, lng, temp_f, color }` objects with smooth color gradient (not points)
2. `frontend/src/api.ts` — rename `HeatReading[]` heat-grid fields to `HeatCell[]` (`HeatCell` type)
3. `frontend/src/components/MapView.tsx` — replace circle layer with a `fill` GeoJSON polygon layer (rectangle per cell). Use `map.setPaintProperty` to fade from transparent → opaque for an elegant load animation

**Tip:** Make this change in a single commit so you can verify the whole flow works before moving on.

### B. Bottom-right FAB with quick actions (Plan/Assistant/SOS/Database)
The user wants a floating circle button on the map screen that expands into actions. Disk has a draft at `frontend/src/components/HeatMapFAB.tsx`. Review it; if buggy, rewrite.

**Need to add to `App.tsx`:** new view `database` (добавете в `View` union). Wire the FAB's callbacks to `setView(...)`.

### C. iPhone-style plan-level bottom sheet
Disk has `frontend/src/components/PlanSheet.tsx`. Review and rewrite if needed. Triggered from the FAB's Plan action. Calls `handleGeneratePlan(level)`.

### D. Plan levels (extended)
The user wants 5 levels: None (observe) / Light / Medium / Replan / Rebuild. The backend currently only supports 3. Need to:

1. `backend/app/services/planner.py` — extend `_candidates_for()` to handle levels 0 (observe only) and 4 (full rebuild with new streets, zoning, district cooling)
2. `backend/app/routers/planner.py` — extend `Query(... ge=0, le=4)`
3. `frontend/src/api.ts` — `ChangeLevel = 0 | 1 | 2 | 3 | 4`, plus a `CHANGE_LEVELS` array with `value`, `label`, `desc`
4. `frontend/src/screens/PlannerScreen.tsx` — render 5 buttons + descriptions

### E. Fix the planner's "templates" — actually do pattern recognition (the big one)

The user has explicitly asked twice for this. The current planner is **template-based**: it always returns the same 3 interventions for any building, regardless of where. The user's vision is:

> "Agent forms a 3D graph of temp index behind the screen, then analyses what is a hot spot and what is a cool spot, then looks for the reason why it is cool or hot over 24h or month, and based on that it arranges trees or some techniques to cool down high heat zones. Full plan should also contain hospitals, water points, etc."

**Approach:**
1. `backend/app/services/heat_surface.py` already exists on disk — builds a latency-aware temperature raster around the picked spot, finds local maxima/minima, clusters into hot/cool zones, simulates 24h + monthly cycles. Verify it. The shape it should expose to the frontend:
   ```
   GET /api/analysis/surface?lat=&lng=&radius_m=&resolution=
   -> { grid_min_max_avg, hotspots, coolspots, grid_sample[], temporal: { diurnal_sampling, seasonal_sampling } }
   ```
2. The planner should consume the heat-surface hotspots + the accessibility POIs (`/api/analysis/pois`) and emit *targeted* interventions: "place trees to fill the hotspot on X block", "place water point at the exact centroid of the hottest 3-block cluster", "if hospital is Y meters away, plan a wide-boulevard tree route to it"
3. The 3D city twin (`city_simulation.py` on disk) overlays buildings + roads + hospital weights so that "life vein" roads glow blue.

### F. Box-selection (Google Lens-style)
Disk has an experimental `MapView.tsx` that draws a box on shift+drag. Verify it.

### G. Built-in California emergency disclaimers
The app currently shows US-only 911. The user is OK with this — BUT make sure the emergency screen and settings have:
> "For California, USA only. Emergency numbers shown are US-specific."

### H. Train pattern recognition (the user's most recent explicit ask)
Disk has `services/trainer.py` + `screens/TrainingScreen.tsx` + `POST /api/analysis/train` endpoint. Verify all three, then add a Settings entry (or return to the existing entry) that links to the TrainingScreen.

### I. The user's "do not delete or rewrite same code again" rule
The user was explicit: do not delete or rewrite existing working code. Add features by **extending** or **adding new files** instead of tearing up working ones.

---

## Part 7 — Commands the next agent will need

```bash
# Local dev (after cloning)
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# In another terminal:
cd frontend
npm install
npm run dev   # serves on :5173, proxies /api -> :8000
```

```bash
# Deploy on Vercel (mobile flow):
# 1. Create PR from «arena/01a02b11-hitr-forty-guard» -> main on github.com mobile
# 2. Vercel watches main; auto-deploys frontend + backend serverless
# 3. Add env vars in Vercel dashboard (Settings -> Environment Variables):
#    FORTYGUARD_API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
```

```bash
# Type-check before pushing (catches the duplicate-import problem):
cd frontend && ./node_modules/.bin/tsc --noEmit

# Health-test backend before pushing:
cd backend && .venv/bin/python -c "
from fastapi.testclient import TestClient
from app.main import app
c = TestClient(app)
print(c.get('/api/health').json())
print(c.get('/api/heat/point?lat=37.7749&lng=-122.4194').json())
"
```

---

## Part 8 — Where the API keys go (when the user gets a computer)

**For local dev:** create `backend/.env` (gitignored) based on `backend/.env.example`:

```
FORTYGUARD_API_KEY=fg_your_actual_key
HEAT_PROVIDER=real
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJhbGc...your_anon
SUPABASE_SECRET_KEY=eyJhbGc...your_service
KNOWLEDGE_PROVIDER=supabase
```

**For Vercel production:** add the same keys via Vercel Dashboard -> Settings -> Environment Variables. NEVER commit them anywhere.

---

## Part 9 — Style guide the user expects

- **Tailwind `heat-*` color palette** already defined in `tailwind.config.js`
- **Bottom-nav icon style** — emoji glyphs (🏠 🗺️ 🤖 🌳 🧰 ⚙️). Match existing tone.
- **Mobile-first**, portrait phone viewport, max-width 480px content area
- **California-only disclaimers** on anything involving emergency contacts
- **No emoji skins / reactions** — plain emoji glyphs only

---

## Part 10 — Quoteable notes from the user

These are repeated requests the user has made — the next agent should respect them:

1. "Do coding for 3 points at a time" — implement features **3 at a time**, not 10 at once.
2. "Document everything" — update `CHANGELOG.md` on every commit; keep `AGENT_HANDOFF.md` current.
3. "Don't delete existing code" — extend, don't rewrite. (See Part 5.)
4. "California only" — don't add non-CA cities.
5. "No money" — never require credit cards; never introduce a service that does.
6. "Pattern recognition training" — the user's defining ask for this hackathon. Build this seriously. The TODO at `services/trainer.py` + `screens/TrainingScreen.tsx` + `POST /api/analysis/train` is the deliverable.
7. "When I commit, just say link to merge and link to app" — at the end of every turn, offer:
   - GitHub merge PR link
   - Deployed app link (Vercel)

---

## Part 11 — Quick links

- **Merge PR:** https://github.com/ghost527oss/HITR-forty-guard-/pull/new/arena/01a02b11-hitr-forty-guard
- **Vercel dashboard:** https://vercel.com/dashboard
- **Original FortyGuard dashboard (for visual reference):** https://dashboard.fortyguard.com
- **Hackathon challenge / track info:** fortyguard hackathon'26, Track 01 + Track 06

---

## Part 12 — TL;DR for a fresh agent

1. **Branch is `arena/01a02b11-hitr-forty-guard`. Don't switch.**
2. **Baseline is at `3546ec0` (v0.5.0).** Anything earlier in this session that you saw "shipped" is **only on disk**, not in git.
3. **Health-check first:** `tsc --noEmit` + `py_compile`. Untracked files may be broken.
4. **Implement 3 features at a time.** Commit cleanly. Vercel will auto-deploy the branch.
5. **The user's #1 ask:** real pattern recognition (heat-surface analysis feeding the planner). Don't mark it done until you've wired the surface analysis + accessibility POIs INTO the planner's intervention choice.
6. **Never put Supabase or FortyGuard keys in `frontend/src`.** Even as comments.
7. **Don't `git reset --hard` or `--force-push` without the user's go-ahead.**
8. Provide merge-link + Vercel-link at the end of every response.

Good luck. The current baseline builds; everything else is upside.

## Part 17 — Recent fixes (audit-driven)

The audit review identified 30 issues. Fixes are being applied in **triplets, one commit per triplet, never force-pushed**:

| Version | Audit # | What it fixes | Files |
|---------|---------|---------------|-------|
| v0.6.0 | #3 | NaN topics badge (typed `KnowledgeStats` to match real `/api/ai/status`) | `frontend/src/api.ts`, `frontend/src/screens/AssistantScreen.tsx` |
| v0.6.1 | #7, #8, #24 | Silent async failures → status banner; Home shows real temp with units; picked-spot pin on map | `frontend/src/App.tsx`, `frontend/src/components/MapView.tsx`, `frontend/src/screens/MapScreen.tsx` |
| (next triplet) | TBD | e.g. #10/#11/#30 | backend data integrity |

## Part 18 — Audit findings status (as of v0.6.1)

| # | Bug | Status |
|---|-----|--------|
| 1 | Map doesn't move on city search | Already fixed in working tree (preserved by v0.6.0) |
| 2 | Heat overlay race | Already fixed in working tree (preserved by v0.6.0) |
| 3 | NaN topics badge | FIXED v0.6.0 |
| 7 | Silent async failures | FIXED v0.6.1 |
| 8 | Home shows — | FIXED v0.6.1 |
| 24 | No pin on picked spot | FIXED v0.6.1 |
| 4 | FortyGuard 500s on real mode | Deferred — user says no API keys yet |
| 5 | Vercel deploy broken | Deferred — needs backend on Vercel |
| 6 | askAi() GET 405s | Deferred — dead code |
| 9 | browse ignores Supabase | Deferred |
| 10 | emergency schema mismatch | TODO |
| 11 | first-aid lies on miss | TODO |
| 12 | intent routing wrong | TODO |
| 13 | farmland crop-row wrong impact | TODO |
| 14 | planner not data-driven | TODO — biggest item |
| 15 | seed duplicates on re-run | TODO |
| 16 | Nominatim no User-Agent | TODO |
| 17 | risk scale no "comfortable" | TODO |
| 18 | _field no-op on strings | TODO |
| 19 | Supabase client cache forever | TODO |
| 20 | heat provider double-construct | TODO |
| 21 | grid no lat/lng validation | TODO |
| 22 | settings theme/notifications dead | TODO |
| 23 | tools folders empty | TODO |
| 25 | click handler closure | TODO |
| 26 | version drift | TODO |
| 27 | docs describe features that don't exist | TODO |
| 28 | dead AiPanel/PlannerPanel | TODO (AiPanel kept for now, has `?? 0` fallback) |
| 29 | unused httpx import | TODO |
| 30 | heat-holotline typo | TODO |

## Part 19 — How pattern recognition is going (honest)

- **Pattern Recognition coverage: ~15%.**
- Committed: `/api/analysis/pattern` endpoint + simple land-use classification.
- **Untracked on disk only** (never tested, never committed):
  - `backend/app/services/heat_surface.py` — 3D temperature raster analysis
  - `backend/app/services/city_simulation.py` — 3D city twin
  - `backend/app/services/trainer.py` — heuristic trainer
  - All frontend pattern-recognition screens
- **Not started at all** (audit #14): real planner that uses POIs + wind + equity instead of templates.

**Pattern recognition is the user's #1 ask but it depends on:**
1. Real FortyGuard API data (not yet wired — audit #4)
2. A real planner engine (audit #14 — biggest fix item)
3. Validated/committed pattern surface, city simulation, trainer

The next agent should **NOT push the untracked pattern-recognition files** until:
- They're individually type-checked
- They pass an end-to-end test against the backend test client
- They've been confirmed to integrate with `App.tsx` and don't break Vercel

Otherwise we'll recreate the same chaos as tonight's session.

---

## 2026-08-25 continuation update — Database hub and Patch1.0v port plan

> This update supersedes the old branch-name instruction above for the current Arena session. Work must remain on the session branch supplied by Arena; do not switch branches.

### User-approved navigation information architecture

The mobile bottom bar must contain exactly:

```
Home | Map | Assistant | Database | Settings
```

`Planner` and `Tools` must **not** be deleted. They have moved behind the Database screen, which contains exactly these folders:

```
Knowledge Set
City Planner
Tools
```

- `City Planner` routes to the existing `PlannerScreen`, retaining map-point/heat-plan state held by `App.tsx`.
- `Tools` routes to the existing `ToolsScreen`.
- `Architectural Designs` is reserved for a future phase-by-phase port of the `Patch1.0v` branch's 100 cooling-design catalogue.

### Patch1.0v assessment

`Patch1.0v` is a standalone root-level React app, not a safe merge target: merging it would remove the HITR backend, database, docs and frontend. Port its feature into a new contained HITR feature folder instead. Preserve the existing FastAPI backend and map/planner workflow.

Its useful future contents are: the 100 design data, categories, catalogue/filter/detail/compare/saved/house-anatomy/household-planner UI. Its offline AI is a keyword/rule-based browser retrieval engine over local cooling and medical data; it makes no required Gemini/network call. **Do not alter the live HITR Assistant for this yet**—the user has a later plan for it.

### Phase 1 status

- `frontend/src/screens/DatabaseScreen.tsx` exists and supplies the three Database folder cards.
- `frontend/src/nav.ts` defines the five visible bottom-nav entries.
- Retired, uncommitted `100-cooling-ways` integration files were removed after confirming their data model differed from Patch1.0v. No committed source was deleted.
- Current frontend type-check is still blocked by pre-existing missing experimental components/screens and a `BottomBar` prop mismatch. Address those build blockers separately and minimally before declaring a frontend build green.

### Required working style

1. **Analyse first, then modify (user rule, 2026-08-29):** before changing any
   file, read and understand the relevant code and say what was found. Then
   make the **smallest surgical edit** that fixes the issue. Do NOT delete and
   rewrite lines that still work (e.g. dropping a `const` and re-creating it)
   — users read diffs and distrust churn. Prefer in-place edits; extract to a
   shared file only when the exact code is genuinely used in ≥2 places.
2. Make small, isolated changes only; do not rewrite or delete main working features.
2. Analyse relevant source first; test after each phase.
3. If a test fails, repair only the failing scope, rerun it, and record it.
4. Document new work in `CHANGELOG.md`, this handoff, and relevant product/architecture docs.
5. Ask the user before a major architectural change or any commit. No commit is approved by default.

### Phase 2 completed — Architectural Designs implementation

The user approved an exact feature-level port of Patch1.0v. The feature is now located in `frontend/src/features/architectural-designs/` (data, components and utils), hosted by `ArchitecturalDesignsScreen`, and reached from Database → Architectural Designs. It includes the 100 designs and Patch1.0v's local offline medical/design advisor. Do not move it into the root app or replace HITR services with it.

To keep the current HITR TypeScript configuration (`noUnusedLocals`) compatible with unmodified imported Patch1.0v presentation sources, the Patch UI/controller files carry `// @ts-nocheck`. Its data/type files remain type-checked. Future cleanup may remove unused imports one file at a time; do not undertake an unreviewed rewrite.

Build verification as of 2026-08-25: `frontend ./node_modules/.bin/tsc --noEmit` and `npm run build` pass; FastAPI checks for health, heat point, heat surface, planner and AI status return 200. Vite warns that the minified client bundle exceeds 500 kB; future dynamic import/code splitting is appropriate but was not bundled into this feature port.


### Next approved direction — central offline assistant and planning research

The Database folder label is **Knowledge Set** (the imported 100 cooling designs, Patch1.0v offline advisor and safety records). Supabase is optional and is not required for the current demo. HITR may retain bundled data as a fallback, but the product direction is **online-first** for live heat-wave, emergency-alert and weather context. Do not remove the optional Supabase code/schema; it remains a later persistence/synchronisation option.

The user has approved a future replacement of the old bounded Assistant screen with the Patch1.0v offline advisor as a **central HITR assistant**. Before replacing it, preserve/map these context inputs: selected coordinate, current heat reading/risk/source, land-use result, generated planner result, and Knowledge Set records. The first integration must be free to run and clearly label mock vs real FortyGuard data. The main application needs online live heat-wave/emergency/weather context when network connectivity is available. Do not claim real FortyGuard temperature data until `fortyguard_client.py` is implemented and tested with user-provided credentials.

Planning edits need a separate, deliberate design phase: current `planner.py` generates ranked interventions but has no mutable plan model or add/remove/edit endpoint. A safe next slice is a local draft-plan state with template buttons and a review/apply flow; it must not claim to modify real city infrastructure. The user intends to supply research papers before pattern-recognition/scoring changes.

Current spatial reality: `heat_surface.py` creates a sampled 2D temperature raster (with hotspot/coolspot heuristics and temporal estimates), and `city_simulation.py` returns a lightweight simulated city data model. HITR does not yet construct a true 3D GIS/building mesh or render a 3D map. Evaluate a browser renderer such as Three.js/React Three Fiber or a MapLibre-compatible 3D extrusion layer only after requirements/research are supplied; do not import an external 3D app wholesale.

### Draft-plan history foundation (in progress)

`frontend/src/planner/draftHistory.ts` provides the initial immutable proposal model: base plan, parent-linked revisions, change records, current selection, undo, and child-branch lookup. Keep it local until a reviewed persistence/export design is chosen. Never mutate the base analysed `Plan`; an “add hospital” followed by “change hospital to police station” must become distinct revisions/branches rather than destructive edits.

### Central assistant replacement — phase 1 completed

The visible `assistant` view now uses `frontend/src/screens/CentralAssistantScreen.tsx`, not the old `AssistantScreen.tsx`. It calls the Patch1.0v `offlineAiEngine` locally and receives map/planner context as props from `App.tsx`: picked coordinate, `HeatReading`, `LandInfo`, and generated `Plan`. It does not call Gemini or require Supabase. The legacy screen is intentionally retained but unused until user acceptance.

This phase does **not** implement real FortyGuard calls, planner text parsing, plan mutation, or draft-plan UI. The heat source shown in assistant context must be treated honestly: mock until the real FortyGuard client is implemented and tested. The next safe increment is template-to-draft-plan creation using `draftHistory.ts`; do not create destructive city edits.

### Assistant location warning and web-search consent

`CentralAssistantScreen` now derives a selected-location warning from `HeatReading.risk`: only `very_high` and `extreme` show the red warning. Settings stores `hitr.google-search`; when enabled, the assistant renders a user-confirmed Google search link after an answer. This is a browser Google URL, not a Google Search API integration, so it costs no API money and does not automatically transmit questions. Keep the consent interaction intact. Current Settings applies a California-only input guard based on California/city text; a future geocoder result validation is needed for strict geographic enforcement.

### Medical-triage priority fix

`CentralAssistantScreen` has a `medicalResponse()` guard before `queryOfflineAiEngine()`. It matches broad symptom/health terms and resolves a protocol through `getMedicalTriage`; if no exact match is found, it defaults to the safer heat-exhaustion protocol rather than architectural content. Keep medical text clearly labelled as safety guidance and preserve 911 escalation. Do not remove the guard when extending building/planner abilities.

---

## Part 18 — FortyGuard integration (layers A/B/C)

_Added 2026-08-28. This supersedes anything earlier in this file that describes the FortyGuard
API — all earlier descriptions were guesses and were **wrong**._

### The verified contract

Read from `https://docs-api.fortyguard.com/docs/`. Full notes in `docs/fortyguard-api.md`.

| | |
|---|---|
| Base URL | `https://api.fortyguard.com/v1` |
| Auth header | **`api-key: <key>`** — NOT `Authorization: Bearer` |
| Pattern | **Async**: `POST` a task → `activity_id` → `GET /v1/status/{id}` → poll until Completed |
| Result | `data.result` of the *status* response |

| Endpoint | Path | Plan | Gives |
|---|---|---|---|
| Create Heatmap | `POST /v1/heatmap` | Basic+ | GeoJSON tile polygons + stats |
| Environmental Parameters | `POST /v1/env_params` | Basic+ (3 params) | humidity, heat index, AQI |
| Heat Intelligence | `POST /v1/heat_intelligence` | **Premium** | PDF via temporary link |
| Check Status | `GET /v1/status/{id}` | Basic+ | poll |

What every earlier guess got wrong: the header, the temperature endpoint (`/v1/heatmap`, not
`/v1/heat-intelligence`, which is a Premium PDF report), the call shape (async + area-based, not
sync per-point), the response (GeoJSON + stats, not a number) and the units (**°C**, not °F).

Other facts that shape the code: `granularity` must be 60/80/100 m; coverage is **US-only**;
Basic caps heatmaps at 10 mi²; credits are deducted only on success, and Failed/validation
errors are free.

### What is built

- **`backend/app/services/fortyguard_client.py`** — the verified client. 58 tests.
  Deliberately has **no** `get_temperature(lat, lng)`: the map used to call the provider 576
  times per load, which against a metered async API would be 576 billed tasks per page view.
  A test asserts the method's absence.
- **`backend/app/services/heatmap_service.py`** — layer B. `submit()` starts one task per
  bounding box; `poll()` proxies the status endpoint. Converts °C → °F, skips null tiles,
  reports `tile_property_keys`.
- **`backend/app/routers/fortyguard.py`** — `GET /api/heat/area` (202 + poll_url),
  `GET /api/heat/job/{id}`, `GET /api/fortyguard/selfcheck`.
- **`frontend/src/lib/realHeat.ts`** — layer C client. Two-phase: mock paints instantly,
  real tiles swap in when the task lands.

### Two design decisions worth keeping

1. **`poll()` is stateless.** It needs only the activity_id, never in-process memory. On Vercel
   the submit and the polls can land on different function instances, so a module-global job
   store would vanish between them and the job would never resolve. The in-memory cache is
   strictly an optimisation — losing it costs one duplicate request, never a broken page.
2. **`RealHeatUnavailable` is a distinct error class.** "No key configured" is not a failure;
   it means "use the mock". Callers catch it and fall back silently.

### Still open

- The vendor docs never show a tile's `properties`, so the key holding each tile's temperature
  is unconfirmed. `_extract_temperature_c()` guesses across ten candidates. **Run
  `/api/fortyguard/selfcheck?live=1` with the real key, poll the returned URL, and the
  `tile_property_keys` field will tell you the real name.** Then delete the guesswork.
- Wind is not available from FortyGuard — it still comes from Open-Meteo.
- CI lives at `docs/ci-workflow.yml`, parked because the GitHub App lacks the `workflows`
  scope. Restore it once that permission is granted.
- Cache is per-process. A shared store (Vercel KV) would make it durable.
