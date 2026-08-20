# Product Vision — the broader HITR

> This file captures the **bigger, broader vision** discussed with the team (2026-08-19). It goes beyond
> the current skeleton. It is the roadmap for what HITR becomes, organized as **layers**. We build
> bottom-up; each layer is the foundation for the next. Nothing here is committed code — it is the plan.

---

## Layer 1 — The Knowledge Database (the backbone)

The foundation that makes everything else *grounded* (the AI answers from real data, never invents).

**1A. Architecture / building database** — house & building designs written so a *normal person* can
understand, e.g. *"a house with a white reflective roof, deep veranda on the south, small high windows —
stays about 4°C cooler, costs about X."* Each entry:
- Plain-language summary
- Images / diagrams
- Cooling performance (projected °C reduction)
- Electricity cost bucket
- Materials
- Climate suitability

**1B. Medical & health database** — heat illnesses (heat stroke, heat exhaustion, dehydration):
- Symptoms in plain language
- First-aid steps
- **City-specific emergency / helpline numbers** (911-equivalent, hospital lines, heat hotlines)

**1C. City knowledge encyclopedia** — heat, crops, building methods, shade techniques (for farmer/citizen).

**1D. Saved plans / user data** — let a person save their district plan.

Backbone: a database layer (e.g. Supabase/PostgreSQL). The AI reads from here.

---

## Layer 2 — "Pattern recognition" (understanding the heat + the city)

The app should *understand* where there's a building, a road, or free ground, and *why* some places run
hotter. Two techniques, combined:

- **Heat-pattern analysis (from the temp API):** the heat map itself is a pattern — hot pockets near
  roads vs. cooler pockets near parks. Detect "urban heat islands," spot hottest blocks, correlate
  temperature with what's underneath.
- **Land-use detection (buildings / roads / free ground):** real building/road/land boundaries from
  **OpenStreetMap** (free, no key) laid over the heat map. For every spot we know: *is it a building, a
  road, a park, or open farmland — and how hot is it now?*
- **(Stretch / innovation) Vision-based detection:** satellite/aerial imagery + an AI vision model to
  automatically see rooftops, tree canopy, green cover, roof color. Heavier (needs an image model / GPU);
  a later stretch, not the core.

Result: the app "sees" the city and its heat — what makes planning smart instead of guessy.

---

## Layer 3 — The planner with an adjustable "how much do you want to change the city" control

**Change is a scale, not one thing.** A **change-level control** (slider/options) reshapes what the
algorithm recommends:

- **Level 1 — Light:** only add trees, shelter-belts, water stations, shade structures. City looks
  identical. *(Farmer: plant trees/windbreaks, keep the farmhouse cool, protect crops — streets/houses
  untouched.)*
- **Level 2 — Medium:** tree placement + building *orientation/retrofit* guidance (veranda, white roof,
  window shading) on existing structures.
- **Level 3 — Heavy / full re-plan:** redesign block layout, move functions around (still keeping
  hospitals/schools/markets accessible).

At every level, heat is weighed against **accessibility** (hospitals, schools, markets) — never heat
alone. This is the "change the whole city" vs. "just adjust the plants" spectrum.

---

## Layer 4 — The AI assistant (medical/emergency + "AI talks to officials")

- **Grounded teaching assistant (core, doable):** reads the databases and *explains* in plain language.
  *"I'm in Phoenix, someone has heat stroke, what do I do?"* → first-aid steps **and** the right helpline
  / hospital numbers for that city, straight from our DB.
- **Emergency calling / "AI talks to 911" (bold idea — reality check):** real telephony costs money and
  raises liability/ethics concerns for a hackathon app. **What we CAN build for demo:** an **"Emergency
  mode"** — tap SOS, the AI takes over the talking: confirms the emergency, asks structured questions,
  then either (a) tells the person *exactly what to say* when they call, or (b) plays a **simulated
  dispatcher conversation**. We architect it so real telephony can plug in later, but frame it as
  "works with any helpline; demo shows the flow."
- **Voice input:** the browser has free speech recognition — easy accessibility win (people can *talk*
  to the assistant).

---

## Layer 5 — The experience (how it all shows up)

The map stays central. Add **layer toggles** (like the dashboard): heat map, interventions, buildings,
water stations, medical facilities, city info. Plus the **change-level control**, an **assistant panel**,
and (later) the premium design polish.

---

## Phasing for the hackathon (build order, core-first)

1. **Database** (architecture + medical + encyclopedia + saved plans) — the backbone. *(High impact,
   medium effort.)*
2. **Heat + land-use analysis** — temp API + OSM buildings/roads/green. *(High impact, medium effort —
   our "pattern recognition" core.)*
3. **Planner with change-level control** — ranked interventions at Level 1/2/3. *(High impact, higher
   effort — the centerpiece.)*
4. **Grounded AI assistant** — teaches from the DB; emergency mode with first-aid + helplines + simulated
   dispatcher. *(High innovation, medium effort.)*
5. **Stretch / innovation:** vision-based rooftop/green detection; voice input. *(Only if time remains.)*
6. **Design polish** last.

---

## Judging fit
- **Impact (40%):** saving lives (medical/emergency) + cooling real cities.
- **Technical (35%):** database + geospatial analysis + a real planner + grounded AI.
- **Innovation (15%):** the change-level concept + emergency assistant + heat-pattern understanding.
- **Communication (10%):** "from heat map → understand the city → choose how much to change → know what
  to do in a heat emergency."
