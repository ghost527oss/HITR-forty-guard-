# Codebase Understanding — fresh full read, 2026-08-28 (agent session 01a04932)

> **Status of this document:** written after reading every source file in the repo (all docs, all
> backend Python, all frontend TS/TSX including the Patch1.0v feature), and after actually running
> the health checks (frontend `tsc` + vitest + production build, backend pytest + a live
> TestClient sweep of every endpoint). **Nothing was committed.** This file is intentionally
> untracked. It complements (and where code moved on, supersedes) the previous session's
> `docs/CODEBASE_UNDERSTANDING_2026-08-28.md`.

---

## 1. What HITR is

**HITR — Heat Intelligence & Territorial Resilience.** FortyGuard Hackathon'26, Track 01 (Resilient
Cities & Infrastructure) + Track 06 (Agentic AI).

One sentence: *a mobile-first web app that turns a hyperlocal heat map into a ranked,
location-specific plan of interventions — trees, shelter-belts, shade structures, water stations,
building orientation — scaled to however much change the user chooses (observe → light → medium →
re-plan → full masterplan), with a free, grounded, in-browser assistant on top.*

Five principles (`PLAN.md`):

1. **Honesty of scale** (the retired "never rebuild a city" rule, replaced 2026-08-28 in v0.8.0):
   interventions come first; the change spectrum is the user's choice; every level states plainly
   how much of the city it touches (the backend emits a `scale` block for exactly this).
2. **Heat is one of several livability factors** — accessibility, equity, productivity also weigh.
3. **The program does the analysis; the AI composes, compares, explains — never invents** a number,
   coordinate or physical claim.
4. **Any city the user picks** (demo scope currently California-only, now also a hard API constraint).
5. **Everything versioned + documented** — `CHANGELOG.md` per change.

Judging story (`docs/judging.md`): Impact 40% / Technical 35% / Innovation 15% / Communication 10%.
The differentiator is *one change spectrum, not one answer*, plus explainable simulation (every °C
change is attributable to a placement, radius and cap).

---

## 2. Repo & branch state (verified this session)

