# HITR product strategy & feature plan

**Implementation status:** Batches 1–4 COMPLETE (2026-08-30). Batch 4: **16 Peak vs now**, **21 Seasonal surface**, **25 Rebuild honesty**. Wait before Batch 5.

**Code stays frozen until you pick features.** This document is strategy + implementable ideas only.

Inspection used: map + heat pipeline, planner levels, Design Studio + `uhiFactors.ts`, heat surface + 3D twin, knowledge DB + grounded assistant, architectural library, Open-Meteo, OSM/Overpass, FortyGuard area jobs.

---

## Product strategy (what to become)

**Job to be done:** For a *specific block you can tap*, HITR should answer three questions in one sitting:

1. **Where is heat actually dangerous?** (not “the city is hot”)
2. **Why is *this* cell hot?** (asphalt, canyon, no canopy, far from hospital)
3. **If I spend the next dollar here, what changes?** (°F, people walking, cost bucket)

The product already has the **engines** (surface hotspots, pattern labels, change levels, placement physics, before/after `simulateDesign`, hospital POIs, weather now). They are **split across screens**. The winning move is **compounding**: one map session that runs analysis → ranked interventions → simulated after-state → save/compare.

**Intended user:** a planner / student / civic volunteer standing on a block, not a GIS analyst.

**Highest-leverage gap:** Design Studio already computes `avgBeforeF` / `avgAfterF` / `maxDropC` and smart placements. The **map and Home do not show that outcome**. Judges never see the chain unless they find Studio.

**Principle:** ship *one closed loop on the map* before any new backend.

---

## 15–25 concrete features

Difficulty = one focused builder, not a team. Times = hours, not calendar days.

---

### 1. Block priority score (heat × land × hospital distance) — COMPLETED (MVP: hottest 3 cells)

1. **Name:** Priority Index  
2. **User:** After a tap (or auto on view), a ranked list of 3–5 cells: “#1 road heat trap, 0.4 mi from hospital, no canopy.” Tap jumps the map.  
3. **Problem:** Heat overlay is pretty; it does not say *where to act first*.  
4. **Why better:** Turns telemetry into a decision.  
5. **Reuse:** `heatData`, `analyzeSpot` / land, `city_simulation` hospitals, `accessibility.find_nearby`, hotspot clusters from `compute_surface`.  
6. **New data:** None.  
7. **Difficulty:** MEDIUM  
8. **Time:** 4–6 h  
9. **Impact:** VERY HIGH  
10. **Rebuild?** No — overlay + list on Map / Heat Surface.

---

### 2. Live before / after on the same map (the closed loop) — COMPLETED

1. **Name:** Scenario overlay  
2. **User:** Toggle **Now / After plan**. Heat tiles recolor using `simulateDesign`. Big number: “−1.8°C peak · 42 cells cooled.”  
3. **Problem:** Interventions live in Studio; the map stays “current only.”  
4. **Why better:** Visually demonstrable cause-and-effect.  
5. **Reuse:** `simulateDesign`, `PLACEMENT_META`, planner interventions, Studio placements.  
6. **New data:** None.  
7. **Difficulty:** MEDIUM  
8. **Time:** 5–8 h  
9. **Impact:** VERY HIGH  
10. **Rebuild?** No — MapView already paints `HeatCell[]`.

---

### 3. “Why this tile?” explainer (one card, not a chatbot)

1. **Name:** Spot diagnosis  
2. **User:** Tap → card: temp, land, pattern, 1-sentence mechanism, 1 recommended action + °C range.  
3. **Problem:** Pattern + planner exist as separate API calls; the tap banner is a 500-prone status line.  
4. **Why better:** Insight at the moment of curiosity.  
5. **Reuse:** `analyzeSpot`, `analyzePattern`, `_PATTERN_MAP`, planner impact strings.  
6. **New data:** None (bundle 2–3 existing GETs).  
7. **Difficulty:** EASY  
8. **Time:** 3–4 h  
9. **Impact:** HIGH  
10. **Rebuild?** No.

---

### 4. Budget slider → auto-pack interventions

