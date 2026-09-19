"""Grounded tool-calling chat agent ("Ask the Habitat") on the Groq OpenAI-compatible API."""

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Protocol, Set

import httpx

from app.core.config import settings
from app.services.chat_tools import TOOL_SCHEMAS, ChatToolbox
from app.services.chat_validator import (
    FALLBACK_ANSWER,
    RETRY_REMINDER,
    extract_uuids,
    validate_answer,
)

logger = logging.getLogger("chat_agent")

THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
UNRESOLVED_ANSWER = (
    "I was unable to resolve this question within the allowed number of data lookups. "
    "Please ask a narrower question."
)

SYSTEM_PROMPT = (
    "You are a data assistant for a wildlife habitat monitoring system. You must answer ONLY using "
    "data returned by the tools provided. Rules:\n"
    "- Never invent, estimate, or guess any number, location, or event that did not come from a tool "
    "result.\n"
    "- If the tools don't return enough data to answer, say so explicitly instead of guessing.\n"
    "- Never claim causation (e.g. never say 'the road caused this change' — you may only say a road "
    "is nearby, nothing more).\n"
    "- Never upgrade the severity language beyond what the data supports. Use these exact labels only: "
    "'vegetation-loss candidate', 'water gain/loss', 'built-up change candidate', 'forest disturbance "
    "alert'. Never say 'confirmed deforestation' or 'habitat destroyed'.\n"
    "- Every specific number or event you mention must be traceable to a tool result — reference the "
    "event ID when discussing a specific event.\n"
    "- If the user asks something outside the scope of this analysis's data (general knowledge, other "
    "locations, opinions), say plainly that it's outside what you can answer from this analysis.\n"
    "- Keep answers concise and factual, like a field briefing, not a marketing description."
)


# Appended as separate system messages; the grounding prompt above is never altered.
STYLE_PROMPT = (
    "Presentation rules (they never override the rules above): write like a friendly field briefing. "
    "Start with a one-sentence direct answer, then short bullet points. Bold the key numbers. "
    "Prefer bullet lists over wide tables (use a table only for 3+ events compared on 2-3 columns). "
    "Keep event IDs exactly as returned. Keep the exact English category labels "
    "('vegetation-loss candidate', 'water gain/loss', 'built-up change candidate', "
    "'forest disturbance alert') even when replying in another language; you may add a translation in "
    "brackets. End with one short suggestion of what the user can ask next. "
    "The user may write in any language: understand the question, ALWAYS call the relevant tool(s) "
    "first (translate the intent yourself), and never answer data questions without a tool result. "
    "Only ask the user to clarify if the question truly cannot be mapped to the available tools."
)

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi (Devanagari script)",
    "mr": "Marathi",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "gu": "Gujarati",
    "kn": "Kannada",
    "pa": "Punjabi",
}


def language_instruction(language: Optional[str]) -> str:
    name = SUPPORTED_LANGUAGES.get((language or "").lower())
    if name:
        return f"Reply in {name}. Numbers, units and event IDs stay unchanged."
    return (
        "Reply in the same language the user wrote in (for Hinglish, reply in simple Hinglish). "
        "Numbers, units and event IDs stay unchanged."
    )


class ChatUnavailableError(Exception):
    """The LLM backend is not configured or failed."""


