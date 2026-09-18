from typing import Tuple

import numpy as np
from shapely.geometry import shape

from app.analysis.builtup import execute_builtup_analysis
from app.providers.base import (
    AnalysisContext,
    AnalysisRequestData,
    CapabilityResult,
    ChangeProvider,
    LayerResult,
)


class FixtureBuiltupProvider(ChangeProvider):
    """Deterministic synthetic built-up change provider.

    Implements ChangeProvider Protocol.
    Strictly labeled synthetic in all metadata, provenance, and attribution per rules.md.
    Labeling Invariant: All difference outputs are labeled 'probability change', never 'construction area'.
    """

    METHOD_VERSION = "builtup-v1"

    async def check_capability(self, request: AnalysisRequestData) -> CapabilityResult:
        return CapabilityResult(
            supported=True,
            reason="Synthetic built-up change fixture provider is operational.",
            limits={
                "max_aoi_km2": 2500,
                "native_resolution_m": 10,
                "surface_type": "probability change",
            },
        )

    async def analyze(self, context: AnalysisContext) -> LayerResult:
        # Check for test-injected failure
        if "fail-builtup" in context.configuration_id:
            return LayerResult(
                status="failed",
                method_version=self.METHOD_VERSION,
                error_code="PROVIDER_ERROR",
                error_details={"reason": "Injected builtup provider simulation failure for test isolation verification."},
                provenance={
                    "provider": "fixture-builtup-v0",
                    "synthetic": True,
                    "injected_failure": True,
                },
                warnings=["Simulated layer failure injected via configuration_id."],
            )

        geom = shape(context.aoi)
        min_lon, min_lat, max_lon, max_lat = geom.bounds
        bbox_geo: Tuple[float, float, float, float] = (min_lon, min_lat, max_lon, max_lat)

        grid_shape = (50, 50)

        # Valid support arrays
        base_valid = np.ones(grid_shape, dtype=bool)
        comp_valid = np.ones(grid_shape, dtype=bool)
        base_valid[0:2, 0:2] = False
        comp_valid[0:2, 0:2] = False

        # Baseline: Rural / vegetated / non-builtup (probability ~ 0.10 everywhere)
        base_prob = np.full(grid_shape, 0.10, dtype=np.float32)

        # Comparison: Expansion cluster at [20:30, 20:30] where probability increases to 0.85
        # and an ambiguous transition ring [30:35, 20:30] with probability 0.50
        comp_prob = np.full(grid_shape, 0.10, dtype=np.float32)
        comp_prob[20:30, 20:30] = 0.85
        comp_prob[30:35, 20:30] = 0.50

        analysis_out = execute_builtup_analysis(
            baseline_prob=base_prob,
            baseline_valid=base_valid,
            comparison_prob=comp_prob,
            comparison_valid=comp_valid,
            bbox_geo=bbox_geo,
            pixel_size_m=10.0,
            builtup_threshold=0.65,
            non_builtup_threshold=0.35,
            min_component_area_ha=0.10,
        )

        provenance = {
            "provider": "fixture-builtup-v0",
            "synthetic": True,
            "surface_classification": "probability change",
            "builtup_threshold": 0.65,
            "non_builtup_threshold": 0.35,
            "pixel_resolution_m": 10.0,
            "baseline_window": f"{context.baseline_start} to {context.baseline_end}",
            "comparison_window": f"{context.comparison_start} to {context.comparison_end}",
        }

        return LayerResult(
            status=analysis_out["status"],
            method_version=self.METHOD_VERSION,
            quality_label=analysis_out["quality_label"],
            metrics=analysis_out["metrics"],
            events=analysis_out["events"],
            provenance=provenance,
            warnings=[
                "Surfaced differences represent probability change, never verified physical construction area.",
                "Ambiguous pixels (0.35 <= p <= 0.65) retained unclassified.",
            ],
        )
