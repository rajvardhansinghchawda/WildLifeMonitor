"""Service for generating natural language intelligence summaries of change hotspots.

Combines Groq LLM (LLaMA-3.3 / OSS models) with an instant, deterministic rule-based
natural-language fallback engine for zero-latency, 100% reliable field briefs.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger("hotspot_summarizer")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"


def _format_distance(dist_m: Optional[float]) -> str:
    if dist_m is None:
        return "an unknown distance"
    if dist_m < 1000:
        return f"{int(dist_m)} meters"
    return f"{(dist_m / 1000.0):.2f} km"


def _format_ha(ha: float) -> str:
    if ha < 0.01:
        return f"{ha:.4f} ha"
    if ha < 1.0:
        return f"{ha:.2f} ha"
    return f"{ha:.1f} ha"


def build_deterministic_summary(telemetry: Dict[str, Any], lang: str = "en") -> Dict[str, Any]:
    """Generate instant, accurate natural-language intelligence from factual telemetry."""
    area_name = telemetry.get("area_name") or "Protected Reserve"
    place_name = telemetry.get("place_name")
    location_label = f"{place_name}, {area_name}" if place_name else area_name

    ha = float(telemetry.get("affected_area_ha") or 0.0)
    ha_str = _format_ha(ha)
    change_label = telemetry.get("change_label") or "Vegetation disturbance candidate"
    severity = (telemetry.get("severity") or "medium").lower()

    b_val = telemetry.get("baseline_value")
    c_val = telemetry.get("comparison_value")
    mean_ndvi = telemetry.get("mean_ndvi_change")
    sensor = telemetry.get("sensor") or "Sentinel-2"

    road_dist = telemetry.get("nearest_known_road_distance_m")
    settlement_dist = telemetry.get("nearest_known_settlement_distance_m")
    priority_score = telemetry.get("priority_score")

    coords = telemetry.get("coordinates") or {}
    lat = coords.get("lat", 0.0)
    lon = coords.get("lon", 0.0)

    road_str = _format_distance(road_dist)
    settle_str = _format_distance(settlement_dist)
    p_fmt = f"{int(round(priority_score))}/100" if priority_score is not None else "Unscored"
    p_fmt_hi = f"{int(round(priority_score))}/100" if priority_score is not None else "N/A"
    b_str = f"{b_val:.3f}" if b_val is not None else "N/A"
    c_str = f"{c_val:.3f}" if c_val is not None else "N/A"

    # Determine nature of NDVI change
    if mean_ndvi is not None:
        if mean_ndvi <= -0.20:
            ndvi_desc_en = f"severe canopy loss of {mean_ndvi:.3f}"
            ndvi_desc_hi = f"canopy me {abs(mean_ndvi):.3f} ki gambhir girawat"
        elif mean_ndvi < 0:
            ndvi_desc_en = f"moderate vegetation drop of {mean_ndvi:.3f}"
            ndvi_desc_hi = f"canopy me {abs(mean_ndvi):.3f} ki girawat"
        else:
            ndvi_desc_en = f"vegetation index shift of +{mean_ndvi:.3f}"
            ndvi_desc_hi = f"vegetation index me +{mean_ndvi:.3f} ka badlav"
    else:
        ndvi_desc_en = "observable reflectance variation"
        ndvi_desc_hi = "satellite imagery me reflectance badlav"

    if lang in ("hinglish", "hi-en", "roman-hindi"):
        headline = f"{location_label} me {ha_str} ka {change_label}"
        short_summary = (
            f"{location_label} me lagbhag {ha_str} area par {change_label.lower()} detect hua hai. "
            f"NDVI {ndvi_desc_hi} darshata hai aur patrol corridor {road_str} doori par hai "
            f"(Priority: {p_fmt_hi})."
        )
        full_brief = (
            f"1. Incident Synopsis:\n"
            f"{sensor} satellite data ke aadhar par {location_label} me {ha_str} kshetra par "
            f"{change_label.lower()} paya gaya hai (Severity: {severity.upper()}).\n\n"
            f"2. Ecological Impact:\n"
            f"Vegetation indicator {b_str} se girkar {c_str} hua hai ({ndvi_desc_hi}). "
            f"Yeh seasonal sukhe ke bajay canopy opening ya van kataai ki sambhavna darshata hai.\n\n"
            f"3. Access & Field Verification:\n"
            f"Yeh sthan nearest patrol road se lagbhag {road_str} aur aabadi se {settle_str} door hai. "
            f"Priority score {p_fmt_hi} ke sath, "
            f"forest staff ko coordinates ({lat:.4f}° N, {lon:.4f}° E) par ground checking karne ki sifarish hai."
        )
        key_takeaways = [
            f"{location_label} me {ha_str} prabhavit kshetra",
            f"NDVI indicator me {ndvi_desc_hi} ({b_str} → {c_str})",
            f"Patrol road se {road_str} door; priority {p_fmt_hi}",
        ]
        recommended_action = (
            f"Ground verification team ko coordinates ({lat:.4f}° N, {lon:.4f}° E) par bhejkar "
            f"canopy damage ki jaanch karein."
        )
    else:
        headline = f"{change_label} ({ha_str}) in {location_label}"
        short_summary = (
            f"A {ha_str} {change_label.lower()} was detected in {location_label}. "
            f"Telemetry shows a {ndvi_desc_en} with road access within {road_str} "
            f"(Investigation Priority: {p_fmt})."
        )
        full_brief = (
            f"1. Incident Synopsis:\n"
            f"Earth observation sensors ({sensor}) identified a {ha_str} {change_label.lower()} "
            f"in {location_label}, classified at {severity.upper()} severity.\n\n"
            f"2. Ecological & Spectral Impact:\n"
            f"Vegetation greenness decreased from {b_str} to {c_str} ({ndvi_desc_en}). "
            f"The magnitude indicates abrupt canopy reduction rather than seasonal dry-down.\n\n"
            f"3. Corridor Proximity & Patrol Access:\n"
            f"The event is located {road_str} from the nearest patrol road corridor and {settle_str} from "
            f"the nearest settlement. With an investigation priority of {p_fmt}, "
            f"dispatching field rangers to coordinates ({lat:.4f}° N, {lon:.4f}° E) is recommended."
        )
        key_takeaways = [
            f"{ha_str} canopy change identified via {sensor}",
            f"Vegetation indicator dropped from {b_str} to {c_str} ({ndvi_desc_en})",
            f"Located {road_str} from patrol corridor; priority score {p_fmt}",
        ]
        recommended_action = (
            f"Conduct physical field patrol at coordinates ({lat:.4f}° N, {lon:.4f}° E) to confirm "
            f"canopy state and verify cause of disturbance."
        )

    return {
        "headline": headline,
        "short_summary": short_summary,
        "full_brief": full_brief,
        "key_takeaways": key_takeaways,
        "recommended_action": recommended_action,
        "confidence": "high",
        "source": "deterministic_engine",
        "language": lang,
    }


class HotspotSummarizerService:
    """Combines Groq LLM synthesis with an instant deterministic fallback."""

    @classmethod
    async def generate_summary(
        cls, telemetry: Dict[str, Any], lang: str = "en"
    ) -> Dict[str, Any]:
        """Generate a natural-language field intelligence brief."""
        # Step 1: Precompute fallback (0ms)
        fallback = build_deterministic_summary(telemetry, lang=lang)

        # Step 2: If Groq API key is missing, return fallback immediately
        api_key = settings.GROQAPIKEY
        if not api_key:
            return fallback

        # Step 3: Attempt fast LLM completion (4-second ceiling)
        raw_models = settings.GROQMODEL or "openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b"
        models = [m.strip() for m in raw_models.split(",") if m.strip()]
        model = models[0] if models else "openai/gpt-oss-120b"

        lang_instruction = (
            "Write in natural, fluent HINGLISH (conversational Hindi in Roman/English script, e.g. 'Is sector me...')."
            if lang in ("hinglish", "hi-en", "roman-hindi")
            else "Write in clear, authoritative, concise English for forest rangers."
        )

        system_prompt = (
            "You are 'TerraWatch Habitat Intelligence AI', an expert wildlife GIS analyst.\n"
            "Your role is to translate raw satellite telemetry into a concise, actionable field intelligence brief.\n"
            f"{lang_instruction}\n"
            "CRITICAL GROUNDING RULES:\n"
            "1. CITE ONLY the numbers, coordinates, hectares, and distances provided in the data.\n"
            "2. Never hallucinate causes (e.g. say 'near road', do not say 'road construction caused this').\n"
            "3. Return strict JSON matching the exact schema requested without markdown quotes or backticks."
        )

        user_content = (
            f"Synthesize this hotspot telemetry into a structured intelligence brief:\n"
            f"{json.dumps(telemetry, default=str)}\n\n"
            f"Output a JSON object with exactly these keys:\n"
            f"- headline: string (crisp 5-8 word title with place name and hectares)\n"
            f"- short_summary: string (1-2 clear, compact sentences for a slim card)\n"
            f"- full_brief: string (3 well-structured paragraphs covering: 1. Incident Synopsis, 2. Ecological Impact, 3. Patrol & Action)\n"
            f"- key_takeaways: list of exactly 3 concise bullet strings\n"
            f"- recommended_action: string (1 direct patrol action instruction)"
        )

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.post(
                    f"{GROQ_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_content},
                        ],
                        "temperature": 0.1,
                        "response_format": {"type": "json_object"},
                    },
                )
            if resp.status_code == 200:
                raw_json = resp.json()["choices"][0]["message"]["content"]
                # Clean up any potential markdown wrapper
                clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_json.strip())
                parsed = json.loads(clean_json)
                return {
                    "headline": str(parsed.get("headline") or fallback["headline"]),
                    "short_summary": str(parsed.get("short_summary") or fallback["short_summary"]),
                    "full_brief": str(parsed.get("full_brief") or fallback["full_brief"]),
                    "key_takeaways": list(parsed.get("key_takeaways") or fallback["key_takeaways"]),
                    "recommended_action": str(
                        parsed.get("recommended_action") or fallback["recommended_action"]
                    ),
                    "confidence": "high",
                    "source": "groq_llm",
                    "language": lang,
                }
            logger.warning("Groq API returned status %s; falling back to deterministic", resp.status_code)
        except Exception as exc:
            logger.warning("Groq summarization failed or timed out (%s); using deterministic fallback", exc)

        return fallback