1. **Name:** Budget pack  
2. **User:** Slider Low / Med / High (map existing cost buckets). Engine picks a set that fits; map pins update; drop estimate updates.  
3. **Problem:** Change levels 0–4 are *how much the city changes*, not *how much money*. Users think in budget.  
4. **Why better:** Decision tool, not a catalog.  
5. **Reuse:** `_COST`, `_IMPACTS`, `suggestPlacements`, `designContributions`.  
6. **New data:** Optional simple unit costs in seed JSON (not a new DB).  
7. **Difficulty:** MEDIUM  
8. **Time:** 6–8 h  
9. **Impact:** HIGH  
10. **Rebuild?** No.

---

### 5. Compare two saved designs for the same block

1. **Name:** Plan A vs Plan B  
2. **User:** Save current Studio placements; load two; split numbers: peak drop, cells affected, intervention count.  
3. **Problem:** `draftHistory` exists; comparison is not a first-class object.  
4. **Why better:** Planning is choice under constraint.  
5. **Reuse:** `draftHistory.ts`, `DesignSummary`.  
6. **New data:** None (localStorage).  
7. **Difficulty:** EASY–MEDIUM  
8. **Time:** 4–5 h  
9. **Impact:** HIGH  
10. **Rebuild?** No.

---

### 6. Hour-of-day heat (use the diurnal engine you already compute) — COMPLETED

1. **Name:** Time scrubber  
2. **User:** Slider 0 / 6 / 12 / 18 on Heat Surface; grid + hotspot count update.  
3. **Problem:** `temporal.diurnal_sampling` is computed then barely used as a product control.  
4. **Why better:** Heat is a *time* problem (night vs noon).  
5. **Reuse:** `compute_surface(..., hour=)`, `HeatSurfaceResult.temporal`.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 3–5 h  
9. **Impact:** HIGH  
10. **Rebuild?** No.

---

### 7. Pedestrian comfort (PMV) on the picked street — COMPLETED

1. **Name:** Walk comfort  
2. **User:** Spot card shows PMV/PPD: “Walking here: Hot · 78% dissatisfied” using live Open-Meteo wind/RH + tile temp.  
3. **Problem:** °F is environmental; judges care about *people*. PMV is already implemented and unused on the map.  
4. **Why better:** Technically credible (ISO 7730) and human.  
5. **Reuse:** `pmvFanger`, `getWeatherNow`, heat cell `temp_c`.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 3–4 h  
9. **Impact:** HIGH  
10. **Rebuild?** No.

---

### 8. Heatwave-aware planning (3-day Open-Meteo) — COMPLETED

1. **Name:** Heatwave mode  
2. **User:** If `heatwaveStatus` is alert, Home + Map badge: “3-day heatwave — prioritize water + shade, not cool roofs.” Planner defaults to survival interventions.  
3. **Problem:** Weather forecast is fetched; P2 heatwave rules exist; they don’t change recommendations.  
4. **Why better:** Same city, different *day* → different plan.  
5. **Reuse:** `getWeatherNow`, `heatwaveStatus`, planner kind filters.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 3–4 h  
9. **Impact:** HIGH  
10. **Rebuild?** No.

---

### 9. Shade-gap planting (trees only where canopy is missing)

1. **Name:** Canopy gap layer  
2. **User:** Layer: hot cells with no vegetation within 60 m. One button: “Plant suggested clusters.”  
3. **Problem:** `suggestPlacements` already skips existing canopy; the map doesn’t show the *gap*.  
4. **Why better:** Explains *why here, not there*.  
5. **Reuse:** `suggestPlacements` tree branch, `CitySimulation3D.vegetation`.  
6. **New data:** None.  
7. **Difficulty:** MEDIUM  
8. **Time:** 4–6 h  
9. **Impact:** HIGH  
10. **Rebuild?** No.

---

### 10. Cool-roof candidates (must sit on buildings)

1. **Name:** Roof targets  
2. **User:** Pins only on building cells; list height + temp; apply cool-roof set → after-grid.  
3. **Problem:** Cool-roof logic is buried in Studio tools.  
4. **Why better:** Building-specific action, not generic greening.  
5. **Reuse:** `suggestPlacements(..., "cool_roof")`, simulation `buildings[]`.  
6. **New data:** None.  
7. **Difficulty:** EASY–MEDIUM  
8. **Time:** 3–5 h  
9. **Impact:** MEDIUM–HIGH  
10. **Rebuild?** No.

---

### 11. Water-refuge network (hotspots + hospital proximity)

