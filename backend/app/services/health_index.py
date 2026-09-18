"""Habitat Health Index (indicative) per protected area.

Adapted from the research briefing's composite score with one documented correction: the
original formula weights (0.4 vegetation + 0.3 water) can never exceed 70, so the weighted
components are re-normalised over the inputs that are actually available. A missing input is
listed as missing — it is never defaulted to zero (superpower.md: "Do not treat missing context
as zero pressure"). This is a product heuristic, NOT an ecologically validated index.
"""

from typing import Any, Dict, List, Optional

METHOD_VERSION = "habitat-health-v1"
DISCLAIMER = (
    "Indicative composite of satellite-derived change signals. Thresholds are heuristics and "
    "have not been ecologically validated; it does not measure species outcomes."
)
WEIGHT_VEGETATION = 0.4
WEIGHT_WATER = 0.3


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def band_for(score: float) -> str:
    if score >= 80:
        return "stable"
    if score >= 60:
        return "minor"
    if score >= 40:
        return "moderate"
    return "critical"


def compute_health_index(
    vegetation: Optional[Dict[str, Any]],
    water: Optional[Dict[str, Any]],
    builtup: Optional[Dict[str, Any]],
    gfw_alert_count: Optional[int] = None,
) -> Dict[str, Any]:
    components: Dict[str, Optional[float]] = {"vegetation": None, "water": None}
    used: List[str] = []
    missing: List[str] = []

    if vegetation and vegetation.get("meanndvichange") is not None:
        components["vegetation"] = round(_clamp(50 + 200 * float(vegetation["meanndvichange"])), 1)
        used.append("Vegetation NDVI change (Sentinel-2)")
    else:
        missing.append("Vegetation NDVI change")

    if water and water.get("relativechangepct") is not None:
        components["water"] = round(_clamp(50 + float(water["relativechangepct"])), 1)
        used.append("Surface-water change (Dynamic World)")
    elif water:
        missing.append("Surface-water change (baseline water area is zero — undefined)")
    else:
        missing.append("Surface-water change")

    penalties: Dict[str, float] = {}
    if builtup and builtup.get("builtupgainareaha") is not None and builtup.get("aoiareaha"):
        gain_pct = float(builtup["builtupgainareaha"]) / float(builtup["aoiareaha"]) * 100.0
        penalties["builtup"] = round(min(30.0, 2.0 * gain_pct), 2)
        used.append("Built-up probability change (Dynamic World)")
    else:
        missing.append("Built-up probability change")

    if gfw_alert_count is not None:
        penalties["forest_alerts"] = float(min(50, gfw_alert_count * 5))
        used.append("Global Forest Watch deforestation alerts")
    else:
        missing.append("Global Forest Watch deforestation alerts (not configured)")

    weight_sum = 0.0
    weighted = 0.0
    if components["vegetation"] is not None:
        weighted += WEIGHT_VEGETATION * components["vegetation"]
        weight_sum += WEIGHT_VEGETATION
    if components["water"] is not None:
        weighted += WEIGHT_WATER * components["water"]
        weight_sum += WEIGHT_WATER

    score: Optional[float] = None
    band: Optional[str] = None
    if weight_sum > 0:
        score = round(_clamp(weighted / weight_sum - sum(penalties.values())), 1)
        band = band_for(score)

    return {
        "score": score,
        "band": band,
        "label": "Indicative — not ecologically validated",
        "method_version": METHOD_VERSION,
        "components": components,
        "penalties": penalties,
        "inputs_used": used,
        "inputs_missing": missing,
        "disclaimer": DISCLAIMER,
    }
