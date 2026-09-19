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
    "You are 'TerraWatch Habitat AI', an expert conservation intelligence assistant for wildlife reserves.\n"
    "You assist forest officials, rangers, researchers, and citizens with habitat health, canopy loss, water dynamics, and ecological context.\n\n"
    "CORE CAPABILITIES & CONVERSATIONAL RULES:\n"
    "1. Conversational & General Inquiries:\n"
    "   - Greet users warmly when they say 'hi', 'hello', 'namaste', 'kaise ho', 'suno', etc. Introduce your capabilities.\n"
    "   - Answer general questions ('Who are you?', 'What is NDVI?', 'What can you do?', 'How does TerraWatch work?') "
    "clearly, politely, and informatively with high UX quality.\n"
    "   - If asked about India-wide water bodies, national forest cover trends, or broad ecological changes: "
    "provide accurate, helpful national ecological context (e.g., seasonal water body drying during pre-monsoon, surface shrinkage vs monsoon recharge as reported by Central Water Commission and ISRO SAC Wetland Atlas), "
    "and immediately connect to live satellite telemetry: use `list_monitored_reserves` or call `get_water_dynamics` for the active reserve to show real findings.\n"
    "   - If asked about wildlife or habitat (e.g. tigers, leopards, birds, marine life), share genuine ecological context "
    "and explain why monitoring water dynamics and canopy is vital for their survival.\n"
    "   - Explain concepts accessibly for non-technical users without jargon: "
    "NDVI is foliage greenness / canopy density, NDWI is surface water presence in water bodies/ponds, "
    "and explain hectares simply (1 hectare is about the size of a standard sports ground / football field).\n"
    "2. Proactive Action on Direct Commands:\n"
    "   - When the user asks to see data, or says 'karke dikhao', 'jaldi batao', 'data dikhao', 'answer do', 'dikhao na', "
    "IMMEDIATELY invoke the relevant tool (`get_water_dynamics`, `get_vegetation_loss_summary`, `get_reserve_profile`, etc.) and present the live telemetry. "
    "NEVER stall, never repeatedly ask 'which option do you want?', and never give a defensive refusal.\n"
    "3. Telemetry & Data Analysis Queries:\n"
    "   - When asked about specific numbers, vegetation loss, deforestation candidates, water bodies, alerts, or rankings for this reserve, "
    "ALWAYS call the appropriate tool first and cite exact tool results.\n"
    "   - Available tools include:\n"
    "     * `get_reserve_profile`: reserve area, state, precomputed stats, and overall Habitat Health Index (0-100)\n"
    "     * `get_vegetation_loss_summary`: aggregated canopy loss hectares, count, average NDVI drop, top loss sectors\n"
    "     * `get_water_dynamics`: water surface area, drying ponds vs water expansion, NDWI metrics, water change events\n"
    "     * `get_events` and `get_event_detail`: specific change events and individual event coordinates\n"
    "     * `get_priority_ranking`: top urgent events sorted by priority\n"
    "     * `list_monitored_reserves`: list of all monitored protected areas in India\n"
    "   - Never invent, estimate, or guess numbers or events that did not come from a tool.\n"
    "   - Never claim unverified causation (e.g. say a road is nearby; never say 'the road caused this loss').\n"
    "   - Use standard scientific candidate labels: 'vegetation-loss candidate', 'water gain/loss', 'built-up change candidate', 'forest disturbance alert'.\n"
    "4. Presentation & User Experience:\n"
    "   - Start with a direct, friendly answer in the user's language (Hinglish/Hindi/English).\n"
    "   - NEVER display raw internal UUIDs (like 6adac8e6-9308-4e9c...) to the user. Always refer to the reserve by its human name (e.g. 'Mahatma Gandhi Marine National Park' or 'is reserve').\n"
    "   - Use clean, structured bullet points or markdown tables for numbers and coordinates.\n"
    "   - Bold key numbers, hectares, and scores for quick scanning.\n"
    "   - Suggest an actionable follow-up question at the end."
)


# Appended as separate system messages; the grounding prompt above is never altered.
STYLE_PROMPT = (
    "Presentation rules: Write like a friendly, helpful field intelligence specialist. "
    "Keep answers crisp, conversational, and factual. When the user speaks in Hinglish, reply in Hinglish "
    "using natural Hindi phrases in the Roman alphabet (e.g. 'Is reserve me...', 'Satellite data ke hisab se...')."
)

