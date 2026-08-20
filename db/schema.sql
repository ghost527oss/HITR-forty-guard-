-- =====================================================================
-- HITR — Layer 1: Knowledge Database schema (PostgreSQL + PostGIS)
-- =====================================================================
-- This is the backbone that grounds the AI assistant and the planner.
-- It is designed for Supabase (managed Postgres + PostGIS).
--
-- Run once against your database. Order matters (FKs below their tables).
--
-- Conventions:
--   * primary keys are `id uuid default gen_random_uuid()`
--   * geospatial columns use PostGIS `geometry(Point, 4326)`
--   * "plain_language" columns exist on every knowledge table so an
--     average person (and the AI) can read the entries without jargon.
-- =====================================================================

-- Enable extensions (PostGIS for geospatial, gen_random_uuid for uuids).
create extension if not exists postgis;
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Cities
-- ---------------------------------------------------------------------
create table if not exists cities (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    country     text not null default 'US',          -- FortyGuard API is US-only
    state       text,                                -- / province
    lat         double precision not null,           -- city center
    lng         double precision not null,
    timezone    text,
    created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 1A. Architecture / building database (plain-language design records)
-- ---------------------------------------------------------------------
create table if not exists buildings (
    id                 uuid primary key default gen_random_uuid(),
    slug               text unique not null,          -- stable id for links
    name               text not null,                 -- e.g. "Reflective-roof courtyard house"
    plain_language     text not null,                 -- 1-3 sentence human explanation
    description        text,                          -- longer detail
    image_url          text,                          -- optional diagram/photo
    cooling_benefit_c  double precision,              -- projected interior cooling (°C)
    energy_cost_bucket text,                          -- low | medium | high
    materials          text[],                        -- e.g. {'white roof','rammed earth'}
    climate_suitability text,                         -- e.g. 'hot-dry', 'humid', 'any'
    cost_bucket        text,                          -- low | medium | high
    tags               text[],                        -- search keywords
    created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 1B. Medical & health database
-- ---------------------------------------------------------------------
-- Health conditions (heat stroke, exhaustion, dehydration...)
create table if not exists health_conditions (
    id                 uuid primary key default gen_random_uuid(),
    slug               text unique not null,
    name               text not null,                 -- e.g. "Heat stroke"
    plain_language     text not null,                 -- what it is, in plain words
    symptoms           text[],                        -- list of plain-language symptoms
    first_aid_steps    text[],                        -- ordered first-aid actions
    severity           text not null,                 -- mild | severe | emergency
    created_at         timestamptz not null default now()
);

-- Emergency / helpline contacts per city
create table if not exists emergency_contacts (
    id            uuid primary key default gen_random_uuid(),
    city_id       uuid references cities(id) on delete cascade,
    country_code  text not null default 'US',
    kind          text not null,                      -- ambulance | police | fire | hospital | heat_hotline
    label         text not null,                      -- e.g. "Phoenix heat emergency line"
    phone         text not null,                      -- display number
    phone_dial    text,                               -- number to dial (may differ for intl)
    created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 1C. City knowledge encyclopedia (heat/crops/buildings/shade)
-- ---------------------------------------------------------------------
create table if not exists encyclopedia (
    id             uuid primary key default gen_random_uuid(),
    slug           text unique not null,
    category       text not null,                     -- heat | crops | buildings | shade | water
    title          text not null,
    plain_language text not null,                     -- plain-language explanation
    detail         text,                              -- deeper reading
    tags           text[],
    created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 1D. Saved plans / user data (a person can save a district plan)
-- ---------------------------------------------------------------------
create table if not exists saved_plans (
    id           uuid primary key default gen_random_uuid(),
    city_id      uuid references cities(id) on delete cascade,
    label        text,                                -- user-given name
    change_level int not null default 1,              -- 1=light 2=medium 3=full re-plan
    plan_json    jsonb,                               -- full plan snapshot
    created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Supporting tables used by the planner (kept minimal for now)
-- ---------------------------------------------------------------------
-- Points of interest: water stations, shade points, hospitals, schools, markets
create table if not exists pois (
    id      uuid primary key default gen_random_uuid(),
    city_id uuid references cities(id) on delete cascade,
    kind    text not null,                            -- water | shade | hospital | school | market
    name    text,
    geom    geometry(Point, 4326) not null,
    created_at timestamptz not null default now()
);

-- Computed intervention-plan entries (what/where/why/impact/cost/rank)
create table if not exists interventions (
    id             uuid primary key default gen_random_uuid(),
    city_id        uuid references cities(id) on delete cascade,
    saved_plan_id  uuid references saved_plans(id) on delete cascade,
    rank           int,                               -- position in the ranked plan
    change_level   int not null default 1,
    what           text not null,                     -- e.g. "plant 3-row shelter-belt"
    where_text     text,                              -- human-readable location
    geom           geometry(Point, 4326),
    why            text,                              -- triggering heat/access factors
    impact_estimate text,                             -- e.g. "-3°C on crops, 40% area shaded"
    cost_bucket    text,                              -- low | medium | high
    created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes for common lookups
-- ---------------------------------------------------------------------
create index if not exists idx_pois_city_kind   on pois (city_id, kind);
create index if not exists idx_pois_geom        on pois using gist (geom);
create index if not exists idx_emergency_city   on emergency_contacts (city_id);
create index if not exists idx_buildings_tags   on buildings using gin (tags);
create index if not exists idx_encyclopedia_cat on encyclopedia (category);
create index if not exists idx_interventions_plan on interventions (saved_plan_id);