1. **Name:** Hydration lattice  
2. **User:** Auto-place water stations (hottest-first, spacing, hospital bonus). Lines or labels: “140 m from hospital.”  
3. **Problem:** `suggestWaterStations` is Studio-only; Emergency screen is static 911.  
4. **Why better:** Survival infrastructure, civic and visual.  
5. **Reuse:** `suggestWaterStations`, hospitals from `find_nearby`.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 3–5 h  
9. **Impact:** HIGH  
10. **Rebuild?** No.

---

### 12. Walk-to-cool: nearest coolspot from this tap

1. **Name:** Cool path  
2. **User:** Tap a hot cell → arrow/line to nearest coolspot + rough meters + “park / water” label.  
3. **Problem:** Coolspots are detected then not used as *refuge*.  
4. **Why better:** Immediate action without construction.  
5. **Reuse:** `HeatSurfaceResult.coolspots`, `metersBetween`.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 3–4 h  
9. **Impact:** HIGH  
10. **Rebuild?** No.

---

### 13. Intervention → encyclopedia (grounded, not LLM)

1. **Name:** Cited why  
2. **User:** Each plan row has “Learn why”; assistant/encyclopedia snippet for cool roof / canopy / heat island.  
3. **Problem:** Knowledge DB and planner are disconnected.  
4. **Why better:** Explainable, on-brand with “AI never invents numbers.”  
5. **Reuse:** `search_encyclopedia`, intervention `key`, `/api/ai/ask`.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 2–4 h  
9. **Impact:** MEDIUM  
10. **Rebuild?** No.

---

### 14. Match a cooling design to *this* climate cell

1. **Name:** Design for this spot  
2. **User:** From map: “3 library designs suited to this temp + land” (courtyard, cool roof, etc.).  
3. **Problem:** 100-method library is a catalog; it doesn’t know the tap.  
4. **Why better:** Database becomes spatial.  
5. **Reuse:** `get_building_designs`, architectural `designs.ts`, spot `temp_f` + `land.kind`.  
6. **New data:** Light filter fields if missing (climate_suitability already in seed).  
7. **Difficulty:** MEDIUM  
8. **Time:** 5–7 h  
9. **Impact:** HIGH  
10. **Rebuild?** No.

---

### 15. Layer toggles that mean something

1. **Name:** Analysis layers  
2. **User:** Heat | Land | Hotspots | Hospitals | Proposed interventions — independently.  
3. **Problem:** Everything paints at once; analysis is not inspectable.  
4. **Why better:** Feels like a real planning GIS, cheaply.  
5. **Reuse:** Map sources already separate-ish (heat, trees, selection).  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 3–4 h  
9. **Impact:** MEDIUM–HIGH  
10. **Rebuild?** No.

---

### 16. Peak-hour vs now (Open-Meteo daily max vs tile)

1. **Name:** Peak vs now  
2. **User:** “Now 92°F · today max 104°F — plan for the peak, not this minute.”  
3. **Problem:** Spot reading is a single number; daily max exists in `WeatherNow.days`.  
4. **Why better:** Stops under-planning afternoon heat.  
5. **Reuse:** `getWeatherNow`.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 2 h  
9. **Impact:** MEDIUM  
10. **Rebuild?** No.

---

### 17. Honest FortyGuard job card

1. **Name:** Live job status  
2. **User:** Chip: processing / ready / failed / mock. If processing, keep mock underlay and countdown polls.  
3. **Problem:** Real API is async; users think the app is broken.  
4. **Why better:** Technically credible use of the sponsor API.  
5. **Reuse:** `loadRealHeatGrid`, `HeatAreaResponse.status`.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 2–3 h  
9. **Impact:** MEDIUM (HIGH if judges care about FortyGuard)  
10. **Rebuild?** No.

---

### 18. Export one-pager (share the decision)

1. **Name:** Block brief  
2. **User:** Button → printable/markdown: location, temps, top 3 actions, before/after, cost bucket. Copy or download.  
3. **Problem:** Work dies in the SPA.  
4. **Why better:** Real-world handoff to a meeting.  
5. **Reuse:** Plan JSON, DesignSummary, spot analysis.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 3–4 h  
9. **Impact:** MEDIUM–HIGH  
10. **Rebuild?** No.

---

### 19. Equity lens: heat + no green + poor hospital access

