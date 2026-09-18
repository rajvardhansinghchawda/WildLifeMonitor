from typing import Tuple

import numpy as np
from shapely.geometry import shape

from app.analysis.water import execute_water_analysis
from app.providers.base import (
    AnalysisContext,
    AnalysisRequestData,
    CapabilityResult,
    ChangeProvider,
    LayerResult,
)


class FixtureWaterProvider(ChangeProvider):
    """Deterministic synthetic water change provider.

    Implements ChangeProvider Protocol.
    Strictly labeled synthetic in all metadata, provenance, and attribution per rules.md.
    """

    METHOD_VERSION = "water-v1"

    async def check_capability(self, request: AnalysisRequestData) -> CapabilityResult:
        return CapabilityResult(
            supported=True,
            reason="Synthetic water change fixture provider is operational.",
            limits={
                "max_aoi_km2": 2500,
                "native_resolution_m": 10,
                "supported_indices": ["NDWI", "MNDWI"],
            },
        )

    async def analyze(self, context: AnalysisContext) -> LayerResult:
        # Check for test-injected failure
        if "fail-water" in context.configuration_id:
            return LayerResult(
                status="failed",
                method_version=self.METHOD_VERSION,
                error_code="PROVIDER_ERROR",
                error_details={
                    "reason": "Injected water provider simulation failure for test isolation verification."
                },
                provenance={
                    "provider": "fixture-water-v0",
                    "synthetic": True,
                    "injected_failure": True,
                },
                warnings=["Simulated layer failure injected via configuration_id."],
            )

        geom = shape(context.aoi)
        min_lon, min_lat, max_lon, max_lat = geom.bounds
        bbox_geo: Tuple[float, float, float, float] = (min_lon, min_lat, max_lon, max_lat)

        grid_shape = (50, 50)

        # Valid observation support (all true except corner)
        base_valid = np.ones(grid_shape, dtype=bool)
        comp_valid = np.ones(grid_shape, dtype=bool)
        base_valid[0:2, 0:2] = False
        comp_valid[0:2, 0:2] = False

        # Support zero-baseline test scenario
        if "test-zero-baseline-water" in context.configuration_id:
            # Baseline has 0 water pixels anywhere (pure land 0.05 probability)
            base_prob = np.full(grid_shape, 0.05, dtype=np.float32)
            # Comparison develops a new water body (gain)
            comp_prob = np.full(grid_shape, 0.05, dtype=np.float32)
            comp_prob[20:30, 20:30] = 0.95
        else:
            # Normal scenario: Baseline has a water body at [15:35, 15:35]
            base_prob = np.full(grid_shape, 0.05, dtype=np.float32)
            base_prob[15:35, 15:35] = 0.95

            # Comparison: water body recedes on one side (loss: rows 15:22, cols 15:35)
            # and expands on another side (gain: rows 35:42, cols 15:35)
            # and has an ambiguous boundary band (prob = 0.50)
            comp_prob = np.full(grid_shape, 0.05, dtype=np.float32)
            comp_prob[22:35, 15:35] = 0.95  # retained core water
            comp_prob[35:42, 15:35] = 0.95  # gain zone
            comp_prob[15:22, 15:35] = 0.05  # loss zone
            comp_prob[42:45, 15:35] = 0.50  # ambiguous transition zone

        analysis_out = execute_water_analysis(
            baseline_prob=base_prob,
            baseline_valid=base_valid,
            comparison_prob=comp_prob,
            comparison_valid=comp_valid,
            bbox_geo=bbox_geo,
            pixel_size_m=10.0,
            water_threshold=0.70,
            land_threshold=0.30,
            min_component_area_ha=0.10,
        )

        provenance = {
            "provider": "fixture-water-v0",
            "synthetic": True,
            "method": "matched_period_water_probability",
            "water_threshold": 0.70,
            "land_threshold": 0.30,
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
                "Ambiguous probability pixels (0.30 <= p <= 0.70) retained unclassified without forced imputation."
            ],
        )
