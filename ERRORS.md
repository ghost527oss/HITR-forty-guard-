# HITR — Code error notes

Reviewed against the product goals in `PLAN.md`, `docs/algorithm.md`, `docs/ai.md`, `docs/product.md`, and `docs/vision.md`.

Verified: Python files compile; `tsc --noEmit` is clean; assistant + planner run on the seed data. TypeScript does **not** catch the API-shape bugs below.

---

## Goals (from the docs)

HITR should turn a heat map into a **ranked, location-specific action plan** for any city:

1. Change is a scale. Light/Medium keep the existing city and add interventions.
   **Full re-plan (“hard”)** *is* allowed to redesign / lay out the city from scratch
   (still keeping hospitals, schools, and markets reachable).
2. Heat is one livability factor, not the only one (accessibility, equity, productivity).
3. The program does the analysis; AI is a bounded, grounded assistant.
4. Works for **any city** the user picks.
5. Versioned and documented.

---

## P0 — Breaks a core user flow

### 1. Searching a city does not move the map
**Files:** `frontend/src/components/MapView.tsx`, `frontend/src/App.tsx`

The map is created once with an empty-deps `useEffect` (`[]`). When Settings / the top-bar search updates `center`, App reloads the heat grid, but MapView never calls `setCenter` / `flyTo`.

The map stays on Los Angeles. That breaks the non-negotiable **any-city** principle.

### 2. Heat dots can be dropped on first load (race)
**File:** `frontend/src/components/MapView.tsx`

The overlay effect does `map.addSource` / `map.addLayer` as soon as `heatData` arrives. It does not wait for MapLibre’s `load` event. If the grid returns before the style is ready, `addSource` throws and the overlay never appears.

### 3. Knowledge-stats badge shows `NaN topics`
**Files:** `frontend/src/api.ts`, `frontend/src/screens/AssistantScreen.tsx`, `frontend/src/components/AiPanel.tsx`

`getKnowledgeStats()` GETs `/api/ai/status` and types the body as `KnowledgeStats`. The real payload is:

```json
{ "status": "ai-ready", "scope": "...", "provider": "...", "knowledge": { "health_conditions": 5, ... } }
```

The UI does `stats.health_conditions + stats.encyclopedia + stats.buildings` → `undefined + undefined + undefined` → **`NaN topics`**.

Should unwrap `.knowledge`, or call `/api/ai/knowledge` and use `.stats`.

### 4. `HEAT_PROVIDER=real` 500s every heat / analysis / planner call
**Files:** `backend/app/services/fortyguard_client.py`, `RUNNING.md`

`RUNNING.md` says: set `FORTYGUARD_API_KEY` and `HEAT_PROVIDER=real`. The client then raises `NotImplementedError` (or `RuntimeError` if the key is empty). There is no fallback once `use_mock_heat` is false.

FortyGuard live data is also listed as a judging item (`docs/judging.md`) and is still a stub.

### 5. Vercel deploy cannot reach the API
**File:** `vercel.json`

```json
"destination": "https://your-backend.vercel.app/api/:path*"
```

Placeholder host. Only the frontend is built (`outputDirectory: frontend/dist`). FastAPI is not deployed. Production `/api/*` is dead.

---

## P1 — Wrong answers or silent failures

### 6. Leftover `askAi()` calls a GET that does not exist
**Files:** `frontend/src/api.ts`, `docs/ai.md`

```ts
export function askAi(q: string): Promise<AiAnswer> {
  return get<AiAnswer>(`/api/ai/ask?q=${encodeURIComponent(q)}`);
}
```

Backend only has **`POST /api/ai/ask`** with `{ question }`. Docs still say `GET /api/ai/ask?q=`. Unused today (`askAssistant` is the live path) but will 405 if anything calls it.

### 7. City search / geocode / heat-grid errors are unhandled
**File:** `frontend/src/App.tsx`

- `handleSearch` → `geocode()` has no try/catch (Nominatim down = unhandled rejection).
- `handlePick` / `handleGeneratePlan` have `try/finally` and **no `catch`**.
- `loadHeatGrid(...).then(...)` has no `.catch()`.

Failed analysis leaves an empty bottom bar; failed plan generation looks like a no-op.

