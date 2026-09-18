from collections import deque
from typing import Any, Dict, List, Tuple

import numpy as np
from shapely.geometry import Polygon, mapping


def classify_builtup_probabilities(
    prob_grid: np.ndarray,
    valid_mask: np.ndarray,
    builtup_threshold: float = 0.65,
    non_builtup_threshold: float = 0.35,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Classify built-up probability grid into distinct binary masks.

    Returns:
        (is_builtup, is_non_builtup, is_ambiguous)
    - Ambiguous pixels (non_builtup_threshold <= p <= builtup_threshold) are retained separately.
    - Invalid/no-data pixels are excluded from all three masks.
    """
    is_builtup = np.logical_and(valid_mask, prob_grid > builtup_threshold)
    is_non_builtup = np.logical_and(valid_mask, prob_grid < non_builtup_threshold)
    is_ambiguous = np.logical_and(
        valid_mask,
        np.logical_and(prob_grid >= non_builtup_threshold, prob_grid <= builtup_threshold),
    )
    return is_builtup, is_non_builtup, is_ambiguous


def detect_builtup_change(
    baseline_prob: np.ndarray,
    baseline_valid: np.ndarray,
    comparison_prob: np.ndarray,
    comparison_valid: np.ndarray,
    builtup_threshold: float = 0.65,
    non_builtup_threshold: float = 0.35,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Detect built-up probability changes between matched observation windows.

    Returns:
        (gain_mask, prob_difference, ambiguous_mask, valid_comparison_mask)

    Labeling Invariant (systemdesign.md, rules.md):
    - Output is strictly labeled 'probability change', never 'construction area'.
    """
    base_built, base_non, base_ambig = classify_builtup_probabilities(
        baseline_prob, baseline_valid, builtup_threshold, non_builtup_threshold
    )
    comp_built, comp_non, comp_ambig = classify_builtup_probabilities(
        comparison_prob, comparison_valid, builtup_threshold, non_builtup_threshold
    )

    valid_comparison = np.logical_and(baseline_valid, comparison_valid)

    # Gain candidate: transitioned from confirmed non-builtup to confirmed builtup
    gain_mask = np.logical_and(valid_comparison, np.logical_and(base_non, comp_built))

    # Retain ambiguous transitions separately without forcing
    ambiguous_mask = np.logical_and(valid_comparison, np.logical_or(base_ambig, comp_ambig))

    # Compute probability difference strictly on valid support
    prob_diff = np.full(baseline_prob.shape, np.nan, dtype=np.float32)
    np.subtract(comparison_prob, baseline_prob, out=prob_diff, where=valid_comparison)

    return gain_mask, prob_diff, ambiguous_mask, valid_comparison


def extract_builtup_connected_components_8conn(
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


def builtup_component_to_geojson_polygon(
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


def execute_builtup_analysis(
    baseline_prob: np.ndarray,
    baseline_valid: np.ndarray,
    comparison_prob: np.ndarray,
    comparison_valid: np.ndarray,
    bbox_geo: Tuple[float, float, float, float],
    pixel_size_m: float = 10.0,
    builtup_threshold: float = 0.65,
    non_builtup_threshold: float = 0.35,
    min_component_area_ha: float = 0.20,
) -> Dict[str, Any]:
    """Execute built-up change detection.

    Critical Labeling Rule (systemdesign.md):
    - All outputs and metrics are labeled 'probability change', NEVER 'construction area'.
    """
    gain_mask, prob_diff, ambig_mask, valid_comparison = detect_builtup_change(
        baseline_prob=baseline_prob,
        baseline_valid=baseline_valid,
        comparison_prob=comparison_prob,
        comparison_valid=comparison_valid,
        builtup_threshold=builtup_threshold,
        non_builtup_threshold=non_builtup_threshold,
    )

    pixel_area_ha = (pixel_size_m * pixel_size_m) / 10000.0

    valid_comp_count = int(np.sum(valid_comparison))
    gain_pixel_count = int(np.sum(gain_mask))
    ambig_pixel_count = int(np.sum(ambig_mask))

    builtup_gain_area_ha = round(gain_pixel_count * pixel_area_ha, 4)
    ambiguous_area_ha = round(ambig_pixel_count * pixel_area_ha, 4)
    valid_comparison_area_ha = round(valid_comp_count * pixel_area_ha, 4)

    # Compute mean probability change over valid comparison support
    mean_prob_change = 0.0
    if valid_comp_count > 0:
        valid_diffs = prob_diff[valid_comparison]
        mean_prob_change = round(float(np.mean(valid_diffs)), 4)

    # Extract connected components for builtup probability change candidates
    events: List[Dict[str, Any]] = []
    components = extract_builtup_connected_components_8conn(gain_mask)

    for comp in components:
        comp_area = len(comp) * pixel_area_ha
        if comp_area >= min_component_area_ha:
            geom = builtup_component_to_geojson_polygon(comp, bbox_geo, gain_mask.shape)
            comp_diffs = [prob_diff[r, c] for r, c in comp if not np.isnan(prob_diff[r, c])]
            comp_mean_prob_diff = round(float(np.mean(comp_diffs)), 4) if comp_diffs else 0.0

            events.append(
                {
                    "geometry": geom,
                    "changetype": "builtupprobabilitychangecandidate",
                    "affectedareaha": round(comp_area, 4),
                    "meanprobabilitychange": comp_mean_prob_diff,
                    "validpixelfraction": 1.0,
                    "qualitylabel": "usable",
                    "sourceconfidence": "nominal",
                    "label": "probability change",
                }
            )

    metrics = {
        "builtupgainareaha": builtup_gain_area_ha,
        "ambiguousareaha": ambiguous_area_ha,
        "validcomparisonareaha": valid_comparison_area_ha,
        "meanprobabilitychange": mean_prob_change,
        "surfaced_label": "probability change",
    }

    return {
        "status": "ready",
        "quality_label": "usable" if valid_comparison_area_ha > 0 else "degraded",
        "metrics": metrics,
        "events": events,
        "gain_mask": gain_mask,
        "probability_difference_raster": prob_diff,
        "ambiguous_mask": ambig_mask,
    }