class ChatLLM(Protocol):
    async def complete(
        self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Return the assistant message dict (role/content/tool_calls)."""
        ...


class GroqClient:
    """Groq chat client with an ordered model fallback chain.

    GROQMODEL may list several models separated by commas. When one is rate limited (429),
    overloaded (5xx) or fails to produce a valid tool call (400), the next model is tried, and
    the working model stays selected for the rest of the request.
    """

    RETRYABLE = {400, 404, 408, 413, 429, 500, 502, 503, 504}

    def __init__(self, api_key: Optional[str] = None, models: Optional[str] = None):
        self.api_key = api_key if api_key is not None else settings.GROQAPIKEY
        raw = models or settings.GROQMODEL
        self.models = [m.strip() for m in raw.split(",") if m.strip()]
        self.active = 0

    async def _post(self, model: str, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]):
        async with httpx.AsyncClient(timeout=60.0) as client:
            return await client.post(
                f"{GROQ_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": model,
                    "messages": messages,
                    "tools": tools,
                    "tool_choice": "auto",
                    "temperature": 0,
                },
            )

    async def complete(
        self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise ChatUnavailableError("GROQAPIKEY is not configured.")
        if not self.models:
            raise ChatUnavailableError("GROQMODEL is empty.")
        last_error = "no model attempted"
        for idx in range(self.active, len(self.models)):
            model = self.models[idx]
            try:
                resp = await self._post(model, messages, tools)
            except httpx.HTTPError as exc:
                last_error = f"{model}: {exc}"
                logger.warning("groq model %s failed: %s", model, exc)
                continue
            if resp.status_code == 200:
                self.active = idx
                message = resp.json()["choices"][0]["message"]
                out = {
                    k: message[k]
                    for k in ("role", "content", "tool_calls")
                    if message.get(k) is not None
                }
                if isinstance(out.get("content"), str):
                    out["content"] = THINK_RE.sub("", out["content"]).strip()
                return out
            last_error = f"{model}: HTTP {resp.status_code} {resp.text[:200]}"
            logger.warning("groq model %s unavailable (%s); trying next", model, resp.status_code)
            if resp.status_code not in self.RETRYABLE:
                break
        raise ChatUnavailableError(f"All chat models failed. Last: {last_error}")


@dataclass
class ChatResult:
    answer: str
    tool_calls_made: List[str] = field(default_factory=list)
    grounded: bool = False


class ChatAgent:
    def __init__(
        self,
        llm: ChatLLM,
        toolbox: ChatToolbox,
        max_iterations: Optional[int] = None,
        max_history_turns: Optional[int] = None,
    ):
        self.llm = llm
        self.toolbox = toolbox
        self.max_iterations = max_iterations or settings.CHATMAXLOOPITERATIONS
        self.max_history_turns = (
            settings.CHATMAXHISTORYTURNS if max_history_turns is None else max_history_turns
        )
        self.known_ids: Set[str] = {str(toolbox.analysis_id).lower()}
        self.tool_calls_made: List[str] = []

    def _history_messages(self, history: Optional[List[Dict[str, str]]]) -> List[Dict[str, Any]]:
        msgs: List[Dict[str, Any]] = []
        # Only user/assistant text is accepted from the client: no client-supplied system/tool roles.
        for turn in history or []:
            role, content = turn.get("role"), turn.get("content")
            if role in ("user", "assistant") and isinstance(content, str) and content.strip():
                msgs.append({"role": role, "content": content})
        keep = self.max_history_turns * 2
        return msgs[-keep:] if keep > 0 else []

    async def _run_tools(self, message: Dict[str, Any]) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        for call in message.get("tool_calls") or []:
            fn = call.get("function", {})
            name = fn.get("name", "")
            try:
                args = json.loads(fn.get("arguments") or "{}")
                if not isinstance(args, dict):
                    raise ValueError("arguments must be a JSON object")
            except (json.JSONDecodeError, ValueError) as exc:
                result: Dict[str, Any] = {"error": "bad_arguments", "message": str(exc)}
            else:
                result = await self.toolbox.call(name, args)
            payload = json.dumps(result, default=str)
            self.known_ids |= extract_uuids(payload)
            self.tool_calls_made.append(name)
            logger.info(
                "chat tool_call name=%s args=%s result=%s", name, fn.get("arguments"), payload[:4000]
            )
            results.append({"role": "tool", "tool_call_id": call.get("id", ""), "content": payload})
        return results

    async def _loop(self, messages: List[Dict[str, Any]]) -> Optional[str]:
        """Run the tool-calling loop; None if the hard iteration cap is hit."""
        for _ in range(self.max_iterations):
            reply = await self.llm.complete(messages, TOOL_SCHEMAS)
            if reply.get("tool_calls"):
                messages.append(
                    {
                        "role": "assistant",
                        "content": reply.get("content"),
                        "tool_calls": reply["tool_calls"],
                    }
                )
                messages.extend(await self._run_tools(reply))
                continue
            # Models often emit non-breaking hyphens; normalise for clean display.
            return str(reply.get("content") or "").replace("‑", "-").strip()
        logger.warning("chat loop hit max iterations (%s)", self.max_iterations)
        return None

    async def run(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        language: Optional[str] = None,
    ) -> ChatResult:
        base: List[Dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "system",
                "content": (
                    f"Context: this chat is about the analysis with analysis_id = "
                    f"{self.toolbox.analysis_id}. Use this analysis_id in tool calls."
                ),
            },
            {"role": "system", "content": f"{STYLE_PROMPT} {language_instruction(language)}"},
            *self._history_messages(history),
            {"role": "user", "content": message},
        ]
        for attempt in range(2):
            messages = list(base)
            if attempt == 1:
                messages.append({"role": "system", "content": RETRY_REMINDER})
            answer = await self._loop(messages)
            if answer is None:
                return ChatResult(UNRESOLVED_ANSWER, list(self.tool_calls_made), grounded=False)
            verdict = validate_answer(answer, self.known_ids)
            if verdict.ok:
                return ChatResult(answer, list(self.tool_calls_made), grounded=True)
            logger.warning("chat answer rejected (attempt %s): %s", attempt + 1, verdict.reason)
        return ChatResult(FALLBACK_ANSWER, list(self.tool_calls_made), grounded=False)
