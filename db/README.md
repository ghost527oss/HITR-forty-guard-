# Database

Layer 1 knowledge database for HITR. PostgreSQL + PostGIS.

## Files
- `schema.sql` — creates all tables (cities, buildings, health_conditions, emergency_contacts,
  encyclopedia, saved_plans, pois, interventions) plus indexes.
- `seed/` — starter knowledge content (real, plain-language). Run after `schema.sql`:
  - `01_cities_health.sql` — cities + health conditions (heat stroke, exhaustion, cramps, dehydration, sunburn)
  - `02_emergency.sql` — emergency/helpline contacts (911, 211; city-specific ones are VERIFY-LATER placeholders)
  - `03_encyclopedia.sql` — heat / crops / buildings / shade / water knowledge
  - `04_buildings.sql` — plain-language architecture/build designs with cooling estimates

> **Honesty notes:** medical content is general first-aid guidance, not medical advice. Only well-known
> national numbers (911, 211) are included as real; city heat-hotlines are placeholders to verify.
> This seed is a **starter set** — Layer 4 (the AI) reads from it now, and we can add far more knowledge
> later without touching the agent.

## How to apply it
The project uses **Supabase** (managed Postgres + PostGIS, free tier). PostGIS is pre-enabled there.

1. Create a project at https://supabase.com (free). You do NOT need to connect GitHub to Supabase —
   they are separate. Supabase gives you a project URL + anon key in Settings → API.
2. Open **SQL Editor** in the Supabase dashboard.
3. Paste and run `schema.sql`, then each `seed/*.sql` file in order.
4. Note the project URL + anon key for the backend (put them in `backend/.env`, never commit).

> `.env` holds connection info / keys — never commit it. See `backend/.env.example`.

## Verify
```sql
select table_name from information_schema.tables where table_schema = 'public' order by 1;
```
You should see the 8 app tables. To check seeded rows:
```sql
select 'health_conditions' t, count(*) from health_conditions
union all select 'encyclopedia', count(*) from encyclopedia
union all select 'buildings', count(*) from buildings;
```