| Item | Value |
|---|---|
| Repo | `https://github.com/ghost527oss/HITR-forty-guard-` |
| Session branch | `arena/01a04932-hitr-forty-guard` |
| Branch tip | `8e5fbc6` — "Fix the theme toggle and make the Knowledge Set follow it" |
| `origin/main` | `8fa710c` — "Merge pull request #3 from …/arena/01a046c2-…" |
| Tree identity | `HEAD`, `main`, `origin/main` and `origin/arena/01a046c2` all share the **same tree hash** (`9b78a03`) — everything on disk is committed and merged |
| Working tree | **Clean** — 122 tracked files, 0 modified, 0 untracked (before writing this doc) |
| Git history quirk | `main` and the 01a046c2 tip are **parentless root commits** (squashed history), so `git log` on them shows a single commit; the older pre-squash history lives only in the stale remote branches (`arena/01a01500/01a02b11/01a02fb9/01a037bb`, `Patch1.0v`, `3546ec0`) |
| Version | `frontend/package.json` **0.8.0**, FastAPI app title **0.8.0**, but `GET /` still reports `"version": "0.2.0"` (audit #26 version drift, still open) |

Old remote branches are **not** missing work: `origin/main`'s tree is the newest state and the other
branches are older ancestors from before the squash. Nothing from them needs recovering.

### Health checks I ran (all green)

```
Frontend:  ./node_modules/.bin/tsc --noEmit        → PASS (clean)
           vitest run                              → 35/35 passed (uhiFactors 31, realHeat 4)
           npm run build                           → PASS in ~6.7s
                                                     dist JS 1,383 kB (384 kB gzip) — chunk >500kB warning (code-splitting candidate)
Backend:   pytest                                  → 172 passed, 1 xfailed (3.1s)
           TestClient sweep of all 24 endpoints    → all 200 except the three expected:
                                                     change_level=5 / -1 → 422 (by design)
                                                     /api/heat/area → 503 (no API key configured — this is the mock fallback trigger)
                                                     /api/analysis/pois → 404 (known dead endpoint, see §9)
```

No outbound network in the sandbox: every OSM/Overpass call fell to its offline fallback, which is
exactly the demo-without-network path, and it behaves correctly.

---

## 3. Tech stack (the handoff says: don't change this)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 18 + TypeScript (strict, `noUnusedLocals`) + Vite 5 + Tailwind 3 (`darkMode: "class"`) | `lucide-react` 0.546 for all icons (emoji were replaced in Phase 1a) |
| Map | MapLibre GL 4 | Main map = OSM raster; Design Studio = Esri `World_Dark_Gray` base + reference, maxzoom 16 |
| Backend | Python 3.10+ + FastAPI + pydantic-settings | CORS `*`, no auth, no ORM |
| Geocoding | Nominatim (OSM) | called **from the browser** (no User-Agent — audit #16 open) |
| Land use / POIs | OpenStreetMap Overpass (server-side, httpx) | deterministic offline fallbacks, `source: "osm" | "fallback"` labels |
| Live weather | Open-Meteo (free) | called **from the browser** — wind, RH, heatwave forecast for the Design Studio + PMV |
| Knowledge DB | Supabase (Postgres + PostGIS) — **optional, not required** | falls back to bundled `backend/app/data/seed.py` |
| LLM | **None wired, deliberately** | assistant is a deterministic in-browser engine; Gemini key field exists in config only |
| Deploy | **One** Vercel project: static frontend + Python serverless backend | `vercel.json` rewrites `/api/:path*` → `/api/index` (Mangum fallback in `api/index.py`) |
| Tests | pytest (backend, 172) + vitest (frontend, 35) | CI config parked at `docs/ci-workflow.yml` (GitHub App lacks `workflows` scope) |

---

## 4. Backend — complete map

### 4.1 Entrypoints

- `backend/app/main.py` — FastAPI app (title 0.8.0), CORS `*`, mounts six routers:
  `heat`, `fortyguard` (two routers: `/api/heat` + `/api/fortyguard`), `analysis`, `planner`, `ai`, `cities`.
- `backend/app/config.py` — pydantic-settings from `backend/.env`: `fortyguard_api_key`,
  `gemini_api_key` (unused), Supabase trio, `knowledge_provider` (auto/supabase/seed),
  `heat_provider` (auto/real/mock). `use_mock_heat` is auto-true when no key.
- `api/index.py` — Vercel serverless shim: adds `backend/` to `sys.path`, exports the ASGI `app`,
  builds a Mangum `handler` fallback.
- `backend/app/data/california_temps.json` — **imported by nothing.** Dead file.

### 4.2 Endpoints (all verified live this session)

| Method | Path | Purpose | Status |
|---|---|---|---|
| GET | `/`, `/api/health` | liveness; `heat_provider: mock | real` | ✅ 200 |
| GET | `/api/heat/point?lat&lng` | single-point reading (mock or real slot) | ✅ 200 |
| GET | `/api/heat/grid?lat&lng&span_deg&steps` | NxN grid for the overlay — returns **`points`** (client tolerates `cells ?? points`) | ✅ 200 |
| GET | `/api/heat/area?west&south&east&north&granularity&date&wait_s` | submit/reuse a **real** FortyGuard task; 202 + `poll_url`; 503 when no key | ✅ (503 without key = by design) |
| GET | `/api/heat/job/{activity_id}` | poll a task — **stateless on purpose** (Vercel multi-instance) | ✅ |
| GET | `/api/fortyguard/selfcheck?live=0|1` | is the key set/working; **never echoes the key** (reports only set/length); `live=1` costs one credit | ✅ 200 |
| GET | `/api/analysis/spot` | heat + land classification + one-line summary | ✅ 200 |
| GET | `/api/analysis/pattern` | 8-pattern classifier (building_heat, road_heat_trap, …) | ✅ 200 |
| GET | `/api/analysis/surface` | temperature raster + hotspots/coolspots + 8 temporal recursions | ✅ 200 |
| GET | `/api/analysis/simulation_3d` | "digital twin": buildings/roads/vegetation/hospitals + 5 targeted interventions | ✅ 200 |
| POST | `/api/analysis/train` | one simulated training cycle | ✅ 200 |
| GET | `/api/analysis/model` | heuristic weights + simulated accuracy | ✅ 200 |
| GET | `/api/analysis/pois` | **does not exist** → 404; `getNearbyPOIs()` in `api.ts` has zero callers | ⚠️ known |
| GET | `/api/planner/plan?lat&lng&change_level` | **0..4 now** (0/4 added 2026-08-28; 5/−1 → 422). Returns `scale`, `pattern`, `pattern_label`, `heat_severity_pct`, `interventions[]`, `note` at level 0 | ✅ 200 |
| GET | `/api/planner/health` | liveness + 5 level labels | ✅ 200 |
| POST | `/api/ai/ask` `{question}` | grounded assistant, 5 intents — **emergency 500 is fixed** (verified: "call 911 hospital" → 200) | ✅ 200 |
| GET | `/api/ai/status`, `/api/ai/knowledge`, `/api/ai/browse?category` | knowledge stats / index / browse (Supabase-aware) | ✅ 200 |
| GET | `/api/cities/search?q`, `/api/cities/regions`, `/api/cities/climate?lat&lng&scenario` | 16 CA cities + 4 warming scenarios | ✅ 200 |

### 4.3 Services — what each really does

**`heat_provider.py`** — single `get_temperature(lat,lng) -> HeatReading` interface.
`RISK_THRESHOLDS`: ≤70 comfortable · ≤80 moderate · ≤90 high · ≤100 very_high · >100 extreme.
`MockHeatProvider` = 95 °F ± 10 °F from a coordinate hash — **no latitude/elevation/season input**
(SF and Death Valley both read 85–105 °F; honest via `source: "mock"` + UI badges, but not a climate
model). `build_provider(use_mock=False)` returns a `FortyGuardClient` — which has no per-point
method (see below).

**`fortyguard_client.py` (660 lines) — now REAL, not a stub.** Built 2026-08-28 against the
verified vendor contract (`docs/fortyguard-api.md`): base `https://api.fortyguard.com/v1`,
auth header **`api-key:`** (not Bearer), async `POST /v1/heatmap` → `activity_id` → poll
`GET /v1/status/{id}` → `data.result` (GeoJSON tiles + stats), **°C**. Submits for `heatmap`,
`env_params` (humidity/heat-index/AQI — the audit #14 humidity source), `heat_intelligence`
(Premium-only PDF). Pre-flight validation: US-only bbox, plan area caps (10/50 mi²),
granularity ∈ {60,80,100}, dates 2019-01-01 → now+12h. Exception taxonomy maps 401/403/404/429/5xx
to distinct error classes; **404 on status is normalised to Processing**; Failed is terminal +
not-billed; timeout carries the `activity_id` so the task stays recoverable; `null`/`-999` stay
`None`, never 0. `HeatmapResult` parses tiles with a tolerant `_extract_temperature_c()` —
**ASSUMPTION A: the tile's temperature property key is still unconfirmed by the docs** (a live
response's `tile_property_keys` field will reveal it). 58 unit tests, all against an injected fake
transport — no key, no network. **Deliberately has no `get_temperature()`** so the old 576-calls-per-page
disaster is structurally impossible (a test asserts its absence).

**`heatmap_service.py` (layer B)** — bridges the async API to a page load. `submit()` starts one
task per bounding box (cached by (bbox, date, granularity), 15-min TTL, quantised to ~11 m);
`poll()` proxies the status endpoint and, when Completed, converts °C→°F, skips null tiles, and
returns the **same `points` shape** `/api/heat/grid` produces — the frontend needs no new wire
format. **Stateless poll = the key design decision**: on Vercel submit and polls land on different
instances, so nothing may depend on in-process memory; the cache is an optimisation only.

**`landuse.py`** — `classify_spot()` queries Overpass (`nwr(around:70)`), classifies tags into
building/road/water/waterway/green/farmland/amenity/other, and falls back to
`classify_heuristic()` (same coordinate hash) on any failure. `source: "osm" | "fallback"` so the UI
can say "land: estimated".

**`heat_surface.py` (455 lines)** — the "temperature raster behind the screen". Per cell: mock
reading + three 2D sine waves + an urban-heat-island centre term (up to ~3 °F) + optional
diurnal/seasonal offset; land from the **offline heuristic** (fast). Gaussian smoothing (5×5,
σ1.5) → local-max/min peaks → greedy clustering → hot/cool zones, each with a pattern key +
plain-language explanation. When hour & month are both `None` it **recurses 8 extra times**
(4 diurnal + 4 seasonal at half resolution) to build `temporal`. Known smells: `build_provider()`
is called **inside the per-cell double loop** (~400 constructions — harmless with the mock,
expensive with a real HTTP client; audit #20), and its local `_RISK_TABLE` still has no
"comfortable" tier (the xfail test documents the disagreement with `heat_provider.RISK_THRESHOLDS`
below 80 °F).

**`city_simulation.py`** — wraps `compute_surface(resolution=20)`, splits cells into buildings
(deterministic `height_m` 5–20 m from a coordinate hash — **not real, not labelled**), roads
(`access_weight = 1/dist to nearest hospital`, raw degree-Pythagoras instead of haversine),
vegetation; emits up to 5 interventions (tree/water alternating) at the 5 hottest building cells
with hard-coded 4.5/2.0 °F projections. **"3D" is a misnomer** — a 2D raster with a height
attribute; nothing renders a 3D mesh.

**`trainer.py`** — a simulation, not ML: walks the 16 bundled CA city archetypes, nudges 5 global
`HEURISTIC_MODEL` weights by region, bumps a pseudo-accuracy `min(0.98, +random(0.02–0.05))`.
Module-level globals persist for process life; **nothing consumes the weights**. (Its log line says
"15 California archetypes" — it's 16; cosmetic.)

**`accessibility.py`** — Overpass POI finder (hospital/school/market/transit/fire/police/pharmacy,
20 elements). Offline fallback **invent 1–4 nearby fake POIs with no "estimated" label** (honesty
gap §8).

**`cities.py`** — 16 California cities (name/region/climate/base temp) + 4 warming scenarios
(current, mild +2.7 °F, moderate +5.4 °F, extreme +9.0 °F).

**`planner.py` (526 lines) — the centrepiece, now data-driven-ish.** `build_plan()`:
1. heat + `classify_spot()` → temp, risk, land kind.
2. `_heat_score()` stepped (≤85→0.2, ≤95→0.5, ≤105→0.8, else 1.0).
3. `land_boost` (farmland .3 / building .2 / green .1 / water .0 / default .1).
4. `level_bonus` (0, 0, .15, .3, .45).
5. `_compute_context()` — real spatial context: hotspot/coolspot counts from `compute_surface`,
   nearest-hospital distance (haversine), equity score (schools+transit+hospitals ≤800 m, ÷6,
   cap 1), protective score (fraction of cells ≥100 °F).
6. `_context_bonus()` — additive, capped at 0.6.
7. `_candidates_for(kind, level)` — templates; **level 0 returns empty by definition**; level 2
   adds roof/orientation retrofits; level 3 adds re-plan; **level 4 prepends five masterplan items**
   (green network, street-grid reorientation, rezoning, district cooling, night wind corridors),
   each labelled vision-layer. Context-driven candidates (hospital access ≤300 m, coolspot
   protection, equity priority, protective cooling) are prepended when their thresholds trip.
8. Score = base + ctx_bonus − index×0.05; sort desc; renumber ranks.

Every response carries a **`scale` block** (`label`, `touches`, `changes_city`, `note`) — the
"rebuild is never presented as small" mechanism — plus `pattern`/`pattern_label`/
`heat_severity_pct` so the plan explains itself. `analyze_pattern()` is the standalone
single-point classifier. **Still missing:** wind + humidity factors (explicitly deferred to the
real `env_params` integration), real coordinates (`where` is a string "…area near (lat, lng)").

**`assistant.py` + `knowledge.py` + `data/seed.py`** — the backend grounded assistant.
`detect_intent()`: emergency/first_aid/plan checked first, then definition prefixes → encyclopedia,
then buildings, default encyclopedia. `knowledge._rows(table, fallback)` reads Supabase when
configured+reachable else the bundled seed (5 health conditions, 2 emergency contacts — 911/211
only, city hotlines are verify-later placeholders, 12 encyclopedia entries, 6 building designs,
5 cities). Token matching with 4-char stem tolerance. **The emergency 500 is fixed**:
`get_emergency_contacts` was restored with a regression test and now tolerates both the seed shape
(`city` name/null) and the schema shape (`city_id`). Note: the **live UI assistant does not call
this at all** (it's the in-browser engine) — this path is only reachable via the unused legacy
`AssistantScreen.tsx`.

### 4.4 Tests (backend: 172 passed, 1 xfailed)

- `test_fortyguard_client.py` (571 lines) — 58 tests: header shape, 404→Processing, Failed
  terminal/not-billed, timeout recovers the id, null≠0, −999→None, area caps, US-only, date bounds,
  °C vs °F per endpoint, Basic's 3-parameter cap, `get_temperature` absence.
- `test_heatmap_service.py` (382) — C→F, cache hit/miss/expiry, stateless poll, null-tile skip,
  not-billed note, selfcheck never leaks the key.
- `test_contract.py` — **parses `frontend/src/api.ts` interfaces and asserts the live JSON carries
  every declared field** (api.ts is the single source of truth); guards that
  `/api/analysis/pois` stays absent.
- `test_planner.py` — all 5 levels 200, level 0 = zero interventions, masterplan keys only at L4,
  `scale` always present + honest, contiguous ranks, out-of-range 422.
- `test_assistant.py` — emergency-500 regression, intent routing, honest miss handling.
- `test_heat.py` — risk boundaries, determinism, surface invariants, + the xfail for the dual
  risk-table divergence.

---

## 5. Frontend — complete map

### 5.1 Information architecture (user-approved; don't restructure casually)

Bottom nav = exactly five (`nav.ts`): **Home | Map | Assistant | Database | Settings**
(lucide icons). `View` is a 13-value union; the rest are drilled into: `planner`, `tools`,
`architectural_designs`, `design_studio`, `heat_surface`, `city_simulation`, `training`, `emergency`.

`DatabaseScreen` is a pure hub with three folders:
- **Knowledge Set** → `architectural_designs` (the ported Patch1.0v catalogue + offline advisor)
- **City Planner** → `PlannerStartModal` → Design Studio (or the classic ranked-list `PlannerScreen`)
- **Tools** → `tools` (3 folders: Architecture / Agriculture / First Aid — **all still empty
  placeholders**)

### 5.2 State ownership

`App.tsx` (376 lines) is the single owner of everything: `view`, `center`/`title`, `picked`,
`reading`, `land`, `heatData` + **`heatSource: "mock"|"fortyguard"`**, `units`, `changeLevel`,
`plan`, `status`, the planner-launch flow (`plannerModal`/`plannerPicking`/`studioSpot`/`studioScope`),
`webSearchEnabled` (`localStorage["hitr.google-search"]`). Two monotonic counter refs
(`clickCounterRef`, `planCounterRef`) guard against out-of-order async responses — **do not remove**
(audit #1/#2 regressions came from this).

The heat grid loads **two-phase**: mock `loadHeatGrid()` (24×24, one call per cell — free because
synthetic) paints instantly; `loadRealHeatGrid()` submits **one** FortyGuard task for the area and
swaps in real tiles when they land (never blocks the screen; any failure leaves the mock up).
Default: Los Angeles (34.0522, −118.2437). `zoom` is a `useState(12)` that is **never updated**
(cosmetic; the map's `flyTo` uses the initial zoom).

### 5.3 The three main flows

**A. Map flow** — `HomeScreen → MapScreen`. `MapView` = OSM raster + **fill-polygon tile grid**
(FortyGuard style; fades in 0→0.55), orange pin on the picked spot (moves/removes with state),
shift+drag box selection that filters the heat layer. `TopBar` = title + Nominatim search + °F/°C.
`BottomBar` = spot temp in risk colour, risk pill, coordinates, and the honesty line
**`spot: mock · overlay: mock|FortyGuard`** + `land: estimated` when the fallback ran.
`HeatMapFAB` = Plan / Assistant / SOS / Database. `AlertBanner` fires at ≥90 °F (amber → red →
dark-red at 100/110). Map hint is a two-state chip distinguishing **spot** (tap) from **area**
(shift+drag) with a Clear action.

**B. Design Studio (the flagship)** — `Database → City Planner` opens `PlannerStartModal`
(pick place — or "Select on map" which drops a picking pill on the map — then pick a scope:
`spot/block/district/city/farm`, each carrying a change-level badge L1–L4) → **Launch Design
Studio**.

`DesignStudioScreen` (771 lines) — premium dark Esri basemap (base+reference layers, maxzoom 16
capped to match Esri's z16 limit) that:
- loads a 20×20 heat grid (two-phase, same as the map), the digital twin
  (`/api/analysis/simulation_3d`), and **live Open-Meteo weather from the browser**
- toggleable layers: heat tiles, animated **wind streaks** (canvas, driven by real wind
  vector/speed), structures (circle radius from building height), existing green, backend-suggested
  tree/water points, and **client-side auto water-station placement** (hottest-first, ≥120 m
  spacing — `uhiFactors.suggestWaterStations`)
- **design mode**: pick a tool (tree cluster / water station / cool roofs / community garden), tap
  to place (teal halos + dots), toggle **After design** for the simulated cooler map
- impact card: avg/peak before→after °F, average °C drop, **PMV/PPD "feels" chip** (real Fanger
  from live weather), undo/clear; footer discloses "Effects calibrated from peer-reviewed studies
  (Lee & Kim 2022; Ancona 2016) · docs/research"
- heatwave banner from the official definitions (3×≥35 °C or 3-day mean ≥28 °C + nights ≥21 °C),
  with the ">33 °C: design alone stops working — prioritize shade, water & refuges" message
- **labels data honestly**: `heat: mock model (FortyGuard slot)` until real tiles swap in (then
  green "FortyGuard")

**C. Assistant** — the `assistant` view is `CentralAssistantScreen` (130 lines), **entirely
in-browser**: Patch1.0v's `offlineAiEngine` + `medicalKnowledge`, zero network, zero cost.
Receives `picked`/`reading`/`land`/`plan` as context props from `App.tsx`. **Medical triage is
evaluated first** (a symptom regex → `getMedicalTriage`, defaulting to the heat-exhaustion protocol)
so a health question can never fall through to a building recommendation. Red California heat
warning only for `very_high`/`extreme` risk. Consent-gated Google search (opens `google.com/search`
only after the user taps "Yes, search Google"; on when `hitr.google-search` is on). The legacy
API-backed `AssistantScreen.tsx` still exists in source but is **imported by nothing** (dead code,
kept for recoverability per house rules).

### 5.4 `frontend/src/planner/uhiFactors.ts` — the research engine (388 lines, 31 tests)

Pure TS, no React/network. Constants attributed to three papers (cited as
`docs/research/PAPER-1..3 + SYNTHESIS.md` — **those files are not in the repo**; deliberately left
untracked, so the citations are currently unverifiable from the repo alone):
- Oke canyon law `Δt = 7.45 + 3.97·ln(H/w)` + sky-view-factor proxy
- full **Fanger PMV/PPD (ISO 7730)** with a 0.25-damped fixed-point iteration (raw iteration
  diverges for light summer clothing — the damping is load-bearing and tested)
- official heatwave definitions (3×≥35 °C; or 3-day mean ≥28 °C + all nights ≥21 °C)
- `PLACEMENT_META` per-kind centre drop + radius + stacking caps (trees −0.8 °C/100 m/cap 2.0,
  water −0.35/40/0.6, cool roof −0.6/60/1.2, garden −1.0/100/1.5), linear distance decay,
  **−3.5 °C total cap** (deliberately conservative)
- greedy hottest-first water-station placement with ≥120 m spacing
- Note: humidity here comes from **real** Open-Meteo (the old faked `adjustForHumidity` is gone in
  the studio); the **backend planner** still has no wind/humidity factors.

### 5.5 `frontend/src/features/architectural-designs/` — the Patch1.0v port (~7,300 lines)

Isolated feature-level port of the separate `Patch1.0v` app (never merged wholesale — that would
have wiped the HITR app): **100 cooling designs** (`designs-part1/2/3.ts` = 35+35+30, aggregated in
`designs.ts`), `categories.ts`, `medicalKnowledge.ts` (6 clinically-grounded heat protocols with
symptoms/actions/contraindications/EMS thresholds), `offlineAiEngine.ts` (deterministic
keyword-matching retrieval: medical-first, then design/architecture/building-physics/DIY/climate
answers + a 3-phase household cooling plan), plus 11 UI components (catalogue, filters, matrix,
compare, detail modal, saved-projects drawer, house-anatomy hotspots, cooling planner, AI advisor,
navbar) and the `ArchitecturalDesigns` controller. Client-side only; no network calls.
**12 files carry `// @ts-nocheck`** — a deliberate, documented decision so unmodified Patch1.0v
presentation code compiles under `noUnusedLocals`; data + type files remain type-checked.
Removing `@ts-nocheck` is a file-by-file cleanup, not a rewrite.

### 5.6 Wired but dormant

- `frontend/src/planner/draftHistory.ts` (84 lines) — clean immutable draft-revision model
  (base plan + parent-linked revisions + undo + child-branch lookup). **Zero importers.** The
  designed foundation for planner add/remove/undo; deliberately landed as data-model only. House
  rule: must never claim to modify real city infrastructure.
- `getNearbyPOIs()` in `api.ts` — points at the non-existent `/api/analysis/pois`; zero callers.

---

## 6. The heat pipeline — mock vs real (the project's core honesty story)

```
Browser                              Backend                                FortyGuard
─────────                            ───────                                ──────────
MapScreen / DesignStudio   ──1──►  /api/heat/grid (mock, per-cell)  ──no key──►  n/a   (free, instant)
        │  paints mock tiles immediately
        └──────────────────────────2──► /api/heat/area (submit ONE task for the bbox) ──► POST /v1/heatmap
                          3◄── /api/heat/job/{id} (poll, stateless) ◄── GET /v1/status/{id}
        real tiles swap in when ready; UI badge flips mock → FortyGuard (green)
```

- **No key configured** (current state, verified via `/api/fortyguard/selfcheck` → `configured: false`):
  everything runs on the mock, and every surface that could mislead is labelled
  (`source: "mock"`, `overlay: mock`, `land: estimated`).
- **Key configured**: the app upgrades itself per-area — one billed task per view, cached
  (bbox, date, granularity), null tiles skipped, °C→°F. The `env_params` endpoint (humidity, heat
  index) is ready client-side but **not yet called anywhere** — that's the audit #14 humidity fix.
- Remaining unknown: **ASSUMPTION A** — the tile's temperature property key. The poll response
  reports `tile_property_keys`; one live `?live=1` selfcheck resolves it and the guesswork in
  `_extract_temperature_c()` should then be deleted.

---

## 7. Honesty audit — real vs simulated (verified against code)

| Surface | Real? | Where the label comes from |
|---|---|---|
| Temperature | ❌ **mock** unless `FORTYGUARD_API_KEY` set (then: one real task per area) | `source` field; BottomBar `overlay:` line; Studio header |
| Land use | ✅ real when Overpass reachable, else deterministic guess | `source: "osm"\|"fallback"` → `land: estimated` |
| POIs (hospitals etc.) | ✅ real when reachable, else **invented nearby — no label surfaces this** | ⚠️ honesty gap |
| Hotspots/coolspots, "3D twin" | ⚠️ computed from mock temps + synthetic waves; 2D raster with a fake height attribute | not labelled |
| Building heights | ❌ deterministic from coordinates | not labelled |
| Wind / humidity / heatwave / PMV | ✅ **real** — Open-Meteo live, from the browser | attributed in the studio UI |
| Cooling estimates | ⚠️ literature-calibrated, distance-decayed, capped −3.5 °C | cited in `uhiFactors.ts` + studio footer |
| Trainer "accuracy" | ❌ `random.uniform(0.02, 0.05)` per cycle | labelled "simulated / not a remote AI model" in-screen |
| Emergency numbers | ✅ 911/211 only (real); city hotlines = verify-later placeholders | documented in `db/README.md`, `02_emergency.sql` |
| Medical content | ⚠️ general first-aid/safety guidance with 911 escalation + CA-only disclaimers | `seed.py`, `medicalKnowledge.ts`, assistant UI |
| Version reported by `GET /` | ❌ "0.2.0" (real: 0.8.0) | version drift (audit #26) |

**Net:** the app is honest wherever a human wrote a label. Remaining gaps: (a) POI fallback fakes
hospitals with no "estimated" badge; (b) building heights unlabelled; (c) `GET /` version.

---

## 8. What the previous understanding doc got stale on (it was written before v0.8.0's fixes landed)

Fixed since `docs/CODEBASE_UNDERSTANDING_2026-08-28.md`:

- 🔴 **Emergency-intent 500** — fixed (`get_emergency_contacts` restored + regression test; verified 200).
- 🟠 **Levels 0/4 → 422** — fixed (router `ge=0 le=4`; planner level-0 = observe-only, level-4 = five
  masterplan interventions; verified 200 at L0–L4, 422 at 5/−1).
- 🟠 **`Plan` type drift** — fixed (`api.ts` now declares `scale`, `pattern`, `pattern_label`,
  `temp_c`, `heat_severity_pct`, `note?`; contract test enforces it against live responses).
- **`fortyguard_client.py` was "a stub"** — it is now the real verified client (58 tests).
- **Layer B+C exist**: `/api/heat/area`, `/api/heat/job/{id}`, `/api/fortyguard/selfcheck`,
  `realHeat.ts` with two-phase swap-in on both map screens.
- **Theme toggle inert** — fixed (`darkMode: "class"` + light/dark pairs across the Knowledge Set's
  11 files; 40 `.dark` rules verified in the build).
- **PlannerScreen was a bare list** — it now renders the scale card (hard-hat treatment when
  `changes_city`), pattern/temp/severity strip, `where` per intervention, and the level-0 empty state.
- Design Studio basemap: **Esri World_Dark_Gray** (the CARTO/Esri divergence with old main is
  moot — everything is one tree now).
- Emoji → lucide icons across the app (35 replaced).

**Still open (re-triaged, verified this session):**

1. **ASSUMPTION A** — run one live heatmap request (`/api/fortyguard/selfcheck?live=1`), read the
   `tile_property_keys`, delete the guessing in `_extract_temperature_c()`. (Blocked on the key.)
2. **Wind + humidity in the planner** — `submit_env_params()` is ready; wire `relative_humidity_percent`
   + `apparent_temperature_celsius` into `_compute_context()` (audit #14 remainder). (Blocked on the key.)
3. **Label the POI fallback** "estimated" in the UI, matching land use (§7 gap a).
4. **`/api/analysis/pois`** — add the endpoint or delete `getNearbyPOIs()` (contract test currently
   guards that it stays absent).
5. **Two risk tables** — `heat_surface._RISK_TABLE` has no "comfortable" tier (xfail documents it).
6. **Hoist `build_provider()`** out of `compute_surface`'s per-cell loop (audit #20) — and consider
   the 8 temporal recursions per `/api/analysis/surface` call.
7. **`draftHistory.ts` → real planner edit flow** (template → draft → review/apply; never claims to
   modify real infrastructure).
8. **Docs drift** — `README.md` still says "Status: Planning phase"; `docs/product.md` still names
   the deleted `PlannerPanel`/`AiPanel` and calls build order items "Done" with old names;
   `docs/architecture.md` lists Framer Motion (not installed) + Supabase/PostGIS + Gemini as core
   (none are); `docs/algorithm.md` wind/humidity are flagged ⚠ (accurate but stale-ish);
   `uhiFactors.ts` + the studio footer cite `docs/research/` which **does not exist in the repo**.
9. **Dead code** — `AssistantScreen.tsx` (unimported), `california_temps.json` (unimported),
   `AiAnswer` type + `getFortyGuardStatus()` (the latter has no UI caller yet), empty Tools folders.
10. **`GET /` version "0.2.0"** (audit #26); trainer log says "15 archetypes" (it's 16).
11. **Bundle 1.38 MB** — code-split the Patch1.0v feature (lazy `import()`), and optionally drop
    `@ts-nocheck` file-by-file.
12. **Nominatim from the browser without User-Agent** (audit #16) — browsers can't set it; a tiny
    server-side proxy would fix it.
13. **CI is parked** — `docs/ci-workflow.yml` needs the GitHub App's `workflows` scope to move back
    to `.github/workflows/`.
14. **Mock provider has no climate model** — every city reads 85–105 °F. Not a defect per se (it's
    labelled), but the biggest reason a demo judge could feel the "real" gap once the key is in.

---

## 9. Working rules the user has stated (from the handoff — respect these)

1. **Don't commit unless told to.** No commit is approved by default.
2. **Don't change anything without asking.** Small, isolated, additive changes only — extend, never
   rewrite or delete working code.
3. **Implement 3 things at a time**, not ten.
4. **Document everything** — `CHANGELOG.md` per change; keep `AGENT_HANDOFF.md` current.
5. **California only** for now; keep US-specific emergency disclaimers.
6. **$0 budget** — never introduce a paid service or require a credit card.
7. **No force-push, no `git reset --hard`** without explicit go-ahead.
8. **Never put a key in `frontend/`** — or in chat, commits, screenshots.
9. At the end of a turn, offer the **merge PR link** and the **deployed app link**.
10. User is on a phone ~95% of the time; occasional laptop.

---

## 10. Where I think the project stands (my read, for the "how to move forward" talk)

- **The app is in its strongest shape yet**: clean tree, 172+35 tests green, real vendor contract
  implemented and proven offline, honest labels on every major surface, a flagship Design Studio
  that genuinely differentiates (tap-to-place with capped, cited cooling estimates + PMV).
- **The single biggest unlock is the FortyGuard key.** With it: real heat on the map, one live
  `selfcheck?live=1` run resolves ASSUMPTION A, and `env_params` closes the planner's humidity
  gap — the last two "blocked" items in §8 are both behind that one variable.
- **Everything else is unblocked polish/correctness**: POI-fallback labels, the two risk tables,
  provider-construction hoist, `pois` endpoint decision, docs drift, dead code, bundle split,
  `GET /` version. Each is small; a triplet per commit fits the house rules.
- **The user's defining ask — "real pattern recognition" — is now ~60–70% honest:** the planner is
  data-driven on hotspots/coolspots/hospitals/equity (audit #14 partially closed in v0.6.5, extended
  in v0.8.0), but its inputs are mock temperatures until the key lands, and wind/humidity are still
  missing. The trainer remains a labeled simulation.
- **The natural next conversation** is probably: (a) key + live validation, (b) which triplet to do
  next from §8, (c) whether to finally surface `draftHistory.ts` as the planner-edit feature, and
  (d) pre-judging polish (bundle, docs, CI) vs feature work.

---

*End of document. No repository files were modified except the creation of this one; nothing was committed.*
