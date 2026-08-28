# FortyGuard Temperature API — confirmed contract

Read from <https://docs-api.fortyguard.com/docs/> on **2026-08-28**.
This file is the single source of truth for how this app talks to FortyGuard.
Everything below is from the vendor docs; anything not confirmed is marked
**ASSUMPTION**.

---

## 1. The four contract lines

| | |
|---|---|
| **Base URL** | `https://api.fortyguard.com/v1` |
| **Auth** | HTTP header `api-key: <YOUR_KEY>` — **not** `Authorization: Bearer` |
| **Pattern** | Async: `POST` a task → get `activity_id` → `GET /v1/status/{id}` → poll → result |
| **Result location** | `data.result` of the *status* response, once `data.status == "Completed"` |

---

## 2. Endpoints

| Endpoint | Method | Path | Plan | Gives us |
|---|---|---|---|---|
| Create Heatmap | POST | `/v1/heatmap` | Basic + Premium | GeoJSON heat tiles + aggregate stats |
| Environmental Parameters | POST | `/v1/env_params` | Basic + Premium (≤3 params) | humidity, heat index, feels-like, AQI, solar |
| Heat Intelligence | POST | `/v1/heat_intelligence` | **Premium only** | PDF report via temporary `download_link` |
| Satellite View Segmentation | POST | *not published* | **Premium only** | segmented satellite image |
| Street View Segmentation | POST | *not published* | **Premium only** | segmented street image |
| Check Status | GET | `/v1/status/{activity_id}` | Basic + Premium | poll any activity |
| Check Credits Usage | GET | *not published* | Basic + Premium | subscription/credit state |

---

## 3. Create Heatmap — the one we build on

**Request**

```json
{
  "polygon_aoi": { "type": "FeatureCollection",
                   "features": [{"type":"Feature","properties":{},
                     "geometry":{"type":"Polygon","coordinates":[[[lng,lat], ...]]}}]},
  "date_time":   { "start_date": "YYYY-MM-DD", "filter_type": 3 },
  "granularity": 80,
  "analytic_type": "tcm"
}
```

| Field | Rule |
|---|---|
| `polygon_aoi` | Must be a `FeatureCollection` with a **closed** `Polygon` (first coord == last coord) or you get `400` |
| `date_time.filter_type` | `1` single hour (+`start_time`) · `2` hour range (+`start_time`,`end_time`) · `3` single day · `4` day range (≤1 month) |
| `granularity` | **`60`, `80` or `100`** (metres). Nothing else. |
| `analytic_type` | `tcm` (default) = temperature **°C** per tile · `time_of_measure` / `exceedance` / `persistence` = **hours** |
| `threshold`, `direction` | °C (default 30) and `above`/`below`; only used by `exceedance` & `persistence` |
| Date range | `2019-01-01` → **now + 12 h**. Outside = `400`, and **not billed** |

**Result** (`data.result`)

```
result.map_data    GeoJSON FeatureCollection — one polygon tile per cell
result.stats_data  { Temperature_stats: {Minimum, Maximum, Mean, Standard_deviation},
                     Overall_temperature_distribution: [..],
                     Normal_temperature_distribution: {x_axis, y_axis},
                     Temperature_frequency: {...} }
```

**ASSUMPTION A** — the docs describe `map_data` as "GeoJSON polygons" but **never
show a sample feature's `properties`**, so the key holding each tile's
temperature is unconfirmed. `fortyguard_client._extract_temperature_c()` tries
`temperature`, `Temperature`, `temp`, `temp_c`, `temperature_c`,
`temperature_celsius`, `value`, `tcm`, `avg_temperature`, `mean` and then falls
back to the first numeric property. **Run one real request, read the properties,
and delete the guesswork.**

---

## 4. Environmental Parameters — closes the humidity gap

```json
{ "latitude": 37.77, "longitude": -122.42, "temperature": 31.5,
  "date_time": {"start_date": "2026-08-28", "filter_type": 3},
  "analysis": ["relative_humidity_percent", "heat_index_celsius"] }
```

Note `temperature` here is **°C** (Heat Intelligence takes **°F** — the two
differ; do not mix them up).

Parameters available (Basic/Startup limited to **3 per request**, Premium all):
`heat_index_celsius`, `apparent_temperature_celsius`,
`wet_bulb_temperature_celsius`, `relative_humidity_percent`, `precipitation_mm`,
`cloud_cover_octas`, `elevation`, `air_quality:idx`, `air_quality_pm2p5:idx`,
`air_quality_pm10:idx`, `air_quality_no2:idx`, `aqi_us_co`, `air_quality_o3:idx`,
`air_quality_so2:idx`, `methane_ppb`, `co2_ppm`, `solar_irradiance`.

> **This is the endpoint that fixes audit #14.** `uhiFactors.ts` has had to fake
> relative humidity (the `adjustForHumidity` bump) because nothing could supply
> it. `relative_humidity_percent` + `apparent_temperature_celsius` give us real
> humidity and a real "feels like". There is **no wind parameter** — wind still
> has to come from Open-Meteo, which is already wired.

**Missing values are `null`** (older stored responses use a legacy `-999`).
The docs are explicit: *null means unavailable upstream and **must not** be read
as zero.* `_clean_number()` therefore maps both to `None`. Turning a null
humidity into `0%` would silently report a dangerously cool "feels like".

---

## 5. Plan limits