### 8. Home “current temperature” is always `—` (and always °F)
**Files:** `frontend/src/App.tsx`, `frontend/src/screens/HomeScreen.tsx`

`reading` is only set after a map tap. Home never fetches the default city’s temp. Changelog v0.5.0 says the home screen shows current location + temperature. Units setting is ignored (`${reading.temp_f}°F`).

### 9. `/api/ai/browse` ignores Supabase
**File:** `backend/app/routers/ai.py`

Always reads `knowledge.seed.ENCYCLOPEDIA`. If the live DB has extra/edited entries, browse will not show them. Other knowledge tools go through `_rows()`.

### 10. Emergency contacts: seed schema ≠ Python schema ≠ lookup
**Files:** `db/schema.sql`, `db/seed/02_emergency.sql`, `backend/app/data/seed.py`, `backend/app/services/knowledge.py`

| Layer | City field |
|---|---|
| Postgres | `city_id uuid` FK to `cities` |
| Python seed | `"city": None` (name string) |
| Lookup | `e.get("city")` compared to a city **name** |

With Supabase connected, city-specific hotlines can never match. `_reply_emergency` also only greets with a generic sentence — it never lists the phone numbers it fetched (`data` is returned, the UI never renders it).

### 11. First-aid never admits “I don’t know”
**Files:** `backend/app/services/knowledge.py`, `backend/app/services/assistant.py`

```python
return hits or rows[:2]
# then
cond = hits[0]
```

Unknown first-aid queries still return heat-stroke. If Supabase is configured and `health_conditions` is empty, `hits == []` and `hits[0]` is an **IndexError / 500**.

### 12. Intent routing steals the wrong handler
**File:** `backend/app/services/assistant.py`

Verified:

| Question | Expected | Actual |
|---|---|---|
| “how can I keep my house cooler” | buildings | **plan** (`cooler` is a plan keyword) |
| “what should I do to improve my city” | plan | plan, but only because `what to do` is first-aid *and* `improve` is plan — order happens to win |

`"call"` as an emergency keyword will also fire on “what do you call …”. Plan replies do not read a Layer-3 plan; they tell the user to click the (now-removed) right-side panel.

### 13. Farmland crop-row uses the wrong impact + key
**File:** `backend/app/services/planner.py`

```python
{"what": "Orient crop rows and inter-crop to reduce heat stress",
 "impact": _IMPACTS["trees"],   # "cooler streets: -2 to -4°C under canopy"
 "cost": _COST["trees"],
 "key": "shelter_belt"}         # not a crop-row key
```

Copy-paste. Street-canopy impact on a farm action.

### 14. Planner does not implement the documented algorithm
**Files:** `backend/app/services/planner.py` vs `docs/algorithm.md`

Documented factors: historic + forecast heat, wind, humidity, street orientation, walking distance to hospitals/schools/markets/transit, equity (elderly, low-income, schools, clinics), farm productivity.

Actual score:

```text
heat_bucket(temp_f) + land_boost + level_bonus − index * 0.05
```

No POIs, no wind, no equity. Level 3 is one extra generic sentence. Ranking is insertion order, not impact. Interventions are not drawn on the map.

### 15. Re-running `02_emergency.sql` duplicates 911 / 211
**File:** `db/seed/02_emergency.sql`

`ON CONFLICT (id) DO NOTHING` but `id` is `gen_random_uuid()` and not supplied. Conflict never fires. 01 / 03 / 04 are slug-unique; this one is not.

### 16. Nominatim called with no app identity
**File:** `frontend/src/App.tsx` (`geocode`)

Nominatim usage policy requires a unique User-Agent. Browser `fetch` sends a generic UA and can be throttled/blocked. No error UI when it fails.

---

## P2 — Logic / consistency

### 17. Risk scale has no “low / safe”
**File:** `backend/app/services/heat_provider.py`

`65°F` → `moderate` (green). First bucket is `<= 80 → moderate`. Pleasant weather is labelled as heat risk.

### 18. `_field()` is a no-op duplicate
**File:** `backend/app/services/knowledge.py`

```python
return entry.get(name, entry.get(name, default)) or default
```

