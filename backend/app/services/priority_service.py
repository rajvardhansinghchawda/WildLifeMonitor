import logging
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, cast

from geoalchemy2.shape import to_shape
from shapely.geometry import shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import ChangeEvent
from app.models.workspace import Workspace

logger = logging.getLogger(__name__)


@dataclass
class PriorityResult:
    priority_score: Optional[float]
    priority_method_version: str
    components: Optional[Dict[str, Optional[float]]]


class PriorityService:
    """Service implementing Investigation Priority scoring per superpower.md and spec.md.

    Contractual invariants:
    - Named 'Investigation Priority', never 'Habitat Health'.
    - Three normalized components (0.0 to 1.0):
        1. Magnitude (weight 0.50): change size or strength.
        2. Sensitivity (weight 0.30): intersection with configured conservation zones.
        3. Context (weight 0.20): proximity to configured pressure indicators (roads/settlements).
    - Formula: round((0.50 * magnitude + 0.30 * sensitivity + 0.20 * context) * 100.0, 1).
    - CRITICAL INVARIANT: If any required component is missing (e.g. no conservation zone config
      for the workspace), priority_score MUST be None (null in JSON). NEVER default missing context
      or sensitivity to 0.0 ('Do not treat missing context as zero pressure').
    - Method version: 'priority-v1'.
    """

    METHOD_VERSION = "priority-v1"
    WEIGHT_MAGNITUDE = 0.50
    WEIGHT_SENSITIVITY = 0.30
    WEIGHT_CONTEXT = 0.20

    def compute_priority(
        self,
        event_geom_dict: Dict[str, Any],
        affected_area_ha: float,
        mean_ndvi_change: Optional[float] = None,
        conservation_zones: Optional[List[Dict[str, Any]]] = None,
        pressure_indicators: Optional[Dict[str, Any]] = None,
        context_distances: Optional[Dict[str, float]] = None,
    ) -> PriorityResult:
        """Compute Investigation Priority score with strict null propagation on missing inputs."""
        # 1. Magnitude calculation (normalized 0.0 to 1.0)
        # Normalized by area (capped at 10 ha) and NDVI change intensity if present
        norm_area = min(1.0, max(0.0, affected_area_ha / 10.0))
        if mean_ndvi_change is not None:
            norm_ndvi = min(1.0, max(0.0, abs(mean_ndvi_change) / 0.5))
            magnitude = round(0.5 * norm_ndvi + 0.5 * norm_area, 4)
        else:
            magnitude = round(norm_area, 4)

        # 2. Sensitivity calculation (intersection with configured conservation zones)
        sensitivity: Optional[float] = None
        if conservation_zones is not None:
            # Workspace explicitly configured conservation zones
            evt_shapely = shape(event_geom_dict)
            has_intersection = False
            for zone in conservation_zones:
                zone_geom = shape(zone.get("geometry", zone))
                if evt_shapely.intersects(zone_geom):
                    has_intersection = True
                    break
            sensitivity = 1.0 if has_intersection else 0.0

        # 3. Context calculation (proximity to configured pressure indicators)
        context: Optional[float] = None
        if context_distances is not None:
            # Distances in meters, as persisted from ContextEnrichmentService
            # (app/services/context_enrichment_service.py: nearest_known_*_distance_m).
            road_dist_m = context_distances.get("nearest_known_road_distance_m")
            settlement_dist_m = context_distances.get("nearest_known_settlement_distance_m")
            valid_dists_m = [d for d in [road_dist_m, settlement_dist_m] if d is not None]
            if valid_dists_m:
                min_dist_km = min(valid_dists_m) / 1000.0
                # Closer pressure features = higher risk/priority (capped at 10km)
                context = round(max(0.0, 1.0 - min(1.0, min_dist_km / 10.0)), 4)
        elif pressure_indicators is not None:
            # Pressure indicators explicitly configured in workspace
            evt_shapely = shape(event_geom_dict)
            features = pressure_indicators.get("features", [])
            if features:
                min_dist_deg = float("inf")
                for feat in features:
                    feat_geom = shape(feat.get("geometry", feat))
                    dist = evt_shapely.distance(feat_geom)
                    if dist < min_dist_deg:
                        min_dist_deg = dist
                # Approximate 0.1 degree ~ 11 km
                context = round(max(0.0, 1.0 - min(1.0, min_dist_deg / 0.1)), 4)
            else:
                context = 0.0

        components = {
            "magnitude": magnitude,
            "sensitivity": sensitivity,
            "context": context,
        }

        # If ANY required component is missing (e.g. sensitivity is None or context is None),
        # priority_score MUST be None. Never treat missing context as zero pressure!
        if sensitivity is None or context is None:
            return PriorityResult(
                priority_score=None,
                priority_method_version=self.METHOD_VERSION,
                components=components,
            )

        # Weighted sum: 0.50 * magnitude + 0.30 * sensitivity + 0.20 * context
        weighted_sum = (
            (self.WEIGHT_MAGNITUDE * magnitude)
            + (self.WEIGHT_SENSITIVITY * sensitivity)
            + (self.WEIGHT_CONTEXT * context)
        )
        priority_score = round(weighted_sum * 100.0, 1)

        return PriorityResult(
            priority_score=priority_score,
            priority_method_version=self.METHOD_VERSION,
            components=components,
        )

    async def attach_priority_scores_to_events(
        self,
        session: AsyncSession,
        analysis_id: uuid.UUID,
        workspace_id: uuid.UUID,
    ) -> int:
        """Fetch workspace settings, evaluate priority for all analysis events, and persist updates."""
        # 1. Fetch workspace settings
        ws_query = select(Workspace).where(Workspace.id == workspace_id)
        ws_res = await session.execute(ws_query)
        workspace = ws_res.scalar_one_or_none()
        ws_settings: Dict[str, Any] = (
            cast(Dict[str, Any], workspace.settings) if workspace and workspace.settings else {}
        )

        conservation_zones = ws_settings.get("conservation_zones")
        pressure_indicators = ws_settings.get("pressure_indicators")

        # Sensitivity source: workspace-configured zones win; otherwise the real protected-area
        # boundary (OpenStreetMap) of the area this analysis was run for. No area and no
        # configured zones -> sensitivity stays missing and the score stays null.
        if conservation_zones is None:
            from app.models.analysis import Analysis
            from app.models.area import ProtectedArea

            analysis = await session.get(Analysis, analysis_id)
            if analysis is not None and analysis.area_id is not None:
                area = await session.get(ProtectedArea, analysis.area_id)
                if area is not None:
                    conservation_zones = [
                        {
                            "name": str(area.name),
                            "geometry": to_shape(area.boundary).__geo_interface__,
                        }
                    ]

        # 2. Fetch analysis events
        events_query = select(ChangeEvent).where(
            ChangeEvent.analysis_id == analysis_id,
            ChangeEvent.workspace_id == workspace_id,
        )
        events_res = await session.execute(events_query)
        events = list(events_res.scalars().all())

        updated_count = 0
        for evt in events:
            evt_any: Any = evt
            shapely_geom = to_shape(evt_any.geom)
            geom_dict = shapely_geom.__geo_interface__

            # Prefer the real per-event proximity data already computed by
            # ContextEnrichmentService and persisted on the event row over the
            # coarser workspace-level pressure_indicators fallback.
            context_distances: Optional[Dict[str, float]] = None
            if (
                evt_any.nearest_known_road_distance_m is not None
                or evt_any.nearest_known_settlement_distance_m is not None
            ):
                context_distances = {
                    "nearest_known_road_distance_m": evt_any.nearest_known_road_distance_m,
                    "nearest_known_settlement_distance_m": evt_any.nearest_known_settlement_distance_m,
                }

            res = self.compute_priority(
                event_geom_dict=geom_dict,
                affected_area_ha=float(evt_any.affected_area_ha),
                mean_ndvi_change=evt_any.mean_ndvi_change,
                conservation_zones=conservation_zones,
                pressure_indicators=pressure_indicators,
                context_distances=context_distances,
            )

            evt_any.priority_score = res.priority_score
            evt_any.priority_method_version = res.priority_method_version
            updated_count += 1

        await session.flush()
        logger.info(
            "Attached priority scores to %d ChangeEvents for analysis %s (conservation_zones configured: %s)",
            updated_count,
            analysis_id,
            conservation_zones is not None,
        )
        return updated_count


def compute_magnitude(affected_area_ha: float, mean_ndvi_change: Optional[float]) -> float:
    """Normalized 0-1 change magnitude (same definition PriorityService uses for its component)."""
    norm_area = min(1.0, max(0.0, affected_area_ha / 10.0))
    if mean_ndvi_change is not None:
        norm_ndvi = min(1.0, max(0.0, abs(mean_ndvi_change) / 0.5))
        return round(0.5 * norm_ndvi + 0.5 * norm_area, 4)
    return round(norm_area, 4)


def severity_band(magnitude: float) -> str:
    """Deterministic severity band derived ONLY from change magnitude (transparent, not invented)."""
    if magnitude < 0.25:
        return "low"
    if magnitude < 0.5:
        return "medium"
    if magnitude < 0.75:
        return "high"
    return "critical"
