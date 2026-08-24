"""AI assistant endpoints (Layer 4 — grounded assistant)."""
from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..services import assistant, knowledge

router = APIRouter(prefix="/api/ai", tags=["ai"])


class AskRequest(BaseModel):
    question: str


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
    """Return entries in a knowledge category for a systematic browse view."""
    cat = category.lower()
    entries = [e for e in knowledge.seed.ENCYCLOPEDIA if e["category"] == cat]
    if not entries:
        entries = knowledge.seed.ENCYCLOPEDIA
    return {"category": cat, "entries": entries}
