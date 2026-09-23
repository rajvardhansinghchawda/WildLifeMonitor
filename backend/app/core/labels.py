"""Scientifically defensible display labels (rules.md / frontend.md terminology table)."""

from typing import Dict

CHANGE_TYPE_LABELS: Dict[str, str] = {
    "vegetationlosscandidate": "Vegetation-loss candidate",
    "watergaincandidate": "Water-gain candidate",
    "waterlosscandidate": "Water-loss candidate",
    "builtupprobabilitychangecandidate": "Built-up probability change candidate",
    "forestalert": "Forest disturbance alert",
}

CHANGE_TYPE_LAYER: Dict[str, str] = {
    "vegetationlosscandidate": "vegetation",
    "watergaincandidate": "water",
    "waterlosscandidate": "water",
    "builtupprobabilitychangecandidate": "builtup",
    "forestalert": "forestalerts",
}

CHANGE_TYPE_SENSOR: Dict[str, str] = {
    "vegetation": "Sentinel-2 L2A",
    "water": "Dynamic World V1 (Sentinel-2)",
    "builtup": "Dynamic World V1 (Sentinel-2)",
    "forestalerts": "GFW integrated alerts",
}


def change_type_label(change_type: str) -> str:
    return CHANGE_TYPE_LABELS.get(change_type, change_type)
