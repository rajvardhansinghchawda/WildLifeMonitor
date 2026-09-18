from typing import Tuple

import numpy as np
from shapely.geometry import shape

from app.analysis.vegetation import execute_vegetation_analysis
from app.providers.base import (
    AnalysisContext,
    AnalysisRequestData,
    CapabilityResult,
    ChangeProvider,
    LayerResult,
)


class FixtureVegetationProvider(ChangeProvider):
    """Deterministic synthetic Sentinel-2 L2A vegetation provider.

    Implements ChangeProvider Protocol.
    Strictly labeled synthetic in all metadata, provenance, and attribution per rules.md.
    """

    METHOD_VERSION = "vegetation-v1"

    async def check_capability(self, request: AnalysisRequestData) -> CapabilityResult:
        return CapabilityResult(
            supported=True,
            reason="Synthetic Sentinel-2 fixture provider is operational.",
            limits={
                "max_aoi_km2": 2500,
                "supported_bands": ["B4", "B8", "SCL"],
                "native_resolution_m": 10,
            },
        )

    async def analyze(self, context: AnalysisContext) -> LayerResult:
        # Extract bounding box from AOI geometry
        geom = shape(context.aoi)
        min_lon, min_lat, max_lon, max_lat = geom.bounds
        bbox_geo: Tuple[float, float, float, float] = (min_lon, min_lat, max_lon, max_lat)

        # Generate deterministic synthetic Sentinel-2 arrays (50x50 grid, ~10m resolution)
        grid_shape = (50, 50)

        # Baseline: Healthy lush forest (B4 ~ 0.06, B8 ~ 0.55 -> NDVI ~ 0.80)
        # 3 observations in temporal window
        base_b4 = [np.full(grid_shape, 0.06, dtype=np.float32) for _ in range(3)]
        base_b8 = [np.full(grid_shape, 0.55, dtype=np.float32) for _ in range(3)]
        # SCL: class 4 (vegetation) everywhere except small cloud patch
        base_scl = [np.full(grid_shape, 4, dtype=np.int32) for _ in range(3)]
        base_scl[0][0:5, 0:5] = 9  # Cloud high probability in obs 0

        # Comparison: Clearing patch in center (rows 20-30, cols 20-30)
        # Healthy background stays NDVI ~ 0.80, cleared patch drops to B4 ~ 0.18, B8 ~ 0.22 -> NDVI ~ 0.10
        comp_b4 = [np.full(grid_shape, 0.06, dtype=np.float32) for _ in range(3)]
        comp_b8 = [np.full(grid_shape, 0.55, dtype=np.float32) for _ in range(3)]
        comp_scl = [np.full(grid_shape, 4, dtype=np.int32) for _ in range(3)]

        for obs in range(3):
            comp_b4[obs][20:30, 20:30] = 0.18
            comp_b8[obs][20:30, 20:30] = 0.22

        # Include test zero-reflectance pixels in corners (must be masked, not fabricated)
        comp_b4[0][48:50, 48:50] = 0.0
        comp_b8[0][48:50, 48:50] = 0.0

        # Run pure domain vegetation engine
        analysis_result = execute_vegetation_analysis(
            baseline_b4_stack=base_b4,
            baseline_b8_stack=base_b8,
            baseline_scl_stack=base_scl,
            comparison_b4_stack=comp_b4,
            comparison_b8_stack=comp_b8,
            comparison_scl_stack=comp_scl,
            bbox_geo=bbox_geo,
            pixel_size_meters=10.0,
            change_threshold=-0.15,
            min_component_area_ha=0.10,
        )

        # Build events list
        events = [
            {
                "geometry": evt.geometry,
                "changetype": "vegetationlosscandidate",
                "affectedareaha": evt.affected_area_ha,
                "meanndvichange": evt.mean_ndvi_change,
                "validpixelfraction": evt.valid_pixel_fraction,
                "qualitylabel": analysis_result.quality_label,
                "sourceconfidence": None,
                "priorityscore": None,
                "prioritymethodversion": None,
                "status": "pendingfieldverification",
                "methodversion": self.METHOD_VERSION,
                "recordversion": 1,
            }
            for evt in analysis_result.events
        ]

        metrics = {
            "meanndvichange": analysis_result.metrics.mean_ndvi_change,
            "vegetationlossareaha": analysis_result.metrics.vegetation_loss_area_ha,
            "validpixelfraction": analysis_result.metrics.valid_pixel_fraction,
        }

        provenance = {
            "source": "synthetic_sentinel2_l2a_fixture",
            "synthetic": True,
            "attribution": "Synthetic Sentinel-2 L2A fixture — not real observations",
            "method_version": self.METHOD_VERSION,
            "analysis_crs": "EPSG:4326",
            "analysis_resolution_m": 10.0,
            "native_source_resolution_m": 10.0,
            "effective_observations": {"baseline": 3, "comparison": 3},
        }

        return LayerResult(
            status=analysis_result.status,
            method_version=self.METHOD_VERSION,
            quality_label=analysis_result.quality_label,
            metrics=metrics,
            events=events,
            provenance=provenance,
            warnings=analysis_result.warnings,
        )