| | Basic | Premium | Startup |
|---|---|---|---|
| Monthly credits | 1,000,000 | 5,000,000 | 1,000,000 |
| Heatmap max area | **10 mi²** | **50 mi²** | 10 mi² |
| Environmental params | 3 / request | all | 3 / request |
| Heat Intelligence | ✗ | ✓ | ✗ |
| Segmentation | ✗ | ✓ | ✗ |
| Access window | monthly | monthly | 6 months, one-time |
| **Regional coverage** | **US only** | **US only** | **US only** |

Credits are deducted **only on successful completion**. Failed tasks are free.
`400`/`422` validation failures are free. Unused credits do not roll over.

> **US-only coverage vindicates the California-only demo scope.** The app already
> restricts to California emergency contacts and US disclaimers; that is now a
> hard API constraint, not just a product choice.

---

## 6. Architectural mismatch — why nothing is wired up yet

`services/heat_provider.HeatProvider` exposes:

```python
def get_temperature(self, lat: float, lng: float) -> HeatReading
```

Synchronous. Per point. Instant.

The real API is **asynchronous**, **area-based**, and takes **seconds to
minutes**. You cannot implement that interface honestly.

Worse, the current call volume is catastrophic against a metered key:

| Action | Provider calls today |
|---|---|
| Map screen load (24×24 grid) | **576** |
| Design Studio open (400 heat + 1,200 twin) | **1,600** |
| Generate a plan | **944** |

At 576 billed async tasks *per page load*, a 1,000,000-credit Basic plan would
be gone in a couple of dozen page views.

**But done the right way, real data is dramatically cheaper than the mock.**
Because `/v1/heatmap` returns the *entire* grid from one request, the correct
call volume is:

| Action | Calls, done right |
|---|---|
| Map screen load | **1** |
| Design Studio open | **1** |
| Generate a plan | **0** (reuse the cached grid) |

One request per view, cached by (bbox, date, granularity).

### Why the existing frontend already fits

`frontend/src/components/map/renderHeatTiles.ts` draws **GeoJSON polygon fill
layers**. It was written for exactly the shape `map_data` returns, before we
knew that's what the API produced. The wire format needs no change — only the
source of the polygons does.

And `granularity: 80` is a near-perfect match for the grid we already fake:
the Design Studio box is ~1.56 km across 20 cells ≈ **78 m** per cell.

### Options considered

| | Approach | Verdict |
|---|---|---|
| A | Keep `get_temperature()` and block on polling inside it | **Rejected.** 5–30 s page loads, and it invites the 576-call loop. |
| B | New async `HeatmapService`: submit → cache → poll → serve from cache | **Recommended.** 1 call/view. Requires a job-status surface in the UI. |
| C | Mock renders instantly; real job runs in background; swap when ready | Best UX, and complementary to B — the UI already has a "loading" state to reuse. |

Plan: build **B**, layer **C**'s UX on top.

---

## 7. What is built today

`backend/app/services/fortyguard_client.py` implements the verified contract:

- `FortyGuardClient(api_key, base_url, plan, timeout, transport)`
- `submit_heatmap(...) -> activity_id`
- `submit_env_params(...) -> activity_id`
- `submit_heat_intelligence(...) -> activity_id`
- `get_status(activity_id) -> dict`
- `wait_for_result(activity_id, timeout_s, poll_interval_s) -> dict`
- `heatmap(...) -> HeatmapResult`
- `bbox_polygon(w, s, e, n)`, `polygon_area_m2(...)`, `ring_bbox(...)`

`HeatmapResult` parses `map_data` into `{lat, lng, value, properties, geometry}`
tiles plus `temperature_stats_c()`.

It deliberately **does not** expose `get_temperature(lat, lng)`, so the 576-call
disaster is impossible rather than merely discouraged. A test asserts this.

`backend/tests/test_fortyguard_client.py` — 58 tests, all against an injected
fake transport, so **no API key and no network are needed to prove the client
correct**. They cover:

- the `api-key` header (not Bearer)
- request shape, granularity, analytic types
- area caps (10 vs 50 mi²), US-only coverage
- date bounds (2019-01-01, now+12 h), malformed dates
- 401 / 403 / 404 / 429 / 5xx / network / non-JSON mapping
- **404 → Processing** (docs: normal right after submit)
- **Failed is terminal and free** — stops polling
- **timeout still returns the activity_id** so the task is recoverable
- **null stays `None`, never `0`**; legacy `-999` → `None`
- empty `map_data`, stats fallback to tiles
- °C for `env_params` vs °F for `heat_intelligence`
- Basic's 3-parameter cap

---

## 8. Still to do

1. **Run one real heatmap request** with the key and paste back the
   `properties` of one `map_data` feature. Resolves ASSUMPTION A.
2. Confirm `start_time` timezone (local vs UTC) — undocumented, assumed UTC.
3. Build `HeatmapService` (option B) with a (bbox, date, granularity) cache.
4. Add a job-status surface so the UI can show "loading real data".
5. Feed `env_params` humidity into `uhiFactors.ts`, retiring `adjustForHumidity`.
6. Add a `/api/heat/fortyguard/selfcheck` endpoint that reports auth + plan +
   credits **without echoing the key**, so the user can confirm the key is live.

---

## 9. Key safety

- Read only from `FORTYGUARD_API_KEY` in the environment.
- Never logged, never written to disk, never sent to the frontend.
- `FortyGuardConfigError` names the variable and where to set it, but never
  echoes its value.
