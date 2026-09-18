import numpy as np

from app.analysis.builtup import (
    classify_builtup_probabilities,
    execute_builtup_analysis,
)


def test_builtup_classification_and_ambiguity_thresholds():
    """Verify builtup, non-builtup, and ambiguous probability classifications."""
    probs = np.array(
        [
            [0.85, 0.50, 0.20],
            [0.10, 0.70, 0.35],
        ],
        dtype=np.float32,
    )
    valid = np.ones((2, 3), dtype=bool)

    is_built, is_non, is_ambig = classify_builtup_probabilities(
        probs, valid, builtup_threshold=0.65, non_builtup_threshold=0.35
    )

    # Builtup: > 0.65
    assert is_built[0, 0] is np.bool_(True)
    assert is_built[1, 1] is np.bool_(True)
    assert is_built[0, 1] is np.bool_(False)

    # Non-builtup: < 0.35
    assert is_non[0, 2] is np.bool_(True)
    assert is_non[1, 0] is np.bool_(True)

    # Ambiguous: 0.35 <= p <= 0.65
    assert is_ambig[0, 1] is np.bool_(True)
    assert is_ambig[1, 2] is np.bool_(True)


def test_builtup_probability_vs_area_labeling():
    """Critical Labeling Invariant (systemdesign.md, rules.md):

    Surfaced difference raster and metrics MUST be labeled 'probability change', NEVER 'construction area'.
    """
    grid_shape = (20, 20)
    base_probs = np.full(grid_shape, 0.15, dtype=np.float32)
    base_valid = np.ones(grid_shape, dtype=bool)

    comp_probs = np.full(grid_shape, 0.15, dtype=np.float32)
    comp_probs[5:15, 5:15] = 0.85  # Cluster probability increase
    comp_valid = np.ones(grid_shape, dtype=bool)

    bbox_geo = (79.0, 21.0, 79.1, 21.1)

    result = execute_builtup_analysis(
        baseline_prob=base_probs,
        baseline_valid=base_valid,
        comparison_prob=comp_probs,
        comparison_valid=comp_valid,
        bbox_geo=bbox_geo,
        pixel_size_m=10.0,
        builtup_threshold=0.65,
        non_builtup_threshold=0.35,
        min_component_area_ha=0.01,
    )

    metrics = result["metrics"]

    # Verify strict labeling invariant
    assert metrics["surfaced_label"] == "probability change"
    assert "construction area" not in str(metrics).lower()

    # Verify event labeling
    assert len(result["events"]) >= 1
    for evt in result["events"]:
        assert evt["label"] == "probability change"
        assert evt["changetype"] == "builtupprobabilitychangecandidate"
        assert "construction" not in evt["changetype"].lower()
