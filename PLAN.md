# HITR — Heat Intelligence & Territorial Resilience

**FortyGuard Hackathon'26** · Track 01 (Resilient Cities & Infrastructure) · Track 06 (Agentic AI)

HITR helps cities, farmers, and communities plan for heat instead of just reacting to it — using
FortyGuard's hyperlocal Temperature API as the ground truth.

---

## What HITR does (one sentence)
A map-based planning tool that takes a **real, existing city** and shows precisely where to place
**trees, shelter-belts, shade structures, water stations, and building orientation** to cool homes,
protect vulnerable people, and keep farmland productive — guided by real temperature data and an AI
assistant that makes the knowledge easy to use.

## Why it matters (Impact)
Heat is now the deadliest weather risk in cities. Planners, farmers, and families are told "it's
hot" but not **what to do about it in *their* exact spot**. HITR turns a heat map into a **concrete,
location-specific action plan**.

---

## Core principles (agreed with the team — non-negotiable)
1. **We never rebuild a city from scratch.** Streets and houses stay as they are. We plan *interventions*
   — trees, shelter-belts, water points, structure orientation — that improve the existing plan.
2. **Heat is not the only factor.** Hospitals, schools, markets, and transport must stay **accessible**.
   The algorithm optimizes for *livability*, with heat as a major (but not the only) criterion.
3. **The program does the heavy lifting.** AI assists a small, well-defined part of the workflow — it
   never "imagines a city out of nothing."
4. **Multi-city (any-city).** The user picks the location; the app works for whatever city they choose,
   not a single locked demo city.
5. **Versioned + documented.** Every change is committed, logged in `CHANGELOG.md`, and recoverable.

---

## Build order
1. Application structure/skeleton → 2. Live heat map → 3. Intervention planner → 4. AI assistant →
   5. Design & polish (premium look/animations, deferred to the end).

The **broader vision** (knowledge database, pattern recognition, change-level planner, emergency AI,
experience layers) and its phasing live in **[`docs/vision.md`](docs/vision.md)**.

---

## Docs index
- `PLAN.md` — this file: product concept, principles, decisions, roadmap.
- `CHANGELOG.md` — running log of every change (file, what, why).
- `docs/vision.md` — the broader product vision (layers) + hackathon phasing.
- `docs/product.md` — features & user stories.
- `docs/algorithm.md` — the intervention-planning algorithm (factors, scoring).
- `docs/ai.md` — the AI assistant's scope and guardrails.
- `docs/data.md` — FortyGuard API usage, city datasets, DB schema.
- `docs/architecture.md` — stack and system design.
- `docs/judging.md` — how each feature maps to the judging rubric.
