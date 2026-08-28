# Judging Rubric Mapping

Official weights: Impact & Relevance (40%) · Technical Execution (35%) · Innovation (15%) · Communication (10%)

## Impact & Relevance (40%) — our story
- Solves a real, growing problem: urban heat is the deadliest weather risk; we tell people what to do
  **in their exact location**.
- Serves multiple stakeholders: residents, farmers, city planners, emergency services.
- Accessibility + equity built in (protect schools, elderly, low-income, clinics).
- Multi-city, not a single demo.

## Technical Execution (35%) — our plan
- Real FortyGuard API integration (live data, not mock).
- Python backend: geospatial analysis, multi-criteria scoring algorithm, intervention ranking.
- PostGIS database for geospatial queries.
- Polished, smooth frontend (React + TypeScript + Tailwind + Framer Motion + MapLibre).
- Full version control + `CHANGELOG.md` + living docs (this repo).

## Innovation (15%) — our differentiators
- **One change spectrum, not one answer** — *observe → plant trees → retrofit buildings → re-plan
  blocks → masterplan the city*. The person chooses how much change they can actually deliver, the
  engine adapts the whole recommendation to that choice, and each level states plainly how much of the
  city it touches. Most tools only do the top or the bottom of this range.
- Heat as one of several **livability** criteria (accessibility, equity, productivity).
- Farm/productivity mode with shelter-belts & windbreak agronomy.
- **AI that composes, compares and explains — never invents.** It narrates a plan and proposes
  alternatives by re-weighting the engine, so every number keeps its citation. The honesty is the
  feature: a judge can ask "where did −3.2 °C come from?" and get a real answer.
- **Explainable simulation** — every °C change is attributable: you can see which placement produced
  it, at what radius, with what cap.

## Communication (10%)
- Clear docs, README, a short demo script, and a story: "from heat map → ranked action plan."
