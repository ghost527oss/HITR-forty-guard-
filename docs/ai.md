# The AI Assistant — Scope & Guardrails

> **Design intent (agreed 2026-08-18):** The AI must NOT generate a city/plan "out of nowhere" from the
> API. The core program does the real analysis. The AI is a **navigator and encyclopedia** that makes
> the app easier to use and answers narrowly-scoped, high-value questions.

## What the AI is NOT
- It does not invent interventions or cities by itself.
- It is not the source of the planning decisions.

## What the AI IS
The AI is the friendly face that helps a person move through the app's built-in knowledge and data.
Concrete, defined jobs:

1. **First-aid & emergency guidance** — e.g. a person with a heat stroke: what first aid to give,
   nearest medical services, and **city-specific emergency/health hotlines** (stored in our DB by city).
2. **Historical building search** — a person thinking about architecture/building can ask for houses
   from our **historical database** that achieved *cool interiors with low electricity consumption*;
   the AI retrieves and compares them based on the person's criteria (e.g., "hot-dry climate, cheap to
   run"). It pulls real entries from the DB, never makes them up.
3. **Encyclopedia navigation** — we maintain a browsable knowledge base (heat, crops, building methods,
   shade techniques). The AI just makes moving through it easier — suggesting relevant entries,
   summarizing, pointing to the right section.
4. **Small planning-helper role** — the AI *may* read an algorithm result and explain it in plain
   language ("why is this the #1 ranked intervention?"), but the *decision* always comes from the
   program's algorithm, not the AI.

## Guardrails enforced in code
- AI answers are grounded in **our database** (emergency numbers, building records, encyclopedia entries).
- Where the AI would need to "invent" something, it is instructed to **decline and point to the app's
  data/tools** instead.
- API/tool-calls the AI can make are a small, whitelisted set.

## Implementation (v0.3.5)
- **Retrieval-based, grounded assistant** — no LLM key required. `app/services/assistant.py` reads the
  knowledge DB (Supabase when reachable, bundled seed otherwise) and replies in plain language. It never
  invents answers. `app/services/knowledge.py` is the repository abstraction.
- Endpoint: `GET /api/ai/ask?q=` (health first-aid, emergency numbers, encyclopedia, building designs).
- The **plan-explainer** reads a Layer-3 plan and explains it in plain language.
- A Gemini/LLM can be plugged in later behind the same endpoint (same interface, more conversational).

## LLM provider (future option)
- **Gemini Flash** via Google AI Studio free tier could add conversational depth later, but is NOT
  required — the current assistant is fully grounded without it.

## Offline Architectural Designs advisor (unreleased)

The Database → Architectural Designs feature includes the Patch1.0v local advisor as a separate, browser-side capability. It is deterministic and free: `offlineAiEngine.ts` matches a question against the bundled 100 cooling designs and bundled heat-safety protocols; it does not call Gemini, Supabase, or a network endpoint. It can produce cooling-design recommendations, a three-phase household plan and medically sensitive heat guidance. This feature is intentionally separate from the main HITR Assistant until a future approved integration unifies the application context. Emergency text must retain California/US-specific and general-information disclaimers.


## Approved central-assistant direction (not yet implemented)

The next assistant phase will replace the older bounded assistant UI with the offline Patch1.0v advisor capability and connect it to selected map coordinates, heat/risk/source, land-use, Knowledge Set records and planner output. It must remain offline/free first. Any real FortyGuard call is deferred until the real client implementation and authenticated API tests are complete. Planner “add/remove changes” requires a separate mutable draft-plan model; the current backend returns recommendations only.
