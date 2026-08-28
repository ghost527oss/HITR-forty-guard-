# Codebase Understanding — read-only review, 2026-08-28

> **Status of this document:** written after reading every source file in the repo, the docs, the
> changelog and the previous `AGENT_HANDOFF.md`, and after actually running the health checks
> (frontend type-check + production build, backend `py_compile` + FastAPI `TestClient` sweep).
> **Nothing in the repo was modified to produce it.** Nothing was committed.
>
> Audience: the next agent, or you after a break. It is meant to sit *next to* `AGENT_HANDOFF.md`
> (which stays as the historical running log) rather than rewrite it.

---

## 1. What HITR is

**HITR — Heat Intelligence & Territorial Resilience.** An entry for **FortyGuard Hackathon'26**,
Track 01 (Resilient Cities & Infrastructure) + Track 06 (Agentic AI).

One sentence: *a mobile-first web app that turns a live hyperlocal heat map into a ranked,
location-specific plan of interventions — trees, shelter-belts, shade structures, water stations,
building orientation — that cool an **existing** city without rebuilding it.*

Five non-negotiable principles (from `PLAN.md`, repeated throughout the docs):

1. **Never rebuild a city from scratch.** Streets and houses stay. We plan *interventions*.
2. **Heat is one of several livability factors** — accessibility, equity and productivity also weigh.
3. **The program does the analysis; the AI is a bounded, grounded assistant** — it never invents a city.
4. **Works for any city the user picks** (demo scope is currently California).
5. **Everything is versioned and documented** (`CHANGELOG.md` on every commit).

Product story for the rubric: *heat map → ranked action plan*, mapped explicitly in `docs/judging.md`
(Impact 40% / Technical 35% / Innovation 15% / Communication 10%).

---

## 2. Repo state right now (verified)

| Item | Value |
|---|---|
| Repo | `https://github.com/ghost527oss/HITR-forty-guard-` |
| Session branch | `arena/01a046c2-hitr-forty-guard` |
| Branch tip | `cda1602` — *"Deploy backend as Vercel serverless function (one-project setup)"*, 2026-08-27 |
| Branched from | `arena/01a037bb-hitr-forty-guard` @ `cda1602` |
| `origin/main` | `d7a3648` — *"Update map style to use Esri dark basemap"*, 2026-08-28 |
| Working tree | **Clean.** 105 tracked files, zero untracked/modified. |
| Clone | **Shallow** (`git rev-parse --is-shallow-repository` → `true`), so only the tip commit is visible |

### ⚠ Divergence to flag before any merge

`origin/main` has moved **past** our branch tip. The only difference in tracked content is one file:

```
frontend/src/screens/DesignStudioScreen.tsx
   main (d7a3648): Esri "World_Dark_Gray" base + separate Esri reference/label layer, maxzoom 16
   ours (cda1602): CARTO "dark_all" tiles (a/b/c/d subdomains), single layer, maxzoom 19
```

So main changed the Design Studio basemap to Esri *after* this branch was cut, and this branch holds
a different (CARTO) basemap. **Opening a PR will conflict on exactly this file.** Someone needs to
decide which basemap wins before merging — they are different providers with different attribution
and different zoom limits.

### Version story

`frontend/package.json` says **0.7.2**. `CHANGELOG.md` is *not* in order: the top sections run
`v0.7.2 → v0.7.1 → v0.7.0 → v0.6.2 → v0.6.1 → v0.6.0 → v0.5.0 → v0.3.5 … v0.2.0 → v0.1.0`, and then
**sections `v0.6.3`–`v0.6.7` and a large `[Unreleased] — 2026-08-25` block are appended at the
bottom** (lines ≈276 to end). The bottom `[Unreleased]` block is the most recent narrative: it covers
the Database hub, the Patch1.0v Architectural Designs port, the central-assistant replacement, the
California warning + Google-search consent, and the medical-triage priority fix. Read the bottom of
the file for "what happened most recently"; read the top for "what version number we claim".

---

