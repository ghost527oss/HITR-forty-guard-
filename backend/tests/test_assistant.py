"""Assistant + knowledge tests.

The headline regression here is the emergency 500: `knowledge.get_emergency_contacts`
had lost its `def` line, so its body sat orphaned inside `get_health_condition`
after that function's `return`. Every emergency-intent question raised
AttributeError and returned HTTP 500.
"""

import pytest

from app.services import assistant, knowledge


# ── The regression ───────────────────────────────────────────────────────────

def test_get_emergency_contacts_exists():
    """The function must exist as a module attribute, not as dead code."""
    fn = getattr(knowledge, "get_emergency_contacts", None)
    assert fn is not None, (
        "knowledge.get_emergency_contacts is missing — its body is probably still "
        "orphaned inside get_health_condition() after that function's return."
    )
    assert callable(fn)


@pytest.mark.parametrize(
    "question",
    ["emergency", "call 911", "hospital", "ambulance", "helpline", "I need help now"],
)
def test_emergency_intent_returns_200(client, question):
    """Every emergency-intent question must answer, not 500."""
    r = client.post("/api/ai/ask", json={"question": question})
    assert r.status_code == 200, f"{question!r} -> {r.status_code} ({r.text[:200]})"
    body = r.json()
    assert body["intent"] == "emergency"
    assert body["answer"]
    assert isinstance(body["data"], list)
    assert body["data"], "emergency reply must include at least one contact"


def test_emergency_contacts_include_national_numbers():
    rows = knowledge.get_emergency_contacts()
    assert rows, "seed emergency contacts must never be empty"
    phones = {r["phone"] for r in rows}
    assert "911" in phones


def test_emergency_contacts_city_filter_keeps_national_numbers():
    """City-specific filtering must never drop the national 911 / 211 numbers."""
    rows = knowledge.get_emergency_contacts("Springfield")
    phones = {r["phone"] for r in rows}
    assert "911" in phones, "national numbers must survive an unmatched city filter"


# ── Intent routing ───────────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "question,intent",
    [
        ("emergency", "emergency"),
        ("heat stroke", "first_aid"),
        ("what is a heat wave", "encyclopedia"),
        ("cool roof house", "buildings"),
        ("how should I plan this block", "plan"),
        ("xyzzyplugh", "encyclopedia"),
    ],
)
def test_intent_routing(client, question, intent):
    r = client.post("/api/ai/ask", json={"question": question})
    assert r.status_code == 200, f"{question!r} -> {r.status_code}"
    assert r.json()["intent"] == intent


# ── Honesty on a miss ────────────────────────────────────────────────────────

def test_first_aid_miss_is_honest_not_heat_stroke():
    """Audit #11: a miss must not silently return heat-stroke guidance."""
    hits = knowledge.get_health_condition("sprained wrist")
    assert hits == [], "an unmatched query must return an empty list"

    reply = assistant._reply_first_aid("sprained wrist")
    answer = reply["answer"]
    assert reply["source"] == "knowledge/none"
    assert reply["data"] == []
    # It must *say* it has nothing, rather than presenting a condition as the answer.
    assert "don't have" in answer.lower() or "do not have" in answer.lower()
    assert "911" in answer
    # Suggesting what to ask next is fine; asserting a diagnosis is not.
    assert "Symptoms:" not in answer


def test_knowledge_seed_is_not_empty():
    from app.data import seed
    assert seed.HEALTH_CONDITIONS
    assert seed.EMERGENCY_CONTACTS
    assert seed.ENCYCLOPEDIA
    assert seed.BUILDINGS


def test_field_helper_normalises_lists():
    """Audit #18: list columns (e.g. symptoms) must be searchable as text."""
    assert knowledge._field({"symptoms": ["hot skin", "dizzy"]}, "symptoms") == "hot skin dizzy"
    assert knowledge._field({}, "missing", "fallback") == "fallback"


def test_ask_question_length_limit(client):
    """Security check: questions exceeding 500 characters must return HTTP 422."""
    long_question = "a" * 501
    r = client.post("/api/ai/ask", json={"question": long_question})
    assert r.status_code == 422
