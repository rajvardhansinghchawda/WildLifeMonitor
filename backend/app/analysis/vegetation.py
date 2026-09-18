from collections import deque
from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple

import numpy as np
from shapely.geometry import Polygon, mapping


@dataclass
class VegetationMetrics:
    mean_ndvi_change: float
    vegetation_loss_area_ha: float
    valid_pixel_fraction: float
    total_aoi_pixels: int
    common_valid_pixels: int
    candidate_pixels: int


@dataclass
class VegetationEventCandidate:
    component_id: int
    geometry: Dict[str, Any]
    affected_area_ha: float
    mean_ndvi_change: float
    valid_pixel_fraction: float
    pixel_count: int


@dataclass
class VegetationAnalysisResult:
    status: str
    quality_label: str
    metrics: VegetationMetrics
    events: List[VegetationEventCandidate]
    diff_grid: np.ndarray
    valid_mask: np.ndarray
    warnings: List[str] = field(default_factory=list)


def mask_scl_and_reflectance(
    b4: np.ndarray,
    b8: np.ndarray,
    scl: np.ndarray,
    min_reflectance_sum: float = 1e-4,
) -> Tuple[np.ndarray, np.ndarray]:
    """Compute per-pixel NDVI with strict zero-denominator and cloud/shadow masking.

    Scientific Rules (rules.md, systemdesign.md):
    - Valid SCL classes: 4 (vegetation), 5 (bare soil / not vegetated), 6 (water).
    - Invalid SCL classes: 0 (no data), 1 (saturated/defective), 2 (dark area), 3 (shadow),
      7 (unclassified), 8 (cloud med), 9 (cloud high), 10 (cirrus), 11 (snow).
    - Zero-Denominator Masking (Zero Data Fabrication):
      Pixels where (B4 + B8) == 0 or (B4 + B8) < min_reflectance_sum are unobserved/corrupt.
      They are explicitly masked out of the valid pixel mask.
      They are NEVER smoothed to 0.0 or treated as 'no change'.
    """
    # SCL validity mask
    valid_scl = np.isin(scl, [4, 5, 6])

    # Reflectance sum check
    denom = b4 + b8
    valid_denom = denom >= min_reflectance_sum
    valid_range = np.logical_and(b4 >= 0.0, b8 >= 0.0)

    # Combined valid support for this observation
    valid_mask = np.logical_and(valid_scl, np.logical_and(valid_denom, valid_range))

    # Safe NDVI calculation strictly on valid pixels
    ndvi = np.full(b4.shape, np.nan, dtype=np.float32)
    np.divide(b8 - b4, denom, out=ndvi, where=valid_mask)
    np.clip(ndvi, -1.0, 1.0, out=ndvi, where=valid_mask)

    return ndvi, valid_mask


def build_temporal_composite(
    ndvi_stack: List[np.ndarray],
    mask_stack: List[np.ndarray],
) -> Tuple[np.ndarray, np.ndarray]:
    """Build comparable temporal composite using median reducer over valid observations."""
    if not ndvi_stack:
        raise ValueError("At least one observation is required for compositing.")

    stack_shape = ndvi_stack[0].shape
    composite = np.full(stack_shape, np.nan, dtype=np.float32)

    # For each pixel, compute median over available valid observations
    stacked_ndvi = np.stack(ndvi_stack, axis=0)  # (N, H, W)
    stacked_masks = np.stack(mask_stack, axis=0)  # (N, H, W)

    # Any pixel with at least 1 valid observation is valid in the composite
    valid_counts = np.sum(stacked_masks, axis=0)
    composite_valid: np.ndarray = np.asarray(valid_counts > 0, dtype=bool)

    # Compute nanmedian where valid observations exist
    masked_stack = np.where(stacked_masks, stacked_ndvi, np.nan)
    # Ignore RuntimeWarning for all-nan slices
    with np.errstate(all="ignore"):
        composite = np.nanmedian(masked_stack, axis=0)

    return composite, composite_valid


def extract_connected_components_8conn(
    binary_grid: np.ndarray,
) -> List[List[Tuple[int, int]]]:
    """Extract 8-connected components from a 2D boolean grid using BFS."""
    h, w = binary_grid.shape
    visited = np.zeros((h, w), dtype=bool)
    components = []

    # 8-connected neighbor offsets
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


