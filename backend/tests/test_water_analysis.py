import numpy as np

from app.analysis.water import (
    classify_water_probabilities,
    detect_water_change,
    execute_water_analysis,
)


def test_water_classification_thresholds_and_ambiguity():
    """Verify that water, land, and ambiguous pixels are classified according to thresholds."""
    # 3x3 grid
    probs = np.array(
        [
            [0.90, 0.75, 0.50],  # water, water, ambiguous
            [0.30, 0.20, 0.10],  # ambiguous, land, land
            [0.85, 0.40, 0.05],  # water, ambiguous, land
        ],
        dtype=np.float32,
    )
    valid = np.ones((3, 3), dtype=bool)

    is_water, is_land, is_ambig = classify_water_probabilities(
        probs, valid, water_threshold=0.70, land_threshold=0.30
    )

    # Water: probs > 0.70
    assert np.array_equal(
        is_water,
        np.array(
            [
                [True, True, False],
                [False, False, False],
                [True, False, False],
            ]
        ),
    )

    # Land: probs < 0.30
    assert np.array_equal(
        is_land,
        np.array(
            [
                [False, False, False],
                [False, True, True],
                [False, False, True],
            ]
        ),
    )

    # Ambiguous: 0.30 <= probs <= 0.70
    assert np.array_equal(
        is_ambig,
        np.array(
            [
                [False, False, True],
                [True, False, False],
                [False, True, False],
            ]
        ),
    )


def test_water_gain_and_loss_transitions():
    """Verify separate gain and loss masks and retention of ambiguous transitions."""
    base_probs = np.array(
        [
            [0.10, 0.90],  # land, water
            [0.50, 0.10],  # ambiguous, land
        ],
        dtype=np.float32,
    )
    comp_probs = np.array(
        [
            [0.90, 0.10],  # water (GAIN), land (LOSS)
            [0.90, 0.50],  # water (AMBIGUOUS-BASE), ambiguous (AMBIGUOUS-COMP)
        ],
        dtype=np.float32,
    )
    valid = np.ones((2, 2), dtype=bool)

    gain_mask, loss_mask, ambig_mask, valid_comp = detect_water_change(
        base_probs, valid, comp_probs, valid, water_threshold=0.70, land_threshold=0.30
    )

    # Gain: (0, 0) went from land (0.10) to water (0.90)
    assert gain_mask[0, 0] is np.bool_(True)
    assert gain_mask[0, 1] is np.bool_(False)

    # Loss: (0, 1) went from water (0.90) to land (0.10)
    assert loss_mask[0, 1] is np.bool_(True)
    assert loss_mask[0, 0] is np.bool_(False)

    # Ambiguous: row 1 pixels contain ambiguous probability in either baseline or comparison
    assert ambig_mask[1, 0] is np.bool_(True)
    assert ambig_mask[1, 1] is np.bool_(True)
    assert gain_mask[1, 0] is np.bool_(False)
    assert loss_mask[1, 0] is np.bool_(False)


def test_zero_baseline_water_reports_null_relative_change():
    """Scientific Invariant (systemdesign.md): If baseline water area is zero, relative_change_pct is strictly None."""
    grid_shape = (20, 20)
    base_probs = np.full(grid_shape, 0.05, dtype=np.float32)  # Zero water anywhere in baseline
    base_valid = np.ones(grid_shape, dtype=bool)

    comp_probs = np.full(grid_shape, 0.05, dtype=np.float32)
    comp_probs[5:15, 5:15] = 0.95  # Water body emerges in comparison
    comp_valid = np.ones(grid_shape, dtype=bool)

    bbox_geo = (79.0, 21.0, 79.1, 21.1)

    result = execute_water_analysis(
        baseline_prob=base_probs,
        baseline_valid=base_valid,
        comparison_prob=comp_probs,
        comparison_valid=comp_valid,
        bbox_geo=bbox_geo,
        pixel_size_m=10.0,
        water_threshold=0.70,
        land_threshold=0.30,
        min_component_area_ha=0.01,
    )

    metrics = result["metrics"]
    assert metrics["baselinewaterareaha"] == 0.0
    assert metrics["comparisonwaterareaha"] > 0.0
    assert metrics["watergainareaha"] > 0.0
    # Must be strictly None (null in JSON), NOT 0.0 and NOT a ZeroDivisionError!
    assert metrics["relativechangepct"] is None
    assert len(result["events"]) >= 1
    assert result["events"][0]["changetype"] == "watergaincandidate"
