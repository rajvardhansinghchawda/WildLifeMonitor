from collections import deque
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from shapely.geometry import Polygon, mapping


def classify_water_probabilities(
    prob_grid: np.ndarray,
    valid_mask: np.ndarray,
    water_threshold: float = 0.70,
    land_threshold: float = 0.30,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Classify a 2D water probability grid into distinct binary masks.

    Returns:
        (is_water, is_land, is_ambiguous) boolean arrays.
    - Ambiguous pixels (land_threshold <= p <= water_threshold) are retained separately.
    - Invalid/no-data pixels are excluded from all three masks.
    """
    is_water = np.logical_and(valid_mask, prob_grid > water_threshold)
    is_land = np.logical_and(valid_mask, prob_grid < land_threshold)
    is_ambiguous = np.logical_and(
        valid_mask,
        np.logical_and(prob_grid >= land_threshold, prob_grid <= water_threshold),
    )
    return is_water, is_land, is_ambiguous


def detect_water_change(
    baseline_prob: np.ndarray,
    baseline_valid: np.ndarray,
    comparison_prob: np.ndarray,
    comparison_valid: np.ndarray,
    water_threshold: float = 0.70,
    land_threshold: float = 0.30,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Detect surface water gain and loss transitions between matched periods.

    Returns:
        (gain_mask, loss_mask, ambiguous_change_mask, valid_comparison_mask)
    - gain_mask: baseline was land, comparison is water.
    - loss_mask: baseline was water, comparison is land.
    - ambiguous_change_mask: either period was ambiguous (retained separately, never forced).
    - valid_comparison_mask: both periods had valid observation data.
    """
    base_water, base_land, base_ambig = classify_water_probabilities(
        baseline_prob, baseline_valid, water_threshold, land_threshold
    )
    comp_water, comp_land, comp_ambig = classify_water_probabilities(
        comparison_prob, comparison_valid, water_threshold, land_threshold
    )

    valid_comparison = np.logical_and(baseline_valid, comparison_valid)

    # Gain: transitioned from definite land to definite water
    gain_mask = np.logical_and(valid_comparison, np.logical_and(base_land, comp_water))

    # Loss: transitioned from definite water to definite land
    loss_mask = np.logical_and(valid_comparison, np.logical_and(base_water, comp_land))

    # Ambiguous: either period was ambiguous while both are valid
    ambiguous_mask = np.logical_and(
        valid_comparison, np.logical_or(base_ambig, comp_ambig)
    )

    return gain_mask, loss_mask, ambiguous_mask, valid_comparison


def extract_water_connected_components_8conn(
    binary_grid: np.ndarray,
) -> List[List[Tuple[int, int]]]:
    """Extract 8-connected components from a 2D boolean grid using BFS."""
    h, w = binary_grid.shape
    visited = np.zeros((h, w), dtype=bool)
    components = []

    neighbors = [
        (-1, -1),
        (-1, 0),
        (-1, 1),
        (0, -1),
        (0, 1),
        (1, -1),
        (1, 0),
        (1, 1),
    ]

    for r in range(h):
        for c in range(w):
            if binary_grid[r, c] and not visited[r, c]:
                component = []
                queue = deque([(r, c)])
                visited[r, c] = True

                while queue:
                    curr_r, curr_c = queue.popleft()
                    component.append((curr_r, curr_c))

                    for dr, dc in neighbors:
                        nr, nc = curr_r + dr, curr_c + dc
                        if 0 <= nr < h and 0 <= nc < w:
                            if binary_grid[nr, nc] and not visited[nr, nc]:
                                visited[nr, nc] = True
                                queue.append((nr, nc))

                components.append(component)

    return components


def water_component_to_geojson_polygon(
    pixels: List[Tuple[int, int]],
    bbox_geo: Tuple[float, float, float, float],
    grid_shape: Tuple[int, int],
) -> Dict[str, Any]:
    """Convert component pixel coordinates to a GeoJSON Polygon in WGS84 coordinates."""
    min_lon, min_lat, max_lon, max_lat = bbox_geo
    h, w = grid_shape

    lon_res = (max_lon - min_lon) / w
    lat_res = (max_lat - min_lat) / h

    rows = [p[0] for p in pixels]
    cols = [p[1] for p in pixels]

    min_r, max_r = min(rows), max(rows) + 1
    min_c, max_c = min(cols), max(cols) + 1

    p_min_lon = min_lon + min_c * lon_res
    p_max_lon = min_lon + max_c * lon_res
    p_max_lat = max_lat - min_r * lat_res
    p_min_lat = max_lat - max_r * lat_res

    poly = Polygon(
        [
            (p_min_lon, p_min_lat),
            (p_max_lon, p_min_lat),
            (p_max_lon, p_max_lat),
            (p_min_lon, p_max_lat),
            (p_min_lon, p_min_lat),
        ]
    )
    return dict(mapping(poly))  # type: ignore[return-value]


def execute_water_analysis(
    baseline_prob: np.ndarray,
    baseline_valid: np.ndarray,
    comparison_prob: np.ndarray,
    comparison_valid: np.ndarray,
    bbox_geo: Tuple[float, float, float, float],
    pixel_size_m: float = 10.0,
    water_threshold: float = 0.70,
    land_threshold: float = 0.30,
    min_component_area_ha: float = 0.20,
) -> Dict[str, Any]:
    """Execute water change detection algorithm with strict scientific accounting.

    Invariants (systemdesign.md):
    - Ambiguous pixels stay unclassified separately; never forced into land or water.
    - If baseline water area is zero, relative_change_pct is strictly None (null in JSON).
    - Area calculations in hectares (1 ha = 10,000 m²).
    """
    gain_mask, loss_mask, ambig_mask, valid_comparison = detect_water_change(
        baseline_prob=baseline_prob,
        baseline_valid=baseline_valid,
        comparison_prob=comparison_prob,
        comparison_valid=comparison_valid,
        water_threshold=water_threshold,
        land_threshold=land_threshold,
    )

    pixel_area_ha = (pixel_size_m * pixel_size_m) / 10000.0

    # Base classifications
    base_water, _, _ = classify_water_probabilities(
        baseline_prob, baseline_valid, water_threshold, land_threshold
    )
    comp_water, _, _ = classify_water_probabilities(
        comparison_prob, comparison_valid, water_threshold, land_threshold
    )

    base_water_area_ha = round(float(np.sum(base_water) * pixel_area_ha), 4)
    comp_water_area_ha = round(float(np.sum(comp_water) * pixel_area_ha), 4)
    water_gain_area_ha = round(float(np.sum(gain_mask) * pixel_area_ha), 4)
    water_loss_area_ha = round(float(np.sum(loss_mask) * pixel_area_ha), 4)
    ambiguous_area_ha = round(float(np.sum(ambig_mask) * pixel_area_ha), 4)
    valid_comparison_area_ha = round(float(np.sum(valid_comparison) * pixel_area_ha), 4)

    net_water_change_ha = round(comp_water_area_ha - base_water_area_ha, 4)

    # Relative percentage change invariant: null if baseline is zero
    relative_change_pct: Optional[float] = None
    if base_water_area_ha > 0.0:
        relative_change_pct = round(
            float((net_water_change_ha / base_water_area_ha) * 100.0), 2
        )

    # Extract connected components for gain and loss events
    events: List[Dict[str, Any]] = []

    # Gain components
    gain_comps = extract_water_connected_components_8conn(gain_mask)
    for comp in gain_comps:
        comp_area = len(comp) * pixel_area_ha
        if comp_area >= min_component_area_ha:
            geom = water_component_to_geojson_polygon(comp, bbox_geo, gain_mask.shape)
            events.append(
                {
                    "geometry": geom,
                    "changetype": "watergaincandidate",
                    "affectedareaha": round(comp_area, 4),
                    "validpixelfraction": 1.0,
                    "qualitylabel": "usable",
                    "sourceconfidence": "nominal",
                }
            )

    # Loss components
    loss_comps = extract_water_connected_components_8conn(loss_mask)
    for comp in loss_comps:
        comp_area = len(comp) * pixel_area_ha
        if comp_area >= min_component_area_ha:
            geom = water_component_to_geojson_polygon(comp, bbox_geo, loss_mask.shape)
            events.append(
                {
                    "geometry": geom,
                    "changetype": "waterlosscandidate",
                    "affectedareaha": round(comp_area, 4),
                    "validpixelfraction": 1.0,
                    "qualitylabel": "usable",
                    "sourceconfidence": "nominal",
                }
            )

    metrics = {
        "baselinewaterareaha": base_water_area_ha,
        "comparisonwaterareaha": comp_water_area_ha,
        "watergainareaha": water_gain_area_ha,
        "waterlossareaha": water_loss_area_ha,
        "netwaterchangeha": net_water_change_ha,
        "ambiguousareaha": ambiguous_area_ha,
        "validcomparisonareaha": valid_comparison_area_ha,
        "relativechangepct": relative_change_pct,
    }

    return {
        "status": "ready",
        "quality_label": "usable" if valid_comparison_area_ha > 0 else "degraded",
        "metrics": metrics,
        "events": events,
        "gain_mask": gain_mask,
        "loss_mask": loss_mask,
        "ambiguous_mask": ambig_mask,
    }
