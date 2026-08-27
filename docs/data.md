# Data

> Status: planning. Placeholder for the data layer design; will be refined once the FortyGuard API
> dashboard options are confirmed from screenshots + official docs.

## FortyGuard Temperature API
- Hyperlocal urban temps measured ~2 m above ground, ~10 mi² resolution, US-only.
- Returns a `risk_level` and is up to 115x more accurate than conventional weather models (FortyGuard claim).
- **Three data modes** (confirmed from FortyGuard product pages):
  1. **Near Real-Time** — current urban heat conditions with minimal latency.
  2. **Historic** — past temperature patterns; long-term urban heat trends.
  3. **Predictive** — AI forecast of future heat distribution; proactive planning & risk mitigation.
- This maps to the hackathon talk's mention of **six endpoints** and the "snapshot vs. exceedance vs.
  persistence" analysis layers — we'll align our integration to the exact endpoint list once we review
  the API docs/quickstart repo.
- **Open item:** the dashboard screenshots provided by the team did not reach the workspace (upload
  folder was empty). We need either a re-upload or a verbal description of the dashboard options
  (endpoint names, Real-time/Forecast/Historical menus, map-layer toggles) to lock integration details.
- Real usage will need the **FortyGuard API key + trial credits** from the dashboard (free on registration).

## City / land data sources (free)
- **OpenStreetMap (Overpass API)** — buildings, roads, parks, land use (free, no key).
- Curated sets per city where OSM lacks detail (parks, water points, vulnerable facilities).

## Application database (Supabase / PostgreSQL + PostGIS)
The concrete schema lives in **[`../db/schema.sql`](../db/schema.sql)** and starter knowledge lives in
**`../db/seed/*.sql`** (run schema first, then seeds — see `db/README.md`). Tables (per the Layer-1
vision in `docs/vision.md`):

- `cities` — city metadata & bounds.
- `buildings` — architecture/building designs in plain language (cooling, energy, materials, climate).
- `health_conditions` — heat illnesses: symptoms, first-aid steps, severity.
- `emergency_contacts` — per-city emergency / helpline / hospital / heat-hotline numbers.
- `encyclopedia` — browsable knowledge entries (heat/crops/buildings/shade/water).
- `saved_plans` — a person's saved district plan (with change_level).
- `pois` — water stations, shade points, hospitals, schools, markets (geospatial).
- `interventions` — computed plan entries (what/where/why/impact/cost/rank), linked to a saved plan.
- `users` / `sessions` — (later) auth, if needed for sharing saved plans.

## Note on a common trap
FortyGuard temp data is per-area, not per-building. Our algorithm combines API heat values with OSM
geometry and micro-climate heuristics so we can reason at the parcel/block level.
