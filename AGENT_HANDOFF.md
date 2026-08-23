# HITR Hackathon Project — AI Agent Handoff

> **Audience:** a future AI agent (or you, the user, after a break) picking up where this session ended.

---

## Part 1 — What HITR is

**Heat Intelligence & Territorial Resilience** — a FortyGuard Hackathon'26 entry. Track 01 (Resilient Cities & Infrastructure) + Track 06 (Agentic AI).

**One liner:** a mobile-first web app that turns a live heat map into a ranked, location-specific plan for trees, shade, water points, and building orientation. Powered by FortyGuard's hyperlocal Temperature API.

**Demo scope:** California only, US-style emergency numbers. Default city Los Angeles (34.0522, -118.2437).

**Repo:** `https://github.com/ghost527oss/HITR-forty-guard-`
**Branch always:** `arena/01a02b11-hitr-forty-guard` (don't switch)
**Constraints:** user is on phone 95% of time, $0 budget, no API keys yet, occasional laptop only.

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