def component_to_geojson_polygon(
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

    # Invert row to latitude (row 0 is max_lat)
    p_min_lon = min_lon + min_c * lon_res
    p_max_lon = min_lon + max_c * lon_res
    p_max_lat = max_lat - min_r * lat_res
    p_min_lat = max_lat - max_r * lat_res

    # Construct bounding polygon for the component
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


def execute_vegetation_analysis(
    baseline_b4_stack: List[np.ndarray],
    baseline_b8_stack: List[np.ndarray],
    baseline_scl_stack: List[np.ndarray],
    comparison_b4_stack: List[np.ndarray],
    comparison_b8_stack: List[np.ndarray],
    comparison_scl_stack: List[np.ndarray],
    bbox_geo: Tuple[float, float, float, float],
    pixel_size_meters: float = 10.0,
    change_threshold: float = -0.15,
    min_component_area_ha: float = 0.5,
    min_valid_coverage_fraction: float = 0.10,
) -> VegetationAnalysisResult:
    """Pure domain vegetation change analysis following systemdesign.md.

    Steps:
    1. Per-observation SCL and zero-reflectance masking.
    2. Temporal composite generation (median reducer).
    3. Common valid support calculation: diff = comp - base.
    4. Metrics extraction: mean_ndvi_change, vegetation_loss_area_ha, valid_pixel_fraction.
    5. Connected components extraction and minimum area filtering.
    """
    warnings: List[str] = []

    # 1. Baseline temporal composite
    base_ndvi_list = []
    base_mask_list = []
    for b4, b8, scl in zip(baseline_b4_stack, baseline_b8_stack, baseline_scl_stack):
        ndvi, mask = mask_scl_and_reflectance(b4, b8, scl)
        base_ndvi_list.append(ndvi)
        base_mask_list.append(mask)

    base_comp, base_valid = build_temporal_composite(base_ndvi_list, base_mask_list)

    # 2. Comparison temporal composite
    comp_ndvi_list = []
    comp_mask_list = []
    for b4, b8, scl in zip(comparison_b4_stack, comparison_b8_stack, comparison_scl_stack):
        ndvi, mask = mask_scl_and_reflectance(b4, b8, scl)
        comp_ndvi_list.append(ndvi)
        comp_mask_list.append(mask)

    comp_comp, comp_valid = build_temporal_composite(comp_ndvi_list, comp_mask_list)

    # 3. Common valid support
    common_valid_mask = base_valid & comp_valid
    total_aoi_pixels = int(base_comp.size)
    common_valid_pixels = int(np.sum(common_valid_mask))
    valid_pixel_fraction = (
        float(common_valid_pixels / total_aoi_pixels) if total_aoi_pixels > 0 else 0.0
    )

    # Check for insufficient observations
    if valid_pixel_fraction < min_valid_coverage_fraction:
        warnings.append(
            f"INSUFFICIENTVALIDOBSERVATIONS: Valid pixel coverage ({valid_pixel_fraction:.1%}) "
            f"is below the required minimum ({min_valid_coverage_fraction:.1%})."
        )
        return VegetationAnalysisResult(
            status="insufficientdata",
            quality_label="insufficient",
            metrics=VegetationMetrics(
                mean_ndvi_change=0.0,
                vegetation_loss_area_ha=0.0,
                valid_pixel_fraction=valid_pixel_fraction,
                total_aoi_pixels=total_aoi_pixels,
                common_valid_pixels=common_valid_pixels,
                candidate_pixels=0,
            ),
            events=[],
            diff_grid=np.full_like(base_comp, np.nan),
            valid_mask=common_valid_mask,
            warnings=warnings,
        )

    # 4. Compute difference on common valid support: comparison - baseline
    diff_grid = np.full(base_comp.shape, np.nan, dtype=np.float32)
    diff_grid[common_valid_mask] = comp_comp[common_valid_mask] - base_comp[common_valid_mask]

    mean_ndvi_change = float(np.mean(diff_grid[common_valid_mask]))

    # 5. Candidate pixels: negative NDVI change exceeding threshold
    candidate_mask = common_valid_mask & (diff_grid <= change_threshold)
    candidate_pixels = int(np.sum(candidate_mask))

    # Area per pixel in hectares (e.g. 10m x 10m = 100m² = 0.01 ha)
    pixel_area_ha = (pixel_size_meters * pixel_size_meters) / 10000.0
    vegetation_loss_area_ha = float(round(candidate_pixels * pixel_area_ha, 2))

    # 6. Quality labeling
    if valid_pixel_fraction >= 0.70:
        quality_label = "usable"
    elif valid_pixel_fraction >= 0.30:
        quality_label = "degraded"
        warnings.append(
            "DEGRADEDCOVERAGE: Moderate cloud/shadow masking reduced valid pixel coverage."
        )
    else:
        quality_label = "low_coverage"
        warnings.append(
            "LOWCOVERAGE: High cloud/shadow presence significantly limited valid observations."
        )

    # 7. Connected components extraction & minimum area filtering
    components = extract_connected_components_8conn(candidate_mask)
    events: List[VegetationEventCandidate] = []

    for idx, comp_pixels in enumerate(components, start=1):
        comp_area_ha = round(len(comp_pixels) * pixel_area_ha, 2)
        if comp_area_ha < min_component_area_ha:
            # Filter undersized noise
            continue

        # Compute component-level metrics
        comp_diffs = [diff_grid[r, c] for r, c in comp_pixels]
        comp_mean_change = float(round(np.mean(comp_diffs), 4))
        geom = component_to_geojson_polygon(comp_pixels, bbox_geo, base_comp.shape)

        events.append(
            VegetationEventCandidate(
                component_id=idx,
                geometry=geom,
                affected_area_ha=comp_area_ha,
                mean_ndvi_change=comp_mean_change,
                valid_pixel_fraction=round(valid_pixel_fraction, 4),
                pixel_count=len(comp_pixels),
            )
        )

    return VegetationAnalysisResult(
        status="ready",
        quality_label=quality_label,
        metrics=VegetationMetrics(
            mean_ndvi_change=round(mean_ndvi_change, 4),
            vegetation_loss_area_ha=vegetation_loss_area_ha,
            valid_pixel_fraction=round(valid_pixel_fraction, 4),
            total_aoi_pixels=total_aoi_pixels,
            common_valid_pixels=common_valid_pixels,
            candidate_pixels=candidate_pixels,
        ),
        events=events,
        diff_grid=diff_grid,
        valid_mask=common_valid_mask,
        warnings=warnings,
    )
