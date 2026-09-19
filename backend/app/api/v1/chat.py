import time
import uuid
from collections import defaultdict, deque
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException, NotFoundException
from app.core.security import ReadScope, _public_workspace_ids, get_read_scope
from app.db.session import get_db
from app.models.analysis import Analysis
from app.services.chat_agent import ChatAgent, ChatLLM, ChatUnavailableError, GroqClient
from app.services.chat_tools import ChatToolbox

router = APIRouter(prefix="/analyses", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=None, max_length=100)
    language: Optional[str] = Field(
        default=None, max_length=20, description="en|hi|hinglish|mr|bn|ta|te|gu|kn|pa; omit to auto-detect"
    )


class ChatResponse(BaseModel):
    answer: str
    tool_calls_made: List[str]
    grounded: bool


def get_chat_llm() -> ChatLLM:
    """Dependency so tests can substitute a scripted LLM."""
    return GroqClient()


@router.post("/{analysis_id}/chat", response_model=ChatResponse)
async def chat_about_analysis(
    analysis_id: str,
    request: ChatRequest,
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
    llm: ChatLLM = Depends(get_chat_llm),
):
    """Ask questions about one analysis; answers use only live data from our own database."""
    try:
        parsed = uuid.UUID(analysis_id)
    except ValueError:
        raise NotFoundException(message="Invalid analysis identifier.")
    visible = (
        await db.execute(
            select(Analysis.id).where(
                Analysis.id == parsed, Analysis.workspace_id.in_(scope.workspace_ids)
            )
        )
    ).scalar_one_or_none()
    if visible is None:
        raise NotFoundException(message="Analysis not found in workspace.")

    agent = ChatAgent(llm, ChatToolbox(db, scope, parsed))
    try:
        result = await agent.run(
            request.message, request.conversation_history, request.language
        )
    except ChatUnavailableError as exc:
        raise AppException(
            status_code=503, error_code="CHATUNAVAILABLE", message=f"Chat is unavailable: {exc}"
        )
    return ChatResponse(
        answer=result.answer, tool_calls_made=result.tool_calls_made, grounded=result.grounded
    )


# ---------------------------------------------------------------- public (no login) chat
public_router = APIRouter(prefix="/public", tags=["Public Chat"])

PUBLIC_RATE_LIMIT = 30  # generous rate limit for multi-judge hackathon evaluation
PUBLIC_RATE_WINDOW_S = 60.0
_public_hits: "dict[str, deque[float]]" = defaultdict(deque)


def _rate_limited(client_ip: str) -> bool:
    """In-process sliding window: protects the shared LLM quota while allowing smooth demonstration."""
    now = time.monotonic()
    hits = _public_hits[client_ip]
    while hits and now - hits[0] > PUBLIC_RATE_WINDOW_S:
        hits.popleft()
    if len(hits) >= PUBLIC_RATE_LIMIT:
        return True
    hits.append(now)
    return False


class PublicChatRequest(ChatRequest):
    analysis_id: str


@public_router.post("/chat", response_model=ChatResponse)
async def public_chat(
    request: PublicChatRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    llm: ChatLLM = Depends(get_chat_llm),
):
    """Unauthenticated chat restricted to curated public analyses (generalised coordinates)."""
    client_ip = http_request.client.host if http_request.client else "unknown"
    if _rate_limited(client_ip):
        raise AppException(
            status_code=429,
            error_code="RATELIMITED",
            message="Too many chat requests. Please wait a minute and try again.",
        )
    try:
        parsed = uuid.UUID(request.analysis_id)
    except ValueError:
        raise NotFoundException(message="Invalid analysis identifier.")
    public_ids = await _public_workspace_ids(db)
    if not public_ids:
        raise NotFoundException(message="No public analyses are available.")
    visible = (
        await db.execute(
            select(Analysis.id).where(Analysis.id == parsed, Analysis.workspace_id.in_(public_ids))
        )
    ).scalar_one_or_none()
    if visible is None:
        raise NotFoundException(message="Public analysis not found.")

    scope = ReadScope(context=None, own_workspace_id=public_ids[0], public_workspace_ids=public_ids[1:])  # type: ignore[arg-type]
    agent = ChatAgent(llm, ChatToolbox(db, scope, parsed, coord_precision=2))
    try:
        result = await agent.run(
            request.message, request.conversation_history, request.language
        )
    except ChatUnavailableError as exc:
        raise AppException(
            status_code=503, error_code="CHATUNAVAILABLE", message=f"Chat is unavailable: {exc}"
        )
    return ChatResponse(
        answer=result.answer, tool_calls_made=result.tool_calls_made, grounded=result.grounded
    )