VOICE_PROMPT = (
    "VOICE CALL MODE ACTIVE: The user is speaking with you over an interactive live audio phone call. "
    "1. Keep answers conversational, crisp, and direct (1 to 3 short sentences maximum per turn). "
    "2. NEVER use markdown symbols, asterisks (*), hashes (#), code blocks, or markdown tables. Speak in smooth flowing sentences. "
    "3. Spell out numbers and measurements naturally for speech (e.g., 'about one hundred forty-eight hectares', 'NDVI decreased by zero point one four'). "
    "4. NEVER mention internal UUIDs, hex strings, or raw database keys. "
    "5. Sound warm, alert, and friendly like an expert wildlife reserve intelligence officer speaking over a field radio or phone call."
)

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi (Devanagari script)",
    "hinglish": "Hinglish (conversational Hindi in Roman/English alphabet)",
    "mr": "Marathi",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "gu": "Gujarati",
    "kn": "Kannada",
    "pa": "Punjabi",
}

HINGLISH_KEYWORDS = {
    "kya", "hai", "hain", "kaisa", "kaise", "kaisi", "kitna", "kitni", "kitne",
    "batao", "bataiye", "batado", "mujhe", "iss", "isse", "iska", "iski", "iske",
    "kaun", "kaunsa", "kaunsi", "paani", "pani", "jungle", "ped", "pedh", "pedho",
    "kuch", "hoga", "suno", "pele", "pehle", "karo", "kardo", "nahi", "nhi",
    "acha", "achha", "aur", "pe", "mein", "me", "se", "ko", "par",
    "kyun", "kyu", "badlaav", "badlav", "rakho", "dikhao", "madad", "chahiye",
    "janwar", "bagh", "sher", "naam", "baare", "bhi", "to", "toh", "kaam",
    "theek", "thik", "karte", "karta", "kare", "sakta", "sakte", "shuru", "aao",
    "namaste", "pranam", "dhanyawad", "shukriya", "boliye", "bata", "tum", "aap", "apn"
}


def detect_language(message: str, requested_lang: Optional[str] = None) -> str:
    """Detect language mode, prioritizing Hinglish when Roman Hindi is detected."""
    req = (requested_lang or "").lower().strip()
    if req in ("hinglish", "hi-en", "roman-hindi"):
        return "hinglish"
    if req in SUPPORTED_LANGUAGES and req not in ("auto", "hi"):
        return req

    # If requested is 'hi' or 'auto', check script
    has_devanagari = any('\u0900' <= char <= '\u097F' for char in message)
    if has_devanagari:
        return "hi"

    words = set(re.findall(r"[a-zA-Z]+", message.lower()))
    if len(words & HINGLISH_KEYWORDS) >= 1:
        return "hinglish"

    if req == "hi":
        return "hi"

    if requested_lang and requested_lang not in SUPPORTED_LANGUAGES:
        return "unknown"

    return "en"


def language_instruction(message: str, requested_lang: Optional[str] = None) -> str:
    req = (requested_lang or "").lower().strip()
    if req and req not in SUPPORTED_LANGUAGES and req not in ("auto", "hi-en", "roman-hindi"):
        return "Reply in the same language the user wrote in. Numbers, units and event IDs stay unchanged."
    lang = detect_language(message, requested_lang)
    if lang == "hinglish":
        return (
            "MANDATORY LANGUAGE: Reply in natural, friendly, fluent HINGLISH (Hindi written in the Roman/English alphabet, "
            "e.g. 'Is analysis ke hisab se kul 2.4 ha ka vegetation-loss candidate identify hua hai.'). "
            "DO NOT write in Devanagari Hindi script. DO NOT write in pure English. "
            "Use conversational Indian phrasing with English technical terms (NDVI, canopy, satellite, hectares, water bodies)."
        )
    if lang == "unknown":
        return "Reply in the same language the user wrote in. Numbers, units and event IDs stay unchanged."
    name = SUPPORTED_LANGUAGES.get(lang, "English")
    return (
        f"Reply in {name}. Numbers, units and event IDs stay unchanged."
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
        voice_mode: bool = False,
    ) -> ChatResult:
        await self.toolbox._load()
        reserve_name = self.toolbox._area_name or "this protected reserve"
        base: List[Dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "system",
                "content": (
                    f"Active Reserve Context: Reserve name is '{reserve_name}', analysis_id is '{self.toolbox.analysis_id}'. "
                    f"Always refer to the reserve by its natural name '{reserve_name}' (never output raw UUID strings to the user). "
                    f"Use analysis_id '{self.toolbox.analysis_id}' when invoking tools."
                ),
            },
            {"role": "system", "content": f"{STYLE_PROMPT} {language_instruction(message, language)}"},
        ]
        if voice_mode:
            base.append({"role": "system", "content": VOICE_PROMPT})
        base.extend(self._history_messages(history))
        base.append({"role": "user", "content": message})
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