1. **Name:** Exposure score  
2. **User:** Cells scoring high on (temp percentile × 1/canopy × 1/access_weight) highlighted as “priority people, not just priority pavement.”  
3. **Problem:** Accessibility weights exist on roads and are unused in ranking.  
4. **Why better:** Track “resilient cities” without fake demographics.  
5. **Reuse:** `access_weight`, vegetation, heat grid.  
6. **New data:** None (don’t invent census).  
7. **Difficulty:** MEDIUM  
8. **Time:** 4–6 h  
9. **Impact:** HIGH  
10. **Rebuild?** No.

---

### 20. Wind-aware tree / corridor hint

1. **Name:** Breeze assist  
2. **User:** Compass from Open-Meteo; copy: “Prevailing wind from SW — trees on the windward side of this canyon.” Optional pin offset.  
3. **Problem:** `windUnitVector` / ventilation score exist; placement ignores wind.  
4. **Why better:** Physics, not decoration.  
5. **Reuse:** `getWeatherNow.wind_*`, `windVentilationScore`.  
6. **New data:** None.  
7. **Difficulty:** MEDIUM  
8. **Time:** 4–6 h  
9. **Impact:** MEDIUM  
10. **Rebuild?** No.

---

### 21. Seasonal switch (use monthly samples)

1. **Name:** July vs January surface  
2. **User:** Toggle month samples already in `seasonal_sampling`.  
3. **Problem:** Seasonal array is computed and idle.  
4. **Why better:** Shows the engine isn’t a static PNG.  
5. **Reuse:** `compute_surface` month offset.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 2–3 h  
9. **Impact:** MEDIUM  
10. **Rebuild?** No.

---

### 22. Click-to-apply planner pin on the heat grid

1. **Name:** Drop intervention  
2. **User:** Long-press / tool mode: drop tree/water/roof on a cell; live `cellDropC` preview.  
3. **Problem:** Studio is a different world from the map people land on.  
4. **Why better:** Direct manipulation.  
5. **Reuse:** Map click, `Placement` type, `simulateDesign`.  
6. **New data:** None.  
7. **Difficulty:** MEDIUM  
8. **Time:** 6–8 h  
9. **Impact:** HIGH  
10. **Rebuild?** No — don’t fork a second Studio.

---

### 23. Clustered hotspot report (surface → plan in one button)

1. **Name:** Fix this hotspot  
2. **User:** Heat Surface hotspot card → “Generate level-1 plan at cluster center.”  
3. **Problem:** Surface and planner don’t share a CTA.  
4. **Why better:** Compound feature, tiny UI.  
5. **Reuse:** hotspot `center_lat/lng`, `getPlan`, navigate Design Studio with `studioSpot`.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 2–3 h  
9. **Impact:** HIGH  
10. **Rebuild?** No.

---

### 24. Hydration linked to *this* forecast, not a static 2500 ml

1. **Name:** Heat-adjusted hydration  
2. **User:** Home water goal scales with today’s `t_max_c` / heatwave flag.  
3. **Problem:** Tracker is wellness-generic; the rest of the app is spatial heat.  
4. **Why better:** Same product language on Home.  
5. **Reuse:** Home `waterMl`, `getWeatherNow`.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 1–2 h  
9. **Impact:** LOW–MEDIUM (polish with story)  
10. **Rebuild?** No.

---

### 25. Constrained rebuild honesty (level 4)

1. **Name:** Rebuild impact banner  
2. **User:** At change level 4, unmissable: “Touches street grid / zoning” + compare °C vs level 1 for *same* block.  
3. **Problem:** Scale JSON exists so you never lie; the UI still underplays it.  
4. **Why better:** Product integrity judges notice.  
5. **Reuse:** `Plan.scale`, two `getPlan` calls.  
6. **New data:** None.  
7. **Difficulty:** EASY  
8. **Time:** 2–3 h  
9. **Impact:** MEDIUM  
10. **Rebuild?** No.

---

## Top 3 “wow” features

### A — Scenario overlay (feature 2) + placements from Studio/planner

**Why it impresses:** The only visual that proves the software *changes a city*, not just colors it.  
**UX:** Map → generate light plan or Studio auto-place → **After** toggle → tiles cool, number ticks.  
**Data/logic:** Existing `HeatCell[]` + `simulateDesign` + `suggestPlacements`.  
**Reuse:** `MapView.renderHeatTiles`, `uhiFactors.ts`, planner interventions mapped to `PlacementKind`.  
**Hard:** MEDIUM.  
**MVP:** One auto-pack (trees + water) from current grid; no editor. Slider later.

### B — Block priority index (feature 1)

