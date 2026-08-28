# Changelog

All notable changes to this project are documented here. Format inspired by
[Keep a Changelog](https://keepachangelog.com/). Versioning: `v0.x` for pre-release planning/build.

## [Unreleased]

### Added — layer C: the frontend now uses real heat when a key exists
Layer B exposed the endpoints; nothing called them. Wired the two biggest consumers.

**Two-phase loading.** The mock paints instantly, then real tiles replace them if (and
only if) a FortyGuard key is configured. Blocking a screen on a task that takes seconds
to minutes would be worse than showing synthetic data first, so the mock is the first
paint and the real grid is an upgrade rather than a prerequisite.

| Screen | Mock path | Real path |
|---|---|---|
| Map | 576 provider calls (24×24) | 1 task for the whole area |
| Design Studio | 400 provider calls | 1 task for the whole area |

**`frontend/src/lib/realHeat.ts`** — `boundsAround()` and `loadRealHeatGrid()`. Kept as a
plain `.ts` module rather than inside `MapView.tsx` so it is testable without dragging
maplibre-gl into a node environment. `submit`/`fetchJob`/`sleep` are all injectable.

It throws `RealHeatUnavailable` (a distinct error class) when the backend answers 503, so
callers can fall back to the mock without treating "no key" as a failure. A task the vendor
reports as Failed, or one that never finishes, is a plain error that leaves the mock on screen.

**`api.ts`** — added `submitHeatArea()`, `getHeatJob()`, `getFortyGuardStatus()`, plus
`Bounds` / `HeatAreaResponse` / `FortyGuardStatus` types.

**Source is now visible.** The map's bottom bar distinguishes the spot reading from the
overlay: `spot: mock · overlay: mock` vs `overlay: FortyGuard` in green. The Design Studio
header does the same. Previously there was no way to tell whether what you were looking at
was real.

**4 tests** in `src/lib/realHeat.test.ts`, all injected — no network, no timers, no key. The
most important asserts that loading a real grid costs **exactly one** area request, which is
the entire point of layers B and C.

Verified live with no key configured: `/api/fortyguard/selfcheck` reports
`configured: false` without leaking anything, and `/api/heat/area` answers 503 with a message
pointing at the mock endpoint — which is what triggers the fallback.

---

### Added — layer B: the FortyGuard heatmap service
The vendor API is async and area-based (submit → `activity_id` → poll). Nothing bridged that to a
page load that wants raster data now, so real data was unreachable and the app ran on the mock.

**`backend/app/services/heatmap_service.py`** — `submit()` starts one task for a bounding box and
returns immediately; `poll()` proxies `GET /v1/status` and, once Completed, returns the parsed tiles
as the same `points` shape `/api/heat/grid` produces, so the frontend needs no new wire format.

    Before   1,600 provider calls to open the Design Studio (one per cell)
    After          1 FortyGuard task per view, cached by (bbox, date, granularity)

**`poll()` is deliberately stateless.** It needs only the activity_id, never in-process memory.
This app deploys to Vercel, where each request may land on a different function instance, so a job
store held in a module global would be lost between submit and first poll and would never resolve.
The in-memory cache is therefore strictly an optimisation: losing it costs one duplicate request,
never a broken page.

Converts FortyGuard's °C tiles to °F (the app speaks °F), skips null tile values rather than
painting them as 0 °F, and reports `tile_property_keys` from each response — the vendor docs never
show a tile's `properties`, so this is how the real temperature field name gets learned from a live
run instead of guessed.

**`backend/app/routers/fortyguard.py`** — three endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/heat/area` | Submit a task for a bounding box; answers 202 + `poll_url`. `?wait_s` polls inline. |
| `GET /api/heat/job/{activity_id}` | Poll one task. Stateless. |
| `GET /api/fortyguard/selfcheck` | Is the key configured, and does it work? `?live=1` submits one real task. |

Vendor errors map to meaningful status codes: validation → 400 (the vendor does not bill these),
401 invalid key, 403 plan lacks the endpoint, 429 rate limited, 504 poll timeout, 502 otherwise.

`selfcheck` never echoes the key — it reports only whether it is set and its length, which is
enough to tell a missing key from a wrong one. This replaces asking anyone to paste a key anywhere.

**`backend/tests/test_heatmap_service.py`** — 34 tests, all against a fake client, so the service is
proven without a key and without network access. They cover the C→F conversion, cache hit/miss/
expiry, stateless polling, null-tile skipping, the not-billed note on Failed tasks, and that
selfcheck never leaks the key.

### Fixed — a FastAPI upgrade silently broke every test that inspects routes
FastAPI 0.141 / Starlette 1.6 changed `include_router` to store `_IncludedRouter` objects instead of
flattening routes, so `route.path` no longer exists and `{getattr(r, "path", None) for r in
app.routes}` returns `{None}`.

That made the `/api/analysis/pois` guard in `test_contract.py` **vacuous** — it was written to fail
loudly when that route appears, and after the upgrade it could never fail. Switched it (and the new
route test) to read `app.openapi()["paths"]`, which reflects what is actually served and is stable
across versions.

### Fixed — the contract test caught real api.ts drift
Adding `note?: string | null` to `Plan` broke `test_plan_matches_Plan_at_every_level` at levels 1–4:
the backend only sends `note` at level 0, where there are no interventions. Marked it optional in
the test. This is the contract test doing its job.

### Changed — Home screen
Removed the "Heat Assistant" and "Tools" quick actions, leaving Heat Map and "How much to change".

---

### Changed — Phase 1b: the planner now explains itself in the UI
The backend has returned `scale`, `pattern_label` and `heat_severity_pct` since v0.8.0, but
**none of them reached the screen** — `Plan` in `api.ts` didn't declare them. A plan rendered as
a bare list of actions with no indication of what it did or how big it was.

- **`api.ts`**: added `PlanScale` and the missing `scale`, `heat_severity_pct` and optional `note`
  fields to `Plan`.
- **`PlannerScreen.tsx`**: added a summary card at the top of every plan showing the **scale**
  (label + "touches …"), an amber hard-hat treatment when `changes_city` is true (levels 3–4)
  versus an eye icon when it is observation/retrofit, the scale's own explanatory note, and a
  three-column diagnosis strip: detected pattern, temperature, heat severity.
- Interventions now show **where** they apply (previously the `where` field was computed by the
  backend and thrown away by the UI), and the list is introduced with an "N actions, highest
  impact first" header so a 12-item masterplan reads as deliberate rather than as noise.

**Fixed — levels 0 and 4 rendered a blank description.** `PlannerScreen` kept its own
`LEVEL_DESC` map that duplicated `CHANGE_LEVELS` but only had entries for 1, 2 and 3, so the
header description was empty at both ends of the range. Deleted the duplicate; the screen now
reads `CHANGE_LEVELS[].desc` directly. Level 0 is also labelled **"Observe"** rather than "None",
matching what the backend returns, and level 4's description now mentions the full masterplan.
`PlanSheet` picks up all of this automatically.

**Level 0 no longer looks broken.** It legitimately returns zero interventions, which rendered as
an empty screen. There is now an explicit "No interventions proposed" empty state that surfaces
the plan's `note`.

### Changed — the map makes area vs. spot explicit
Plans, heat surface and simulation all act on the **picked spot**, while search changes the
**area** being viewed. Nothing distinguished the two, which is the likely root of "location
selection is confusing".

The map's single hint line is now a two-state chip: before picking it reads "Tap the map to
choose a spot · Hold Shift + drag for an area"; after picking it shows the spot's coordinates
with a **Clear** action. Added `onClearPick` to `MapScreen`.

### Fixed — Emergency screen stranded the user
`EmergencyScreen`'s Back button returned to **Tools**, but Tools has no emergency entry and its
First Aid folder is empty, so SOS → Emergency → Back left no way forward. Back now returns to
the **Map**, which is where the SOS button lives.

---

### Changed — Phase 1a: emoji replaced with lucide icons across the UI
Thirty-five emoji were doing the work of icons in app chrome. Emoji render at inconsistent sizes
and weights across platforms and OSes — on a projected screen during judging that reads as
unfinished. All user-facing emoji are now `lucide-react` components (already a dependency, so no
bundle cost).

| Where | Before | After |
|---|---|---|
| Bottom nav | 🏠 🗺️ 🤖 🗂️ ⚙️ | `Home` `Map` `Bot` `Database` `Settings` |
| Home quick actions | 🗺️ 🤖 🌳 🧰 📍 | `Map` `Bot` `Trees` `Wrench` `MapPin` |
| Database folders | 🏛️ 🌳 🧰 | `Landmark` `Trees` `Wrench` |
| Tools folders | 🏛️ 🌾 🩹 | `Landmark` `Wheat` `Bandage` |
| Assistant intent labels | 🆘 🩹 🏠 🗺️ 📚 | `Siren` `Bandage` `Home` `Map` `BookOpen` |
| Map FAB | 🌳 🤖 🆘 🗂️ ·`×`/`+` | `Trees` `Bot` `Siren` `Database` ·`X`/`Plus` |
| Settings | ☀️ 🌙 🚨 | `Sun` `Moon` `TriangleAlert` |
| Close buttons | ✕ | `X` |
| Back buttons (×4 screens) | ← | `ArrowLeft` |
| Design Studio | 🔥 · 🚰 💧 🌳 | `Flame` · inline `droplet`/`trees` SVG |
| AI advisor badges | 🚨 🔥 💡 💧 ⚡ 🛡️ | stripped — the cards already render an icon beside them |

Icon props changed type from `icon: string` to `icon: LucideIcon` in `nav.ts`,
`HomeScreen`, `DatabaseScreen` and `ToolsScreen`.

Improvements that came along with the swap:
- Assistant replies now carry their matched intent as a separate field and render it as an
  **intent badge** above the answer, instead of being prefixed into the message text. Users can
  see *why* they got an answer.
- `⇧ Shift` on the map hint is now a styled `<kbd>` element rather than a bare glyph.
- FAB toggle gained `aria-expanded` and a state-appropriate `aria-label`; close buttons gained
  `aria-label`.

Left as-is deliberately: `→` and `↓` in comments and in before→after temperature readouts
(they're meaning "leads to", not decoration), and the box-drawing `─` in comment banners.

Map popups needed special handling: MapLibre popups take an HTML **string**, so React components
can't render inside them. Added `frontend/src/lib/mapIcons.ts` holding the real lucide v0.546.0
path data for `droplet` and `trees` as static SVG, so the popups match the rest of the app.

### Fixed — the retired principle survived in one more place
`docs/CODEBASE_UNDERSTANDING_2026-08-28.md` still listed "Never rebuild a city from scratch" as
principle #1. Replaced with the **honesty of scale** wording used everywhere else. The Phase 0
sweep had missed this file; `AGENT_HANDOFF.md` was checked and was already clean.

---

## [Unreleased] — FortyGuard API client, built against the real contract

### Added — the real FortyGuard client
The vendor documentation at `https://docs-api.fortyguard.com/docs/` was read and the contract
captured in **`docs/fortyguard-api.md`**. The existing `fortyguard_client.py` was written against a
guessed endpoint; **every one of those guesses was wrong**:

| | Guessed | Actual |
|---|---|---|
| Auth header | `Authorization: Bearer` | **`api-key: <key>`** |
| Temperature endpoint | `POST /v1/heat-intelligence` | **`POST /v1/heatmap`** (area-based) |
| Call shape | synchronous, per lat/lng | **async: submit → `activity_id` → poll `/v1/status/{id}`** |
| Response | a single number | **GeoJSON tile polygons + aggregate statistics** |
| Units | °F | **°C** (`tcm`); hours for `exceedance`/`persistence` |

`/v1/heat_intelligence` is real but is a **Premium-only PDF report**, not a temperature lookup.

Rewrote `backend/app/services/fortyguard_client.py` against the verified contract:
`submit_heatmap()`, `submit_env_params()`, `submit_heat_intelligence()`, `get_status()`,
`wait_for_result()`, `heatmap() -> HeatmapResult`, plus `bbox_polygon()`, `polygon_area_m2()` and
`ring_bbox()` helpers.

Added `backend/tests/test_fortyguard_client.py` — **58 tests** that run against an injected fake
transport, so the client is fully proven **without an API key and without touching the network**.

### Fixed
- **404 from `/v1/status` was mishandled.** The vendor docs warn an activity can be briefly 404
  immediately after submission. The client raised `TransportError` instead of treating it as
  "not ready yet", because the 404 body carries no JSON and blew up before the status check. Added
  `FortyGuardNotFoundError`, raised before any body parsing, and normalised to `Processing` in
  `get_status()`.

### Why the client deliberately has no `get_temperature(lat, lng)`
`HeatProvider.get_temperature()` is synchronous and per-point; the real API is neither. The map view
calls the provider **576 times** per load and the Design Studio **1,600 times**. Against a metered
async API that is 576–1,600 billed tasks per page view. Refusing to offer a per-point synchronous
method makes that mistake impossible rather than merely discouraged; a test asserts its absence.

The flip side is good news: `/v1/heatmap` returns the **whole** grid from one request, so the correct
call volume is **1 per view**, not 1,600. Real data is cheaper than the mock — it just needs a
`(bbox, date, granularity)` cache and a job-status surface in the UI. Both are still to do.

Also relevant: `granularity` must be 60/80/100 m, and **80 m is a near-perfect match** for the grid
we already fake (~78 m per cell). `map_data` returns GeoJSON polygons, which is exactly what
`renderHeatTiles.ts` already draws. And coverage is **US-only**, which vindicates the California-only
demo scope.

### Environmental Parameters closes the humidity gap
`POST /v1/env_params` returns `relative_humidity_percent`, `heat_index_celsius` and
`apparent_temperature_celsius`. That is the real humidity source `uhiFactors.ts` has been faking
(audit #14). There is **no wind parameter** — wind still comes from Open-Meteo.

---

## [v0.8.0] — 2026-08-28 — Phase 0: truth, tests, and a plan that explains itself

### Changed — the "never rebuild a city" principle is retired
The rule was removed from all 7 places that stated it as active policy: `PLAN.md` (principle #1),
`README.md`, `docs/product.md` (Non-goals), `docs/algorithm.md` (design-intent header + "what stays
fixed"), `docs/judging.md` (Innovation differentiator), and the `backend/app/services/planner.py`
module docstring. The three historical `CHANGELOG.md` lines that mention it are left intact — history
is not rewritten.

**Replacement principle:** *interventions come first, and the scale of change is the user's choice.*
The engine defaults to improving the existing city, and can also propose a full masterplan when asked.
The non-negotiable that replaces it is **honesty of scale** — every level must state plainly how much
of the city it touches.

`docs/judging.md` gained a replacement Innovation differentiator: **one change spectrum, not one
answer** (observe → trees → retrofit → re-plan → masterplan), which is a stronger story than "we only
do small things."

### Fixed — `POST /api/ai/ask` returned HTTP 500 for every emergency question
`backend/app/services/knowledge.py` had lost the `def get_emergency_contacts(city):` line, leaving its
docstring and body orphaned *inside* `get_health_condition()` after that function's `return`.
`assistant._reply_emergency()` raised `AttributeError` → 500. It survived undetected because the live
`CentralAssistantScreen` never calls the backend.

Restored the function, and made city matching tolerant of both shapes it can encounter: bundled seed
rows carry a plain `city` name (or null for national numbers) while `db/schema.sql` rows use `city_id`.
National numbers (911, 211) now always survive an unmatched city filter.

Verified: `"emergency"`, `"call 911"`, `"hospital"`, `"ambulance"`, `"helpline"` → **200** (was 500).

### Fixed — change levels 0 and 4 returned HTTP 422 while the UI offered them
`frontend/src/api.ts` has shipped five change levels since v0.5.0, but `routers/planner.py` declared
`Query(1, ge=1, le=3)`. Picking "None" or "Rebuild" produced a user-visible
`Couldn't generate plan: GET … -> 422`.

- `routers/planner.py` → `Query(1, ge=0, le=4)`; `LEVEL_LABELS` extended to all five.
- `planner._candidates_for()` — **level 0 (observe) now returns an empty list by definition**, and
  **level 4 (rebuild) adds five masterplan interventions**: green network, street-grid reorientation,
  rezoning, district cooling, and night wind corridors. Each is explicitly labelled a vision-layer
  proposal.
- Masterplan keys are asserted to appear **only** at level 4.

### Added — a plan that explains itself
Directly addresses the feedback that users could not tell how a change occurred or what the logic was.

- **New `scale` block** on every `/api/planner/plan` response: `label`, `touches`, `changes_city`
  (boolean) and a plain-language `note`. Level 4 now says it touches *"the whole area — streets,
  zoning, utilities"* and marks `changes_city: true`; level 1 says *"surface treatments only"* and
  marks it `false`. A rebuild can no longer be implied to be a small change.
- **`pattern` + `pattern_label` + `heat_severity_pct`** are now returned on a plan. Previously the
  TypeScript `Plan` interface declared `pattern`/`pattern_label`/`temp_c` but the backend sent none of
  them — a silently broken contract. Extracted `_pattern_for(kind, h)` out of `analyze_pattern()` so
  `build_plan()` can attach the same classification.
- Level 0 returns an explicit `note` explaining that no interventions were generated on purpose.

### Added — test suite (80 backend + 31 frontend, was zero)

**`backend/tests/` — pytest**
- `test_contract.py` — **parses `frontend/src/api.ts` and asserts every live response carries the
  fields the TypeScript interface declares.** This makes `api.ts` the single source of truth and kills
  the whole defect class: it would have caught the `points`/`cells` mismatch that broke the heat
  overlay, the missing `Plan` fields, and the `/api/analysis/pois` 404.
- `test_assistant.py` — regression tests for the emergency 500, intent routing across all five
  intents, and honest miss-handling (a first-aid miss must not return heat-stroke guidance).
- `test_planner.py` — all five levels return 200, level 0 produces nothing, masterplan leaks are
  impossible, the `scale` block is always present and honest, ranks are contiguous.
- `test_heat.py` — risk-threshold boundaries, provider determinism, heat-surface determinism and
  invariants. Includes an `xfail(strict=True)` documenting the known divergence between
  `heat_surface._RISK_TABLE` and `heat_provider.RISK_THRESHOLDS` below 80 °F.

**`frontend/src/planner/uhiFactors.test.ts` — vitest (31 tests)**
The research engine was the most valuable untested code in the repo. Covers PMV convergence across
temperature × clothing × wind (the case that diverges without the 0.25 damping factor), PPD bounds and
symmetry, the official heatwave definitions, per-kind and total cooling caps, distance decay,
water-station spacing, and colour-ramp clamping.

**`.github/workflows/ci.yml`** — runs backend pytest + frontend type-check/vitest/build on every push
and PR, so the branch shows green checks.

### Notes
- `pytest` added to `backend/requirements.txt`; `vitest` added to `frontend` devDependencies.
  Neither is deployed — the root `requirements.txt` used by Vercel is unchanged.
- Deliberately **not** touched yet: the `heat_surface` per-cell `build_provider()` construction, the
  bundle size warning, the dark-mode toggle (inert — Tailwind has no `darkMode: 'class'`), and the
  empty Tools folders.

### Verification
- `backend`: **80 passed, 1 xfailed** (`pytest`)
- `frontend`: **31 passed** (`vitest run`), `tsc --noEmit` clean, `npm run build` succeeds
- Live: `/api/planner/plan` L0–L4 → 200 with 0/4/6/7/12 interventions and a correct `scale` block

## [v0.7.2] — 2026-08-27
### Added — One-project Vercel deployment (frontend + backend together)
- **`api/index.py`** — serverless entrypoint exposing the FastAPI app (ASGI export +
  Mangum fallback). No second Vercel project or backend URL needed.
- **`vercel.json`** — `/api/*` now rewrites to the Python function (`/api/index`) instead of the
  old `https://your-backend.vercel.app` placeholder (which pointed nowhere).
- **Root `requirements.txt`** — Python function deps (backend mirror + mangum). Local dev
  unchanged (still `backend/requirements.txt` + uvicorn + Vite proxy).
- Frontend version bumped to 0.7.2.

## [v0.7.1] — 2026-08-27
### Added — API-key security guide (safe FortyGuard key storage)
- **`docs/secrets.md`** — plain-language rules for keeping keys private: key lives only in
  backend env vars (local gitignored `backend/.env` or Vercel Environment Variables), never in
  `frontend/` (public bundle), never `VITE_`-prefixed, never in chat/commits. Includes phone steps
  for Vercel, leak-rotation procedure, and the browser→backend→FortyGuard flow diagram.
- **`backend/.env.example`** — committed template (empty values, safe) for local dev: copy to
  `backend/.env` (gitignored) and fill in. `HEAT_PROVIDER=auto` already switches mock→real when
  the key appears — no code change needed.

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
