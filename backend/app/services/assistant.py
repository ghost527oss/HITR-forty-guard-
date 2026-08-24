"""
HITR assistant engine (Layer 4).

Deterministic, grounded assistant: it does NOT use a language model to invent
answers. It classifies the user's question into an intent, calls the matching
knowledge-repository tool, and returns the real DB/seed rows plus a plain-language
reply. This works with zero API keys and is honest and safe.

When a Gemini key is later added, this same intent + tool interface can drive
function-calling without changing the knowledge layer.
"""
from __future__ import annotations

from . import knowledge

# Intent -> (keywords, handler, label)
_INTENTS = [
    ("emergency", ["emergency", "911", "help now", "call", "ambulance", "hospital", "helpline"],
     "emergency", "Emergency & helplines"),
    ("first_aid", ["first aid", "heat stroke", "heatstroke", "stroke", "exhaustion", "cramp",
                   "dehydration", "sunburn", "burn", "symptom", "what to do"],
     "first_aid", "First aid"),
    ("buildings", ["build", "house", "home", "roof", "design", "cool home", "courtyard", "insulat",
                   "ventilat", "architecture", "retrofit"],
     "buildings", "Building designs"),
    ("plan", ["plan", "intervention", "what should i do", "improve", "cooler", "change level"],
     "plan", "Planning"),
    ("encyclopedia", ["what is", "explain", "how", "why", "heat wave", "heat island", "shelter",
                      "windbreak", "crop", "hydration", "canopy", "green roof", "cool roof", "learn"],
     "encyclopedia", "Knowledge"),
]


_DEFINITION_PREFIXES = (
    "what is", "what's", "what are", "what does", "what do", "explain",
    "describe", "how does", "tell me about", "define", "how does a",
)


def detect_intent(text: str) -> str:
    tl = text.lower()

    # High-urgency intents first.
    for name in ("emergency", "first_aid", "plan"):
        _kw = next(k for n, k, *_ in _INTENTS if n == name)
        if any(k in tl for k in _kw):
            return name

    # A definition-style question ("what is X") points to the knowledge base,
    # even if X is also a building term like "cool roof".
    if any(tl.startswith(p) for p in _DEFINITION_PREFIXES):
        return "encyclopedia"

    for name, _kw, _handler, _label in _INTENTS:
        if name in ("emergency", "first_aid", "plan"):
            continue
        if any(k in tl for k in _kw):
            return name
    return "encyclopedia"


def _reply_emergency(text: str) -> dict:
    city = None
    for c in knowledge.seed.CITIES:
        if c["name"].lower() in text.lower():
            city = c["name"]
            break
    contacts = knowledge.get_emergency_contacts(city)
    if not contacts:
        contacts = knowledge.get_emergency_contacts(None)
    lines = "If this is an emergency, call for help right away and stay with the person."
    return {
        "answer": lines,
        "source": "knowledge/emergency",
        "data": contacts,
    }


def _reply_first_aid(text: str) -> dict:
    hits = knowledge.get_health_condition(text)
    cond = hits[0]
    symptoms = "; ".join(cond["symptoms"])
    steps = "\n".join(f"  {i+1}. {s}" for i, s in enumerate(cond["first_aid_steps"]))
    sev_note = ""
    if cond["severity"] == "emergency":
        sev_note = "This is an EMERGENCY — call 911 and act fast."
    answer = (
        f"{sev_note}\n\n{cond['name']}: {cond['plain_language']}\n\n"
        f"Symptoms: {symptoms}\n\nFirst aid:\n{steps}"
    )
    return {"answer": answer, "source": f"knowledge/health/{cond['slug']}", "data": [cond]}


def _reply_buildings(text: str) -> dict:
    designs = knowledge.get_building_designs(text)
    if not designs:
        designs = knowledge.get_building_designs()
    rows = []
    parts = []
    for d in designs[:3]:
        rows.append(d)
        parts.append(
            f"• {d['name']} (cooling ~{d['cooling_benefit_c']}°C, energy {d['energy_cost_bucket']}, "
            f"cost {d['cost_bucket']}): {d['plain_language']}"
        )
    answer = "Here are building designs that can keep a home cooler:\n\n" + "\n".join(parts)
    answer += "\n\nI can pull full details for any of these — just ask."
    return {"answer": answer, "source": "knowledge/buildings", "data": rows}


def _reply_plan(text: str) -> dict:
    return {
        "answer": (
            "Use the planner on the right of the map: pick a spot, choose a change level "
            "(Light / Medium / Full re-plan), and press 'Generate plan'. The app ranks "
            "interventions by heat, land use, and how much you want to change the city. "
            "I can explain any intervention in the plan."
        ),
        "source": "planner",
        "data": [],
    }


def _reply_encyclopedia(text: str) -> dict:
    hits = knowledge.search_encyclopedia(text)
    if not hits:
        return {
            "answer": (
                "I couldn't find that in the knowledge base yet. Try 'heat wave', 'urban heat island', "
                "'shelter belt', 'cool roof', or 'hydration'. You can also ask about building designs "
                "or heat illness first aid."
            ),
            "source": "knowledge/none",
            "data": [],
        }
    e = hits[0]
    answer = f"{e['title']}: {e['plain_language']}"
    return {"answer": answer, "source": f"knowledge/{e['category']}/{e['slug']}", "data": hits}


_HANDLERS = {
    "emergency": _reply_emergency,
    "first_aid": _reply_first_aid,
    "buildings": _reply_buildings,
    "plan": _reply_plan,
    "encyclopedia": _reply_encyclopedia,
}


def ask(text: str) -> dict:
    """Entry point: turn a free-text question into a grounded, plain-language answer."""
    if not text or not text.strip():
        return {
            "intent": "encyclopedia",
            "answer": "Ask me about heat illness first aid, emergency numbers, building designs, or city heat knowledge.",
            "source": "none",
            "data": [],
        }
    intent = detect_intent(text)
    handler = _HANDLERS[intent]
    result = handler(text)
    result["intent"] = intent
    result["query"] = text
    return result