Annotated `-> str` but returns lists (symptoms, tags). Works for seed arrays; will explode if a column is a JSON string.

### 19. Supabase client caches a hard failure forever
**File:** `backend/app/services/knowledge.py` (`_supabase`)

First failed import/connect sets `_client = False`. Later recovery never retried without a process restart.

### 20. Heat provider is constructed twice
**Files:** `backend/app/routers/heat.py`, `analysis.py`, `backend/app/services/planner.py`

Heat + analysis cache a module-level provider. Planner’s `landuse_heat()` calls `build_provider()` on **every** plan. Same reading, extra work; if the real client is ever stateful, the two paths can diverge.

### 21. `/api/heat/grid` does not validate lat/lng
**File:** `backend/app/routers/heat.py`

`/point` and `/analysis/spot` use `ge=-90, le=90`. `/grid` does not.

### 22. Settings theme + notifications are dead UI
**File:** `frontend/src/screens/SettingsScreen.tsx`

Local React state only. No `dark` class, no CSS, no persistence, no notification permission. Changelog lists them as shipped features.

### 23. Tools folders are empty shells
**File:** `frontend/src/screens/ToolsScreen.tsx`

Architecture / Farming / First Aid have `FOLDER_CONTENT: []`. Knowledge already exists in the seed/API (`/api/ai/browse`, encyclopedia, buildings, health) and is not wired in.

### 24. No pin on the picked map spot
Tap updates the bottom bar only. Easy to lose the selected coordinate.

### 25. Click handler is captured at map mount
**File:** `frontend/src/components/MapView.tsx`

`onPick` is closed over in the `[]` effect. Safe today because `handlePick` is `useCallback([])`, fragile if that ever changes.

---

## P3 — Docs / version / dead code

### 26. Version drift
- `backend/app/main.py` and `frontend/package.json`: **0.2.0**
- `CHANGELOG.md`: **v0.5.0**
- `README.md` status: **“Planning phase”** (the app is built)

### 27. Docs describe features the code does not have
- `docs/ai.md`: plan-explainer “reads a Layer-3 plan” — `_reply_plan` only points at a side panel that App no longer mounts.
- `docs/architecture.md`: Framer Motion + Gemini function-calling. Neither is in `package.json` / backend.
- `docs/data.md`: “Status: planning.”
- `CHANGELOG` v0.1.0 duplicates the same “Added (follow-up)” block twice.

### 28. Dead frontend
`AiPanel.tsx` and `PlannerPanel.tsx` are unused after the v0.5.0 screen split. `askAi()` is unused. PlannerPanel’s generate button also does not check `hasPicked` (PlannerScreen does).

### 29. Unused import
`backend/app/services/fortyguard_client.py` imports `httpx` but every HTTP call is commented out.

### 30. Typo in `docs/data.md`
`heat-holotline` → heat-hotline.

---

## What is actually solid

- FastAPI layout, CORS, Vite `/api` proxy, `allowedHosts` for preview.
- Mock heat provider is deterministic and enough for a demo without a key.
- Land-use OSM + offline fallback.
- Grounded assistant (no invented medical advice) for the 11 documented happy-path questions.
- Change-level 1/2/3 reshapes the candidate list (3 / 5 / 6 items) as changelog claims.
- Seed SQL 01/03/04 are slug-idempotent; medical copy is clearly labelled as first-aid, not advice.
- Secrets stay in `.env` / `.gitignore`.

---

## Suggested fix order

1. Fly/pan the map when `center` changes; wait for `map.on("load")` before adding heat.
2. Point `getKnowledgeStats()` at the real stats object; drop or fix `askAi()`.
3. Catch geocode / analyze / plan / grid failures and show them.
4. Fetch home-screen temperature for the current city; honour units.
5. Either implement FortyGuard or stop documenting `HEAT_PROVIDER=real`.
6. Align emergency contacts (`city_id` vs `city` name) and print numbers in the reply.
7. Stop first-aid fallback-to-heat-stroke; don’t crash on empty tables.
8. Score the planner with more than `temp + land + level` (even a simple POI/equity heuristic).
9. Replace the Vercel rewrite placeholder; bump versions; fix README status.
