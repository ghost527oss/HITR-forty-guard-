# The Intervention-Planning Algorithm

> **Design intent (agreed 2026-08-18, restated 2026-08-28):** We do NOT *default* to generating a city
> from scratch — that would mean placing thousands of houses, and it is rarely something a real city can
> act on. We take the **existing city plan** (streets and buildings stay where they are) and compute the
> best **interventions** that improve it. When a person explicitly asks for a bigger change, the same
> engine can also propose a **masterplan** — new street grid, zoning, district cooling, green network.
> The non-negotiable rule is honesty of scale: every level states plainly how much of the city it
> touches, and every number stays traceable to the engine.

## What stays fixed (the "given" city plan) — levels 0–3
- Streets and road network (unchanged)
- Existing buildings, houses, plots, and their locations (unchanged)
- Existing utilities, parks, landmarks

> At **level 4 (rebuild)** these stop being fixed and become the things being redesigned. Level 4 is
> never offered as a quiet default — it is an explicit "masterplan the whole area" choice, and the UI
> must say so.

## What the algorithm decides (the "interventions" we can place/adjust)
- **Tree placement** — which spots get new trees / shade trees
- **Shelter-belts & windbreaks** — lines of trees/vegetation to deflect heat and manage **wind speed**
- **Shade structures** — awnings, canopies, roof coatings over public walkways and water points
- **Water stations** — placement of drinking-water/refill points
- **Building orientation / form suggestions** — how structure shape & orientation can be adapted for
  shading (overhangs, roof pitch, window placement) — on *existing* structures or as retrofit guidance
- **Farm-layout guidance** — windbreak rows, intercropping, shade-netting placement so crops stay cool

## Factors the algorithm weighs (multi-criteria, NOT heat alone)
1. **Thermal factors** — from FortyGuard API: real-time + historical + forecast temperature, risk level
   per block/parcel; plus derived "heat-on-plants"/"heat-on-people" exposure.
2. **Micro-climate factors** — prevailing **wind speed/direction**, humidity, orientation of streets
   (N–S vs E–W), existing shade coverage. *(⚠ Wind + humidity: NOT yet wired — stored for later,
   requires real FortyGuard API per audit #4. See `docs/algorithm.md` history & v0.6.5 CHANGELOG.)*
3. **Accessibility / livability factors** — walking distance to **hospitals, schools, markets, transit**;
   equity: prioritize vulnerable zones (elderly housing, shelters, low-income, schools, clinics).
   *(✅ As of v0.6.5: `services/planner._compute_context()` consumes real `accessibility.find_nearby()`
   + `heat_surface.compute_surface()` to compute nearest hospital distance, equity score
   (schools/transit/hospitals within 800m), and protective score (fraction of grid ≥100°F).)*
4. **Productivity factors** (farm use case) — soil/buildability, water access, sunlight needs of the
   planned crops, hybrid-crop suitability.

## Example use-case: a farmer with a large plot
Goal: keep the farmhouse cool AND maximize healthy hybrid-crop yield.
The algorithm uses real land data + thermal/wind data to suggest:
- a **shelter-belt** on the hot/windy side to cut heat stress on crops (known agronomy method)
- **tree lines** that shade the house without starving crop rows of light
- water-station / shade placement for field workers
- crop-row orientation relative to sun and wind

## Output: a "ranked intervention plan"
*(This answers the question "what is a ranked intervention plan?" — see PLAN discussion.)*
The algorithm produces a **prioritized list of actions**, each with:
- **what** to do (e.g., "plant a 3-row shelter-belt along the west boundary of Block 14")
- **where** (exact map location / parcel)
- **why** (the specific heat/access factors that triggered it)
- **impact estimate** (e.g., projected °C reduction, area of shade gained, crops protected)
- **cost/effort bucket** (low/medium/high)

They are **ranked** by an overall score so planners see the highest-impact, most equitable actions first
instead of a random scatter of ideas. The map highlights each one; clicking it shows the full detail.