## 3. Tech stack (the handoff says: don't change this)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind 3 | `noUnusedLocals`/`noUnusedParameters` on, `strict` on |
| Map | MapLibre GL | Free, no API key. Main map = OSM raster; Design Studio = CARTO dark raster |
| Icons | `lucide-react` 0.546 | Only added for the Architectural Designs feature |
| Backend | Python + FastAPI + pydantic-settings | CORS `*`, no auth |
| Geocoding | Nominatim (OSM, public) | Called **from the browser**, see §8 note on User-Agent |
| Land use / POIs | OpenStreetMap Overpass (public, no key) | Server-side, with deterministic offline fallbacks |
| Live weather | Open-Meteo (public, no key) | Called **from the browser** (Design Studio wind + heatwave) |
| Knowledge DB | Supabase (Postgres + PostGIS) — **optional, not required** | Falls back to bundled seed |
| LLM | Gemini — **configured but not wired**, and the current design deliberately avoids it | |
| Deploy | **One** Vercel project: static frontend + Python serverless backend | `vercel.json` rewrites `/api/:path*` → `/api/index` |

---

## 4. Backend — complete map

### 4.1 Entrypoints

- `backend/app/main.py` — FastAPI app, CORS `*`, mounts five routers, `/` + `/api/health`.
  Reports version `"0.2.0"` (stale; frontend is 0.7.2 — known audit item #26 "version drift").
- `api/index.py` — **Vercel serverless shim.** Adds `backend/` to `sys.path`, imports `app.main:app`
  as the ASGI export, and builds a `Mangum` handler as a fallback for non-ASGI runtimes.
- `vercel.json` — `buildCommand: cd frontend && npm install && npm run build`,
  `outputDirectory: frontend/dist`, rewrite `/api/:path*` → `/api/index`.
- Local dev is **not** affected by any of this: `uvicorn app.main:app --port 8000` + Vite proxy.

### 4.2 Endpoints (all verified live against the TestClient)

| Method | Path | Purpose | Status |
|---|---|---|---|
| GET | `/`, `/api/health` | liveness; reports `heat_provider: mock \| real` | ✅ 200 |
| GET | `/api/heat/point?lat&lng` | single-point temperature | ✅ 200 |
| GET | `/api/heat/grid?lat&lng&span_deg&steps` | NxN grid for the map overlay — returns **`points`**, not `cells` | ✅ 200 |
| GET | `/api/analysis/spot?lat&lng` | heat + land classification + one-line summary | ✅ 200 |
| GET | `/api/analysis/pattern?lat&lng` | heat-pattern classification (8 pattern keys) | ✅ 200 |
| GET | `/api/analysis/surface?lat&lng&radius_m&resolution` | temperature raster + hotspots/coolspots + diurnal/seasonal sampling | ✅ 200 |
| GET | `/api/analysis/simulation_3d?lat&lng&radius_m` | "digital twin": buildings, roads, vegetation, hospitals, targeted interventions | ✅ 200 |
| POST | `/api/analysis/train` | run one heuristic training cycle | ✅ 200 |
| GET | `/api/analysis/model` | current heuristic weights + simulated accuracy | ✅ 200 |
| GET | `/api/planner/plan?lat&lng&change_level` | ranked intervention plan — **accepts only 1..3** | ✅ 200 (0 and 4 → **422**) |
| GET | `/api/planner/health` | planner liveness + level labels | ✅ 200 |
| POST | `/api/ai/ask` `{question}` | grounded assistant, 5 intents | ⚠️ **500 on the `emergency` intent** — see §7.1 |
| GET | `/api/ai/status`, `/api/ai/knowledge`, `/api/ai/browse?category` | knowledge stats / index / browse | ✅ 200 |
| GET | `/api/cities/search?q`, `/api/cities/regions`, `/api/cities/climate?lat&lng&scenario` | California city pipeline + warming scenarios | ✅ 200 |
| GET | `/api/analysis/pois` | **does not exist** → 404. Declared in frontend `api.ts` but never called | ⚠️ see §7.4 |

### 4.3 Services — what each one really does

**`heat_provider.py`** — the single `get_temperature(lat, lng) -> HeatReading` interface.
`HeatReading` carries `lat, lng, temp_f, temp_c, risk, color, source, measured_at`.
Risk buckets (`RISK_THRESHOLDS`): ≤70 comfortable · ≤80 moderate · ≤90 high · ≤100 very_high · >100 extreme.
`MockHeatProvider` = `95.0 °F ± 10 °F`, derived from a deterministic hash of the coordinates.
**Important:** the mock has *no* latitude, elevation, climate or season input — San Francisco and
Death Valley both read ~85–105 °F. It is honest (every reading carries `source: "mock"` and the UI
badges it) but it is not a climate model.

**`fortyguard_client.py`** — a **stub**. Raises `RuntimeError` without a key and
`NotImplementedError` with one. The real endpoint contract (`POST /v1/heat-intelligence`) is
commented out pending the official docs. **This is the single biggest functional gap in the project.**

**`landuse.py`** — `classify_spot()` tries Overpass (`nwr(around:70, …)`), falls back to
`classify_heuristic()` (same coordinate hash → building/road/green/farmland/water/open).
Every result carries `source: "osm" | "fallback"` so the UI can say "land: estimated".

**`heat_surface.py`** (455 lines) — the "temperature raster behind the screen". Per cell it takes the
provider reading, then adds three 2D sine waves, an urban-heat-island term (centre up to ~3 °F
hotter) and optional diurnal/seasonal offsets; land kind comes from the **offline** heuristic (not
OSM, which is why it's fast). Then Gaussian smoothing (5×5, σ1.5) → local-max/min peak detection →
greedy clustering → hot/cool zones, each tagged with a pattern key and a plain-language explanation.
When `hour` and `month` are both `None` it **recurses 8 extra times** (4 diurnal hours + 4 seasonal
months) at half resolution to build `temporal`.

**`city_simulation.py`** — wraps `compute_surface(resolution=20)`, splits `grid_sample` cells into
buildings (with a deterministic `height_m` 5–20 m), roads (with `access_weight = 1/distance to
nearest hospital`), vegetation; then emits up to 5 interventions alternating tree/water_point at the
5 hottest building cells with hard-coded projected reductions (4.5 °F / 2.0 °F).
**"3D" is a misnomer** — it is a 2D raster with a height attribute; nothing renders a 3D mesh.

**`trainer.py`** — a simulation, not machine learning. Walks the 13 bundled California city
archetypes, nudges 5 global `HEURISTIC_MODEL` weights by region, and increments a pseudo-accuracy
(`min(0.98, accuracy + random(0.02, 0.05))`). Weights are module-level globals, so they persist for
the process lifetime and are **not** consumed by anything else yet.

**`accessibility.py`** — Overpass POI finder (hospital/school/market/transit/fire/police/pharmacy)
with a deterministic offline fallback that invents 1–4 POIs very close to the query point.

**`cities.py`** — 13 California cities with climate/region/base temp, plus 4 warming scenarios
(`current`, `mild_warming` +2.7 °F, `moderate_warming` +5.4 °F, `extreme_warming` +9.0 °F).

**`planner.py`** (412 lines) — the centrepiece. `build_plan()`:
1. `landuse_heat()` + `landuse.classify_spot()` → temp, risk, land kind.
2. `_heat_score()` (stepped: ≤85→0.2, ≤95→0.5, ≤105→0.8, else 1.0).
3. `land_boost` (farmland 0.3, building 0.2, green 0.1, water 0.0, default 0.1).
4. `level_bonus` (1→0.0, 2→0.15, 3→0.3).
5. `_compute_context()` → hotspot count, coolspot count, nearest hospital distance, equity score
   (schools+transit+hospitals ≤800 m, ÷6, capped 1.0), protective score (fraction of cells ≥100 °F).
6. `_context_bonus()` → additive, **capped at 0.6**.
7. Template candidates from `_candidates_for(kind, level)` + context-driven candidates prepended.
8. Score = `base + ctx_bonus − index × 0.05`; sort descending; renumber `rank`.

`analyze_pattern()` is the separate single-point pattern classifier used by `/api/analysis/pattern`.

**Honest assessment:** this is *template + spatial-context* ranking, not the full multi-criteria
optimiser `docs/algorithm.md` describes. Wind and humidity factors are explicitly **not** implemented
(they need the real FortyGuard API). Interventions carry no real coordinates — `where` is a string
like `"other area near (34.0522, -118.2437)"`. The handoff's audit item #14 ("planner not
data-driven") is *partially* fixed as of v0.6.5, not closed.

**`assistant.py` + `knowledge.py` + `data/seed.py`** — the grounded assistant.
`detect_intent()` routes to emergency → first_aid → plan (checked first), then a "what is / explain"
prefix check → encyclopedia, then buildings → encyclopedia default.
`knowledge.py` reads Supabase via `_rows(table, fallback)` when reachable, else the bundled seed
(5 health conditions, 2 emergency contacts, 12 encyclopedia entries, 6 building designs, 5 cities).
Matching is token/prefix based with stem tolerance (`_tok_similar`, 4-char prefix).
⚠️ See §7.1 — the emergency path is broken.

---

## 5. Frontend — complete map

### 5.1 Information architecture (user-approved, do not restructure casually)

Bottom nav has **exactly five** entries (`nav.ts` → `NAV_ITEMS`):

```
🏠 Home | 🗺️ Map | 🤖 Assistant | 🗂️ Database | ⚙️ Settings
```

`View` is a 12-value union. Five are reachable from the bottom bar; the rest are reached by drilling
in: `planner`, `tools`, `architectural_designs`, `design_studio`, `heat_surface`,
`city_simulation`, `training`, `emergency`.

`DatabaseScreen` is a pure navigation hub with exactly three folders:
- **Knowledge Set** → `architectural_designs` (the ported Patch1.0v catalogue)
- **City Planner** → `PlannerStartModal` (popup) → `design_studio`, or → classic `planner`
- **Tools** → `tools`

`PlannerScreen` and `ToolsScreen` were **moved behind Database, not deleted** — this was an explicit
user requirement.

### 5.2 State ownership

`App.tsx` (349 lines) is the single owner of: `view`, `center`/`title`, `picked`, `reading`, `land`,
`heatData`, `units`, `changeLevel`, `plan`, `status`, the planner-launch flow
(`plannerModal` / `plannerPicking` / `studioSpot` / `studioScope`), and `webSearchEnabled`
(persisted at `localStorage["hitr.google-search"]`).

It has two race-condition guards: `clickCounterRef` and `planCounterRef` (monotonic counters compared
after each `await`), plus `cancelled` flags in the mount effects. **Do not remove these** — audit #1/#2
regressions came from exactly this.

Default location is Los Angeles `(34.0522, -118.2437)` at zoom 12 — **zoom is a `useState` that is
never updated**.

### 5.3 The three user flows

**A. Classic map flow** — `HomeScreen → MapScreen`. `MapView` renders OSM raster + a
FortyGuard-style **fill-polygon tile grid** (one rectangle per cell, faded in from opacity 0 → 0.55),
an orange pin on the picked spot, and shift+drag box selection. `TopBar` = city search (Nominatim) +
°F/°C toggle. `BottomBar` = temp, risk pill, coordinates, and an honesty line
(`heat: mock` / `· land: estimated`). `HeatMapFAB` expands to Plan / Assistant / SOS / Database.
`PlanSheet` offers the 5 change levels. `AlertBanner` fires at ≥90 °F.

**B. Design Studio (the flagship, v0.7.0)** — `Database → City Planner` opens `PlannerStartModal`:
step 1 pick a place (or "Select on map" → map-view pill → back to the popup), step 2 pick a scope
(`spot`/`block`/`district`/`city`/`farm`), then **Launch Design Studio**.

`DesignStudioScreen` (729 lines) is a premium dark MapLibre studio that:
- loads a 20×20 = 400-cell heat grid (`/api/heat/grid`), the digital twin (`/api/analysis/simulation_3d`)
  and live weather (`Open-Meteo`, from the browser)
- renders toggleable layers: heat tiles, animated **wind streaks** on a canvas overlay, structures
  (circle radius interpolated from building height), existing green, backend-suggested tree/water
  points, and **client-side auto-placed water stations**
- has a **design mode**: pick a tool (tree cluster / water station / cool roofs / garden), tap to
  place, see teal halos, toggle "After design" for a simulated cooler map, and read an impact card
  (avg/peak before→after °F, avg °C drop, PMV/PPD "feels" chip), with undo/clear
- shows a heatwave banner from the official definitions
- **labels its data honestly**: `heat: mock model (FortyGuard slot)` until the real API is wired

**C. Assistant** — the `assistant` view is now `CentralAssistantScreen`, **not** `AssistantScreen`.
It runs Patch1.0v's `offlineAiEngine` entirely in the browser (no network, no Gemini, no Supabase),
receives map/planner context as props, evaluates a **medical-triage guard first** (broad symptom
regex → `getMedicalTriage`, defaulting to the heat-exhaustion protocol), shows a red California heat
warning only for `very_high`/`extreme` risk, and offers a consent-gated Google search link when
`hitr.google-search` is on. `AssistantScreen.tsx` (the old API-backed one) is retained but unused.

### 5.4 `frontend/src/planner/uhiFactors.ts` — the research engine

Pure TypeScript, no React, no network. Constants and formulas are attributed to three papers
(referenced as `docs/research/PAPER-1..3` + `SYNTHESIS.md` — **those files are not in the repo**;
they were deliberately left untracked, so the citations in the code are currently unverifiable from
the repo alone):
- Oke canyon law `Δt = 7.45 + 3.97·ln(H/w)`, sky-view-factor proxy
- full **Fanger PMV / PPD (ISO 7730)** with a damped fixed-point iteration (the raw iteration diverges
  for light summer clothing — the `0.25` damping factor is load-bearing)
- official heatwave definitions: 3 days ≥35 °C, **or** 3-day mean ≥28 °C with every night ≥21 °C
- design simulator: per-kind center drop + linear distance decay + per-kind stacking caps + a
  **−3.5 °C total cap** (deliberately conservative)
- greedy hottest-first water-station placement with ≥120 m spacing

### 5.5 `frontend/src/features/architectural-designs/` — the Patch1.0v port

~7,270 lines: 100 cooling designs across `designs-part1/2/3.ts` (aggregated in `designs.ts`),
`categories.ts`, `medicalKnowledge.ts`, `offlineAiEngine.ts`, plus 11 UI components (catalogue,
filters, matrix, compare, detail modal, saved-projects drawer, house anatomy, cooling planner,
AI advisor) and the `ArchitecturalDesigns` controller.

**Twelve of those files carry `// @ts-nocheck` at the top** (`ArchitecturalDesigns.tsx`,
`utils/offlineAiEngine.ts`, and 10 of the components). This was a deliberate, documented decision so
the unmodified Patch1.0v presentation sources would compile under HITR's `noUnusedLocals`. The
**data and type files remain type-checked.** Removing `@ts-nocheck` is a file-by-file cleanup task,
not a rewrite. It is client-side only and makes no network calls.

### 5.6 Not wired to anything

- `frontend/src/planner/draftHistory.ts` (84 lines) — a clean, immutable draft-revision model
  (base plan + parent-linked revisions + undo + child-branch lookup). **Zero importers.** It is the
  intended foundation for planner edit/undo, deliberately landed as data-model only.
- `getNearbyPOIs()` in `api.ts` — points at a non-existent endpoint.

---

## 6. Honesty audit — what is real vs simulated

This matters for a hackathon demo where "up to 115× more accurate than conventional models" is the
sponsor's claim.

| Surface | Real? | Where the label comes from |
|---|---|---|
| Temperature | ❌ **Mock** unless `FORTYGUARD_API_KEY` is set and the client is implemented | every reading carries `source: "mock" \| "fortyguard"`; BottomBar shows `heat: mock`; Design Studio shows `heat: mock model (FortyGuard slot)` |
| Land use | ✅ real when Overpass is reachable, else deterministic guess | `source: "osm" \| "fallback"`; BottomBar appends `· land: estimated` |
| POIs (hospitals etc.) | ✅ real when Overpass is reachable, else invented nearby | fallback silently returns fake POIs — **no label surfaces this to the user** |
| Hotspots / coolspots | ⚠️ computed from mock temperatures + synthetic waves | honest about inputs, not labelled in the UI |
| Building heights | ❌ deterministic from coordinates (`5 + |sin+cos|·15`) | not labelled |
| Wind / heatwave / PMV | ✅ **real** — Open-Meteo live forecast, from the browser | attributed in the UI |
| Cooling estimates | ⚠️ literature-calibrated, capped at −3.5 °C | cited in `uhiFactors.ts` notes |
| Trainer "accuracy" | ❌ `random.uniform(0.02, 0.05)` per cycle | labelled "simulated" in the screen copy |
| Emergency numbers | ✅ 911 / 211 only; city hotlines are verified placeholders | documented in `db/README.md` and `02_emergency.sql` |
| Medical content | ⚠️ general first-aid guidance, with 911 escalation and disclaimers | `seed.py`, `docs/ai.md`, assistant UI |

**Net:** the app is honest wherever a human wrote a label, and the two gaps are (a) the POI fallback
producing fake hospitals with no "estimated" badge, and (b) building heights.

---

## 7. Defects found (read-only — not fixed)

### 7.1 🔴 `POST /api/ai/ask` returns 500 for every emergency question

`backend/app/services/knowledge.py` lines 130–148. The `def get_emergency_contacts(city):` **line is
missing**; only its docstring and body survive, indented *inside* `get_health_condition` after its
`return` on line 138. So the function is unreachable dead code and `knowledge.get_emergency_contacts`
does not exist.

`assistant.py:68` and `:70` call it → `AttributeError` → **HTTP 500**.

Verified live: `{"question": "emergency"}`, `"call 911"`, `"hospital"` → **500**.
Every other intent (`heat stroke`, `what is a heat wave`, `cool roof house`, `plan`, gibberish) → 200.

Note the dead body also filters on `e.get("city")`, a field that does not exist in
`db/schema.sql` (`emergency_contacts` uses `city_id uuid`) nor in `seed.EMERGENCY_CONTACTS` (which
has `city: None`). So restoring the `def` line alone is necessary but may not be sufficient — this is
audit #10 ("emergency schema mismatch"), still open.

**This is reachable from the UI:** the FAB's SOS action goes to `EmergencyScreen` (a static page, so
it is fine), but any user typing "hospital" or "911" into the *legacy* `AssistantScreen` hits the
500. The live `CentralAssistantScreen` does **not** call the backend at all, which is why this has
stayed hidden.

### 7.2 🟠 Classic planner offers change levels the backend rejects

`frontend/src/api.ts:124` declares `ChangeLevel = 0 | 1 | 2 | 3 | 4` and `CHANGE_LEVELS` lists all
five (`None` / `Light` / `Medium` / `Re-plan` / `Rebuild`). `PlannerScreen` renders all five buttons
and `PlanSheet` renders all five. But `backend/app/routers/planner.py:21` declares
`Query(1, ge=1, le=3)` and `planner.build_plan` clamps `max(1, min(3, level))`.

Verified: `change_level=0` and `change_level=4` → **422**. The user sees
`Couldn't generate plan: GET … -> 422`. Pickable, reproducible, user-visible.

`PlannerStartModal`'s `SCOPES` also carries `changeLevel: 4` for "Whole city" — but the Design Studio
never calls `/api/planner/plan`, so it only renders as an `L4` badge. No break today.

### 7.3 🟠 `Plan` type in `api.ts` does not match the backend response

`api.ts:109-121` declares `temp_c`, `pattern`, `pattern_label` on `Plan`. `build_plan()` returns
`{lat, lng, change_level, change_label, land, temp_f, risk, interventions}` — **no** `temp_c`,
**no** `pattern`, **no** `pattern_label`. Currently harmless because nothing reads those three
fields, but it's a trap for the next feature.

### 7.4 🟡 Dead/mismatched API surface

- `/api/analysis/pois` — 404. `getNearbyPOIs()` exists in `api.ts` and has **no callers**.
- `/api/heat/grid` returns `points`; `HeatGridResponse` types both `cells` and `points` and
  `loadHeatGrid()` tolerates either (`res.cells ?? res.points ?? []`). The handoff lists "rename to
  `cells`" as item A; the client-side tolerance is the pragmatic fix and is already in place.

### 7.5 🟡 Performance / correctness smells

- `heat_surface.compute_surface` constructs a **new heat provider inside the per-cell double loop**
  (line 303) — 400 constructions for a 20×20 grid. Harmless with the mock provider, expensive the
  moment the real HTTP client lands (this is audit #20).
- `compute_surface` recurses **8 extra times** for temporal sampling (4 diurnal + 4 seasonal at half
  resolution). One `/api/analysis/surface` call ≈ 9 grid builds.
- `MockHeatProvider` has no climate/latitude/season input, so every city reads 85–105 °F.
- `heat_provider.py` keeps a **second, independent risk table** (`_RISK_TABLE`, 4 buckets, no
  "comfortable") from the one in `heat_provider.RISK_THRESHOLDS` (5 buckets). The two disagree below
  80 °F.
- `trainer.py` mutates module-level `HEURISTIC_MODEL` globals; nothing consumes the result.
- `App.tsx` — `zoom` is state but never set; `landuse`/`city_simulation` compute great-circle
  distance inconsistently (haversine in `planner.py`, raw degree-Pythagoras in `city_simulation.py`).

### 7.6 🟡 Docs that describe things that don't exist

Known audit #27, still true:
- `docs/architecture.md` lists **Framer Motion** and **Supabase/PostGIS as core**; neither is
  installed/wired. It also lists Gemini as the assistant; the live assistant uses neither.
- `docs/product.md` still says the planner is a "right-side PlannerPanel" and the assistant is
  "`AiPanel` chat" — both components were deleted in v0.6.4.
- `README.md` says **"Status: Planning phase"** — the app is at v0.7.2 with two working studios.
- `docs/algorithm.md` describes wind + humidity factors as algorithm inputs (they are explicitly
  unimplemented, and the doc does flag this with ⚠️).
- `uhiFactors.ts` cites `docs/research/PAPER-1..3` and `SYNTHESIS.md`; **`docs/research/` does not
  exist in the repo** (left untracked by user request).
- `backend/data/california_temps.json` (138 lines) is **not imported by anything**.

### 7.7 🟡 Security / ops notes

- `main.py` → `allow_origins=["*"]`, `allow_methods=["*"]`. Fine for a hackathon, flagged in-code.
- `App.tsx` calls **Nominatim from the browser with no `User-Agent` header** (audit #16, still open).
  Nominatim's usage policy requires one; browsers can't set it. Same for the Design Studio's
  Open-Meteo call (Open-Meteo doesn't require it).
- Secrets discipline is genuinely good: `backend/.env.example` documents everything, `.gitignore`
  covers `.env`, `docs/secrets.md` is thorough, and no key appears in `frontend/`.
- Vite dev server already allows `.e2b.app` hosts and binds `0.0.0.0` — preview-friendly.

---

## 8. Health checks I ran (reproducible)

```bash
# Frontend
cd frontend && npm ci
./node_modules/.bin/tsc --noEmit        # ✅ exit 0, no errors
npm run build                            # ✅ built in 6.55s
                                         #    dist/assets/index-*.js = 1,359.40 kB (380.93 kB gzip)
                                         #    ⚠ Vite: chunk > 500 kB — code-splitting candidate

# Backend
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m py_compile app/services/*.py app/routers/*.py app/*.py app/data/*.py   # ✅

# Endpoint sweep (FastAPI TestClient) — see §4.2 for the per-endpoint table
```

No network-dependent path was exercised (the sandbox has no outbound access to Overpass), so every
OSM call fell through to its offline fallback — which is exactly the demo-without-network path, and
it behaves correctly.

---

## 9. Open work, carried forward and re-triaged

**Blocked on the FortyGuard key / API docs**
1. Implement `fortyguard_client.py` (the real endpoint contract). Everything downstream — honest
   temps, wind, humidity, real hotspot detection — waits on this.
2. Then add wind + humidity into `planner._compute_context()` (audit #14 remainder).
3. Then validate the mock/real switch end-to-end.

**Not blocked**
4. 🔴 Fix the emergency-intent 500 (§7.1) — one missing `def` line plus an optional schema decision.
5. 🟠 Reconcile the 5 frontend change levels with the backend's 1–3 (§7.2) — either implement levels
   0 and 4 in `planner.py`/`routers/planner.py`, or trim `CHANGE_LEVELS` to 3 and label 4 as
   "vision only" as `PlannerStartModal` already does.
6. Add a `/api/analysis/pois` endpoint or delete `getNearbyPOIs()` (§7.4).
7. Reconcile the two risk tables; add "comfortable" to `heat_surface._RISK_TABLE` (§7.5).
8. Hoist `build_provider()` out of the `compute_surface` cell loop (§7.5, audit #20).
9. Wire `draftHistory.ts` into a real template→draft→review/apply planner flow (it is designed but
   unimported). The handoff is explicit: **must not claim to modify real city infrastructure.**
10. Label the POI fallback as "estimated" in the UI, matching what land use already does (§6).
11. Fix docs drift (§7.6), especially `README.md`'s "Planning phase" and `docs/product.md`'s dead
    component names.
12. Code-split the 1.36 MB bundle; optionally drop `@ts-nocheck` one file at a time.
13. Decide the Design Studio basemap conflict with `origin/main` (§2) before merging.

---

## 10. Working rules the user has stated (respect these)

1. **Don't commit unless told to.** No commit is approved by default — including this document.
2. **Don't change anything without asking.** Small, isolated, additive changes only. Extend; never
   rewrite or delete working code.
3. **Implement 3 things at a time**, not ten.
4. **Document everything** — `CHANGELOG.md` per change, keep `AGENT_HANDOFF.md` current.
5. **California only** for now; keep the US-specific emergency disclaimers.
6. **$0 budget** — never introduce a paid service, and never require a credit card.
7. **No force-push, no `git reset --hard`** without explicit go-ahead.
8. **Never put a key in `frontend/`** — or in chat, commits, or screenshots.
9. At the end of a turn, offer the **GitHub merge PR link** and the **deployed app link**.
10. User is on a phone ~95% of the time; an occasional laptop is available.

---

## 11. Quick orientation for a fresh agent

1. Root has `README.md`, `PLAN.md` (concept), `CHANGELOG.md` (**read the bottom for recent work**),
   `RUNNING.md` (setup, phone-friendly), `AGENT_HANDOFF.md` (historical log).
2. `docs/` — `product`, `algorithm`, `ai`, `data`, `architecture`, `vision`, `judging`, `secrets`.
3. Backend is plain FastAPI, no ORM: `routers/` → `services/` → (`data/seed.py` | Supabase).
4. Frontend state lives **only** in `App.tsx`; screens are presentational.
5. Two planner UIs coexist by design: the classic ranked-list `PlannerScreen` and the new
   `DesignStudioScreen`. Do not delete either without asking.
6. Two assistants coexist by design: live = `CentralAssistantScreen` (offline, in-browser);
   retained-but-unused = `AssistantScreen` (backend-backed).
7. Before claiming anything works, run the two commands in §8. They are the project's definition of
   "green".

---

*End of document. No files in this repository were modified, created outside `docs/`, or committed
while producing it.*
