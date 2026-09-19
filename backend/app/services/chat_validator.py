"""Post-generation safety layer for chat answers.

Deterministic checks only (no second LLM):
  1. Every UUID mentioned in the answer must have appeared in a tool result of this request.
  2. No causal or over-certain language (the system prompt forbids it; we enforce it).
"""

import re
from dataclasses import dataclass
from typing import Iterable, Optional, Set

UUID_RE = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
)

FORBIDDEN_PHRASES = re.compile(
    r"\b((?:loss|change|degradation|deforestation|disturbance) (?:was )?(?:caused by|resulted from|led to)|"
    r"responsible for (?:the )?(?:loss|deforestation|damage)|"
    r"confirmed deforestation|habitat (?:was |is |has been )?destroyed|destroyed the habitat)\b",
    re.IGNORECASE,
)
# Causal over-certainty or definitive destruction in supported Indian languages / Hinglish
FORBIDDEN_NON_ENGLISH = re.compile(
    r"(जंगल (?:पूरी तरह )?नष्ट|आवास (?:पूरी तरह )?नष्ट|confirmed deforestation|"
    r"jungle (?:puri tarah )?nasht|habitat destroy ho gaya|"
    r"(?:के कारण|की वजह से)(?:\s+हुआ|\s+हुई|\s+हुए)?|"
    r"(?:ki wajah se|ke karan)(?:\s+hua)?)",
    re.IGNORECASE,
)

RETRY_REMINDER = (
    "Your previous answer referenced data not returned by any tool. Only use tool results. "
    "Do not state causes, and do not mention any event ID that a tool did not return."
)
FALLBACK_ANSWER = (
    "I couldn't generate a fully grounded answer — please rephrase or ask about a specific event."
)


@dataclass
class ValidationResult:
    ok: bool
    reason: Optional[str] = None


_DASHES = dict.fromkeys(map(ord, "‐‑‒–—―−"), "-")


def extract_uuids(text: str) -> Set[str]:
    """UUIDs in text; models often emit non-breaking/unicode hyphens, so normalise them first."""
    return {m.lower() for m in UUID_RE.findall(text.translate(_DASHES))}


def validate_answer(answer: str, known_ids: Iterable[str]) -> ValidationResult:
    known = {k.lower() for k in known_ids}
    unknown = extract_uuids(answer) - known
    if unknown:
        return ValidationResult(False, f"ungrounded_ids:{sorted(unknown)}")
    phrase = FORBIDDEN_PHRASES.search(answer) or FORBIDDEN_NON_ENGLISH.search(answer)
    if phrase:
        return ValidationResult(False, f"forbidden_language:{phrase.group(0).lower()}")
    return ValidationResult(True)