**Why it impresses:** “Useful in a meeting in 10 seconds.”  
**UX:** List + highlight on map; tap = diagnosis card.  
**Data/logic:** Heat percentile × land penalty × inverse hospital distance × canopy gap.  
**Reuse:** Grid, land heuristic, `find_nearby`, surface clusters.  
**Hard:** MEDIUM.  
**MVP:** Rank current `heatData` cells; skip new APIs.

### C — Walk comfort + cool path (features 7 + 12)

**Why it impresses:** Human-scale, scientifically named (PMV), immediately usable.  
**UX:** Tap → “unsafe to walk” + “nearest cool park 180 m that way.”  
**Data/logic:** Open-Meteo + PMV + coolspots.  
**Reuse:** `pmvFanger`, `getWeatherNow`, surface coolspots.  
**Hard:** EASY–MEDIUM.  
**MVP:** Numbers + a line between two points; no routing engine.

---

## Highest-value feature for the final stretch

**Build: Scenario overlay (Now / After) driven by auto `suggestPlacements` on the current map grid.**

| Bar | Why this one |
|-----|----------------|
| HIGH IMPACT | Completes REAL DATA → ANALYSIS → DECISION → ACTION on the screen judges already open. |
| VISUALLY DEMONSTRABLE | Color change + one big −°C. |
| USEFUL | Answers “if we plant here, what happens?” |
| CREDIBLE | Caps and paper-backed drops already in `uhiFactors.ts` (not invented LLM numbers). |
| REALISTIC | No new backend, no new vendor, no ML. Map already consumes `HeatCell[]`. |

Pair it with a **thin** Priority list (feature 1 MVP) so After isn’t random — placements go on the hottest canopy-gap cells.

**Do not start with:** new AI, auth, census, routing, or a second app shell.

---

## Roadmap

### TIER 1 — build first

**1. Scenario overlay (Now / After)**  
- **Connects to:** Map screen + Design Studio placements + `simulateDesign`.  
- **New UI:** Segmented **Now | After**; hero metric (peak/avg drop, cells affected).  
- **Data flow:** `heatData` → `suggestPlacements` (trees/water from simulation context if available, else heat-only) → `simulateDesign` → `setHeatData` for After, keep original in a ref.  
- **Logic:** Map `PlacementKind` from planner keys (`trees`→`tree_cluster`, `water`→`water_station`). Honor `TOTAL_DROP_CAP_C`.  
- **Reuse:** `MapView`, `uhiFactors.ts`, optional `getCitySimulation3D` for vegetation/buildings context.  
- **Likely files:** `App.tsx`, `MapScreen.tsx`, `MapView.tsx`, `BottomBar.tsx`, `planner/uhiFactors.ts` (reuse, don’t fork).

**2. Spot diagnosis card**  
- **Connects to:** Map tap (`handlePick`).  
- **New UI:** Replace/extend BottomBar with pattern + why + 1 action.  
- **Data flow:** Parallel `analyzeSpot` + `analyzePattern` (already in `api.ts`).  
- **Logic:** Show `_PATTERN_MAP`-style explanation already returned as `pattern_label` / `summary`.  
- **Reuse:** `BottomBar`, `analyzePattern`.  
- **Likely files:** `BottomBar.tsx`, `App.tsx` (store pattern), `api.ts` (no new routes required).

**3. Priority index (MVP)**  
- **Connects to:** Same `heatData` as overlay.  
- **New UI:** 3-row sheet “Act here first.”  
- **Data flow:** Client-side rank; optional `getCitySimulation3D` for hospitals.  
- **Logic:** Sort by temp, boost roads/buildings, boost if far from hospital.  
- **Reuse:** `HeatCell`, simulation hospitals.  
- **Likely files:** `MapScreen.tsx` or small `PriorityList.tsx`, `App.tsx`.

### TIER 2 — if time remains

- Time scrubber (diurnal) on Heat Surface  
- PMV walk comfort on the diagnosis card  
- Heatwave mode switching planner kinds  
- Fix this hotspot → plan CTA  
- Water-refuge auto-place  
- A vs B from `draftHistory`

### TIER 3 — polish

- FortyGuard job chip  
- Analysis layer toggles  
- Peak vs now  
- Heat-adjusted hydration goal  
- Block brief export  
- Level-4 honesty banner  

---

## Ask of you

Reply with which items to implement (e.g. “Tier 1 all” or “2 + 7 + 12”). **No code until then.**
