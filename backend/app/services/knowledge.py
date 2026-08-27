"""
Knowledge repository (Layer 1 access layer for Layer 4).

Provides grounded lookup functions the AI assistant calls. Reads from Supabase
(Postgres) when reachable AND configured, otherwise falls back to the bundled
seed data so the app works offline / in the demo.

The assistant never invents answers — it calls these and explains the rows.
"""
from __future__ import annotations

import re

from ..config import settings
from ..data import seed

# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------

def _tokens(text: str) -> list[str]:
    """Lowercase significant words from a query."""
    return [w for w in re.findall(r"[a-z']+", (text or "").lower()) if len(w) > 2]


def _tok_similar(a: str, b: str) -> bool:
    """True if two words share a prefix of >=4 chars (handles stem forms like
    hydrated/hydration) or are equal."""
    if a == b:
        return True
    n = 0
    for x, y in zip(a, b):
        if x == y:
            n += 1
        else:
            break
    return n >= 4


def _overlap(ql: list[str], fl: list[str]) -> int:
    """Count how many query tokens are similar to any field token."""
    if not ql or not fl:
        return 0
    return sum(1 for q in ql if any(_tok_similar(q, f) for f in fl))


def _match(text: str, *fields: str) -> bool:
    """Token-based match with stem tolerance. True if any query token is similar
    to a field token, or the whole query is a substring of a field."""
    if not text:
        return False
    tl = text.lower()
    ql = _tokens(tl)
    for f in fields:
        fl = str(f).lower()
        if tl in fl:
            return True
        if _overlap(ql, _tokens(fl)) > 0:
            return True
    return False


# ---------------------------------------------------------------------------
# Supabase client + table reader (reads live DB when available)
# ---------------------------------------------------------------------------

_client = None


def _supabase():
    """Return a Supabase REST client if configured + reachable, else None (cached)."""
    global _client
    if _client is not None:
        return _client
    if settings.use_seed_knowledge:
        _client = False
        return None
    if not (settings.supabase_url and settings.supabase_publishable_key):
        _client = False
        return None
    try:
        from supabase import create_client
        _client = create_client(settings.supabase_url, settings.supabase_publishable_key)
        return _client
    except Exception:
        _client = False
        return None


def _sb_table(table: str) -> list[dict] | None:
    """Fetch all rows from a Supabase table, or None if unavailable/failed."""
    client = _supabase()
    if not client:
        return None
    try:
        resp = client.table(table).select("*").execute()
        data = resp.data
        return data if isinstance(data, list) else None
    except Exception:
        return None


def _rows(table: str, fallback: list[dict]) -> list[dict]:
    """Live Supabase rows if available, else the bundled seed fallback."""
    live = _sb_table(table)
    if live is not None:
        return live
    return fallback


def _field(entry: dict, name: str, default="") -> str:
    """
    Audit #18 fix: previous implementation was `entry.get(name, entry.get(name, default)) or default`,
    which is a no-op duplicate — both calls hit the same key with the same default.
    Now properly normalizes list/dict fields to a space-separated string so token matching
    still works when a column is a JSON array (e.g. symptoms: ["fever", "dizziness"]).
    """
    val = entry.get(name, default)
    if isinstance(val, list):
        return " ".join(str(x) for x in val)
    if isinstance(val, dict):
        return " ".join(f"{k} {v}" for k, v in val.items())
    return str(val) if val is not None else default


# ---------------------------------------------------------------------------
# Lookup functions (the "tools" the assistant uses)
# ---------------------------------------------------------------------------

def get_health_condition(query: str) -> list[dict]:
    """Find health conditions matching a query (name/slug/symptom)."""
    rows = _rows("health_conditions", seed.HEALTH_CONDITIONS)
    hits = [
        h for h in rows
        if _match(query, _field(h, "name"), _field(h, "slug"),
                  *_field(h, "symptoms", ""))
    ]
    return hits  # audit #11 fix: return empty list on miss (caller decides what to do)

    """Emergency/helpline contacts, optionally filtered by city name."""
    rows = _rows("emergency_contacts", seed.EMERGENCY_CONTACTS)
    if city:
        c = city.lower()
        return [
            e for e in rows
            if not e.get("city") or c in str(e.get("city") or "").lower()
        ] or rows
    return rows


def _relevance(query: str, entry: dict) -> int:
    """Relevance score: title/tags word matches count most (stem-tolerant)."""
    ql = _tokens(query)
    if not ql:
        return 0
    title = _tokens(_field(entry, "title"))
    tags = _tokens(" ".join(entry.get("tags", []) or []))
    body = _tokens(_field(entry, "plain_language"))
    return (
        4 * _overlap(ql, title)
        + 2 * _overlap(ql, tags)
        + 1 * _overlap(ql, _tokens(_field(entry, "category")))
        + 1 * _overlap(ql, body)
    )


def search_encyclopedia(query: str) -> list[dict]:
    """Search encyclopedia entries by title/category/tags/content, best match first."""
    rows = _rows("encyclopedia", seed.ENCYCLOPEDIA)
    hits = [
        e for e in rows
        if _match(query, _field(e, "title"), _field(e, "category"),
                  _field(e, "plain_language"), *(_field(e, "tags", "") or ""))
    ]
    hits.sort(key=lambda e: _relevance(query, e), reverse=True)
    return hits


def get_building_designs(query: str = "") -> list[dict]:
    """Find architecture/build designs matching criteria (climate/cost/tag)."""
    rows = _rows("buildings", seed.BUILDINGS)
    if not query:
        return rows
    return [
        b for b in rows
        if _match(query, _field(b, "name"), _field(b, "climate_suitability"),
                  _field(b, "cost_bucket"), *(_field(b, "tags", "") or ""))
    ]


def list_categories() -> list[dict]:
    """Return a browsable index of the knowledge base (for a systematic UI)."""
    rows = _rows("encyclopedia", seed.ENCYCLOPEDIA)
    cats = {}
    for e in rows:
        cat = _field(e, "category", "other")
        cats.setdefault(cat, {"label": cat, "count": 0})
        cats[cat]["count"] += 1
    return [
        {"category": k, "count": v["count"], "label": v["label"]}
        for k, v in sorted(cats.items())
    ]


def knowledge_stats() -> dict:
    """Counts of what the knowledge base contains (for the UI + honesty)."""
    src = "supabase" if not settings.use_seed_knowledge and _supabase() else "seed"
    live = _sb_table("health_conditions") if not settings.use_seed_knowledge else None
    n_health = len(live) if live is not None else len(seed.HEALTH_CONDITIONS)
    return {
        "cities": len(_rows("cities", seed.CITIES)),
        "health_conditions": n_health,
        "emergency_contacts": len(_rows("emergency_contacts", seed.EMERGENCY_CONTACTS)),
        "encyclopedia": len(_rows("encyclopedia", seed.ENCYCLOPEDIA)),
        "buildings": len(_rows("buildings", seed.BUILDINGS)),
        "source": src,
    }
