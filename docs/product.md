# Product — Features & User Stories

## Core experience
An interactive city map showing real hyperlocal temperatures (FortyGuard API). A user selects a city/
place (multi-city — works anywhere the user chooses) and a district or plot, and HITR overlays the
analysis and a **ranked intervention plan** (see `docs/algorithm.md`).

## Build order (agreed)
1. **Application structure/skeleton** — layout, bottom bar, map options, routing. *Done.*
2. **Heat + land-use analysis** — live heat (FortyGuard/mock) + classify each spot from OpenStreetMap
   (building/road/green/farmland/water). *Done — `/api/analysis/spot` + bottom-bar land display.*
3. **Intervention planner** — the ranked plan (algorithm, change-level control). *Done —
   `/api/planner/plan` + right-side PlannerPanel (Light/Medium/Full re-plan).*
4. **AI assistant** — the bounded, grounded assistant. *Done — `AiPanel` chat + `/api/ai/ask`
   (retrieval-based, reads the knowledge DB, no LLM key required).*
5. **Design/polish** — premium look & smooth animations (explicitly deferred to the end).

## Feature list (proposed, not yet built)

### F1. Live heat map
- Color-coded map overlay of current temperature + risk level per area, from the FortyGuard API.
- Tap any spot → current temp, risk, and short context.

### F2. Intervention planner
- Choose a district/plot → get the **ranked intervention plan** (trees, shelter-belts, shade structures,
  water stations, building-orientation guidance, farm-layout guidance).
- Each intervention: what / where / why / impact estimate / cost bucket.

### F3. Farm & productivity mode
- For agricultural plots: windbreak & shelter-belt placement, crop-row orientation, shade-netting,
  hybrid-crop suitability, keeping the farmhouse cool.

### F4. Accessibility overlay
- Show hospitals, schools, markets, transit + walking-distance rings; the planner favors interventions
  that keep these accessible and protect vulnerable zones.

### F5. AI assistant (bounded scope — see `docs/ai.md`)
- Heat-stroke first-aid + city-specific emergency numbers.
- Historical cool-and-cheap building search from our DB.
- Encyclopedia navigation (heat/crops/buildings/shade).
- Plain-language explanations of algorithm results.

### F6. Multi-city support
- Any city; a pipeline to add city data (OSM + FortyGuard) without per-city hardcoding.

## Non-goals (for now)
- Rebuilding cities from scratch (explicitly excluded by team).
- AI generating autonomous city plans (explicitly excluded).

## Database feature hub (unreleased navigation update)

The compact mobile bottom navigation contains Home, Map, Assistant, Database, and Settings. Database is an organised entry point rather than a replacement for existing features. It exposes three folders: **Architectural Designs** (the future 100-method cooling-design library), **City Planner** (the existing map-connected intervention planner), and **Tools** (the existing tools screen). This preserves access to all current functions while keeping the bottom bar usable on a phone.


## Knowledge Set and offline-first operation

Database exposes **Knowledge Set**, the bundled architectural cooling designs and local heat-safety/advisor records. Supabase is optional for the current demo: the application operates from bundled data when it is not configured. Supabase remains available later for durable shared knowledge and saved-plan persistence. The intended next assistant evolution is a central, offline/free navigator over map heat context, the Knowledge Set and planner output.
