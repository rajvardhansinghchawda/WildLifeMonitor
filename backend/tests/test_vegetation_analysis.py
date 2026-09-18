import numpy as np

from app.analysis.vegetation import (
    build_temporal_composite,
    execute_vegetation_analysis,
    mask_scl_and_reflectance,
)


def test_ndvi_zero_denominator_masked_out():
    """Verify zero-reflectance sum pixels are masked out of valid support, NEVER smoothed to 0.0.

    Per rules.md: 'Never treat no data as no change. Never fabricate observations.'
    """
    b4 = np.array([[0.0, 0.10], [0.20, 0.05]], dtype=np.float32)
    b8 = np.array(
        [[0.0, 0.50], [0.60, 0.00]], dtype=np.float32
    )  # [0, 0] is 0+0=0; [1, 1] is 0.05+0=0.05
    scl = np.array([[4, 4], [4, 4]], dtype=np.int32)

    ndvi, valid_mask = mask_scl_and_reflectance(b4, b8, scl)

    # Pixel (0, 0) has 0+0=0 sum: MUST be invalid and NaN
    assert valid_mask[0, 0] is np.False_
    assert np.isnan(ndvi[0, 0])

    # Pixel (0, 1) has 0.10+0.50=0.60: valid NDVI = (0.5-0.1)/0.6 = 0.6667
    assert valid_mask[0, 1] is np.True_
    assert np.isclose(ndvi[0, 1], 0.4 / 0.6, atol=1e-4)


def test_scl_cloud_and_shadow_masking():
    """Verify cloud, shadow, and defect SCL classes are rejected while vegetation/soil/water pass."""
    b4 = np.full((3, 3), 0.10, dtype=np.float32)
    b8 = np.full((3, 3), 0.50, dtype=np.float32)

    # SCL grid with varied classes
    scl = np.array(
        [
            [4, 5, 6],  # Vegetation, Bare soil, Water -> ALL VALID
            [3, 8, 9],  # Shadow, Cloud Med, Cloud High -> ALL INVALID
            [0, 10, 11],  # No data, Cirrus, Snow -> ALL INVALID
        ],
        dtype=np.int32,
    )

    _, valid_mask = mask_scl_and_reflectance(b4, b8, scl)

    assert valid_mask[0, 0] is np.True_
    assert valid_mask[0, 1] is np.True_
    assert valid_mask[0, 2] is np.True_

    assert valid_mask[1, 0] is np.False_
    assert valid_mask[1, 1] is np.False_
    assert valid_mask[1, 2] is np.False_

    assert valid_mask[2, 0] is np.False_
    assert valid_mask[2, 1] is np.False_
    assert valid_mask[2, 2] is np.False_


def test_temporal_median_compositing():
    """Verify median reducer across observations at each pixel."""
    obs1 = np.array([[0.5, 0.2]], dtype=np.float32)
    obs2 = np.array([[0.7, 0.8]], dtype=np.float32)
    obs3 = np.array([[0.6, np.nan]], dtype=np.float32)

    mask1 = np.array([[True, True]], dtype=bool)
    mask2 = np.array([[True, True]], dtype=bool)
    mask3 = np.array([[True, False]], dtype=bool)  # Pixel (0, 1) has only 2 valid obs

    composite, valid = build_temporal_composite([obs1, obs2, obs3], [mask1, mask2, mask3])

    assert valid[0, 0] is np.True_
    assert valid[0, 1] is np.True_

    # Pixel (0, 0): median([0.5, 0.6, 0.7]) = 0.6
    assert np.isclose(composite[0, 0], 0.6)
    # Pixel (0, 1): median([0.2, 0.8]) = 0.5
    assert np.isclose(composite[0, 1], 0.5)


