"""AI assistant endpoints (Layer 4 — grounded assistant)."""
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from ..services import assistant, knowledge

router = APIRouter(prefix="/api/ai", tags=["ai"])


class AskRequest(BaseModel):
    # Security constraint: Limit input question length to prevent DoS / memory abuse.
    question: str = Field(..., max_length=500)


@router.get("/status")
def status():
    """Assistant availability + knowledge source."""
    return {
        "status": "ai-ready",
        "scope": "bounded-grounded-assistant",
        "provider": "knowledge-engine",
        "knowledge": knowledge.knowledge_stats(),
    }


@router.post("/ask")
def ask(body: AskRequest):
    """Answer a free-text question grounded in the knowledge database."""
    return assistant.ask(body.question)


@router.get("/knowledge")
def knowledge_overview():
    """Browsable index + stats of the knowledge base (for the UI)."""
    return {
        "stats": knowledge.knowledge_stats(),
        "categories": knowledge.list_categories(),
    }


@router.get("/browse")
def browse(category: str = Query("", max_length=40)):
    """Return entries in a knowledge category for a systematic browse view.

    Audit #9 fix: previously hardcoded `knowledge.seed.ENCYCLOPEDIA`. Now uses
    the `_rows()` helper so live Supabase data is respected (same as other
    knowledge endpoints).
    """
    cat = category.lower()
    rows = knowledge._rows("encyclopedia", knowledge.seed.ENCYCLOPEDIA)
    entries = [e for e in rows if e.get("category", "").lower() == cat]
    if not entries:
        entries = rows  # all entries, not just seed ones
    return {"category": cat, "entries": entries}