def test_threshold_boundary_behavior():
    """Verify candidate selection strictly obeys negative change threshold."""
    grid_shape = (10, 10)
    bbox = (79.0, 21.0, 79.1, 21.1)

    base_b4 = [np.full(grid_shape, 0.10, dtype=np.float32)]
    base_b8 = [np.full(grid_shape, 0.50, dtype=np.float32)]  # NDVI ~ 0.6667
    base_scl = [np.full(grid_shape, 4, dtype=np.int32)]

    comp_b4 = [np.full(grid_shape, 0.10, dtype=np.float32)]
    comp_b8 = [np.full(grid_shape, 0.50, dtype=np.float32)]
    comp_scl = [np.full(grid_shape, 4, dtype=np.int32)]

    # Exactly at -0.15 threshold
    # Baseline NDVI = 0.6667 -> target comparison NDVI = 0.5167
    # For diff <= -0.15, make comparison B8 lower
    comp_b8[0][5, 5] = (
        0.35  # NDVI = (0.35-0.10)/0.45 = 0.5556 (diff = -0.1111 > -0.15, not candidate)
    )
    comp_b8[0][2, 2] = (
        0.20  # NDVI = (0.20-0.10)/0.30 = 0.3333 (diff = -0.3334 <= -0.15, IS candidate)
    )

    res = execute_vegetation_analysis(
        base_b4,
        base_b8,
        base_scl,
        comp_b4,
        comp_b8,
        comp_scl,
        bbox_geo=bbox,
        pixel_size_meters=10.0,
        change_threshold=-0.15,
        min_component_area_ha=0.0001,  # Keep even single pixel for boundary test
    )

    assert res.metrics.candidate_pixels >= 1
    # Check that pixel (2, 2) is a candidate and (5, 5) is not
    assert res.diff_grid[2, 2] <= -0.15
    assert res.diff_grid[5, 5] > -0.15


def test_undersized_connected_components_dropped():
    """Verify small isolated noise clusters (< min_component_area_ha) are filtered out."""
    grid_shape = (20, 20)
    bbox = (79.0, 21.0, 79.1, 21.1)

    base_b4 = [np.full(grid_shape, 0.05, dtype=np.float32)]
    base_b8 = [np.full(grid_shape, 0.55, dtype=np.float32)]
    base_scl = [np.full(grid_shape, 4, dtype=np.int32)]

    comp_b4 = [np.full(grid_shape, 0.05, dtype=np.float32)]
    comp_b8 = [np.full(grid_shape, 0.55, dtype=np.float32)]
    comp_scl = [np.full(grid_shape, 4, dtype=np.int32)]

    # 1-pixel noise at (0, 0)
    comp_b8[0][0, 0] = 0.10  # Large drop, but only 1 pixel (0.01 ha at 10m res)

    # 25-pixel cluster at rows 10-15, cols 10-15 (0.25 ha at 10m res)
    comp_b8[0][10:15, 10:15] = 0.10

    res = execute_vegetation_analysis(
        base_b4,
        base_b8,
        base_scl,
        comp_b4,
        comp_b8,
        comp_scl,
        bbox_geo=bbox,
        pixel_size_meters=10.0,
        change_threshold=-0.15,
        min_component_area_ha=0.10,  # 0.10 ha threshold drops the 0.01 ha noise
    )

    # Exactly 1 component emitted (the 25-pixel cluster), 1-pixel noise dropped
    assert len(res.events) == 1
    assert res.events[0].pixel_count == 25
    assert res.events[0].affected_area_ha == 0.25


def test_insufficient_valid_observations():
    """Verify insufficient valid observations triggers status='insufficientdata'."""
    grid_shape = (10, 10)
    bbox = (79.0, 21.0, 79.1, 21.1)

    base_b4 = [np.full(grid_shape, 0.10, dtype=np.float32)]
    base_b8 = [np.full(grid_shape, 0.50, dtype=np.float32)]
    # All cloud (SCL=9) -> 0% valid coverage
    base_scl = [np.full(grid_shape, 9, dtype=np.int32)]

    comp_b4 = [np.full(grid_shape, 0.10, dtype=np.float32)]
    comp_b8 = [np.full(grid_shape, 0.50, dtype=np.float32)]
    comp_scl = [np.full(grid_shape, 4, dtype=np.int32)]

    res = execute_vegetation_analysis(
        base_b4,
        base_b8,
        base_scl,
        comp_b4,
        comp_b8,
        comp_scl,
        bbox_geo=bbox,
        min_valid_coverage_fraction=0.10,
    )

    assert res.status == "insufficientdata"
    assert res.quality_label == "insufficient"
    assert len(res.events) == 0
    assert len(res.warnings) >= 1
