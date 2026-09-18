"""Shared read helpers for the Investigator-portal endpoints."""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.labels import CHANGE_TYPE_LAYER, CHANGE_TYPE_SENSOR, change_type_label
from app.models.analysis import Analysis
from app.models.area import ProtectedArea
from app.models.event import ChangeEvent
from app.models.workspace import Workspace
from app.schemas.portal import AreaSummary, Coordinates, HotspotItem
from app.services.alert_service import event_severity
from app.services.health_index import compute_health_index
from app.services.analysis_validation import calculate_polygon_area_km2

TERMINAL_OK = ("succeeded", "partial")


async def public_workspace_ids(db: AsyncSession) -> List[uuid.UUID]:
    rows = await db.execute(select(Workspace.id).where(Workspace.is_public.is_(True)))
    return [r[0] for r in rows.all()]


async def latest_analyses_by_area(
    db: AsyncSession,
    workspace_ids: Sequence[uuid.UUID],
    area_ids: Optional[Sequence[uuid.UUID]] = None,
) -> Dict[uuid.UUID, Analysis]:
    stmt = (
        select(Analysis)
        .options(selectinload(Analysis.layers))
        .where(
            Analysis.area_id.is_not(None),
            Analysis.workspace_id.in_(list(workspace_ids)),
            Analysis.status.in_(TERMINAL_OK),
        )
        .order_by(Analysis.area_id, Analysis.created_at.desc())
    )
    if area_ids is not None:
        stmt = stmt.where(Analysis.area_id.in_(list(area_ids)))
    latest: Dict[uuid.UUID, Analysis] = {}
    for analysis in (await db.execute(stmt)).scalars().all():
        if analysis.area_id not in latest:
            latest[analysis.area_id] = analysis  # type: ignore[index]
    return latest


def layer_metrics(analysis: Optional[Analysis]) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    if analysis is None:
        return out
    for layer in analysis.layers:
        if layer.status == "ready" and layer.metrics:
            out[str(layer.layer_type)] = dict(layer.metrics)  # type: ignore[arg-type]
    return out


def health_for_analysis(analysis: Optional[Analysis]) -> Optional[Dict[str, Any]]:
    if analysis is None:
        return None
    metrics = layer_metrics(analysis)
    result = compute_health_index(
        metrics.get("vegetation"), metrics.get("water"), metrics.get("builtup")
    )
    result["analysis_id"] = str(analysis.id)
    result["computed_at"] = analysis.updated_at.isoformat() if analysis.updated_at else None
    return result


async def event_counts(db: AsyncSession, analysis_ids: Sequence[uuid.UUID]) -> Dict[uuid.UUID, int]:
    if not analysis_ids:
        return {}
    rows = await db.execute(
        select(ChangeEvent.analysis_id, func.count(ChangeEvent.id))
        .where(ChangeEvent.analysis_id.in_(list(analysis_ids)))
        .group_by(ChangeEvent.analysis_id)
    )
    return {r[0]: int(r[1]) for r in rows.all()}


def build_area_summary(
    area: ProtectedArea, latest: Optional[Analysis], hotspot_count: int
) -> AreaSummary:
    return AreaSummary(
        id=str(area.id),
        slug=str(area.slug),
        name=str(area.name),
        designation=area.designation,  # type: ignore[arg-type]
        iucn_category=area.iucn_category,  # type: ignore[arg-type]
        country=area.country,  # type: ignore[arg-type]
        country_code=area.country_code,  # type: ignore[arg-type]
        state=area.state,  # type: ignore[arg-type]
        biome=area.biome,  # type: ignore[arg-type]
        area_km2=float(area.area_km2),  # type: ignore[arg-type]
        coordinates=Coordinates(lat=float(area.centroid_lat), lon=float(area.centroid_lon)),  # type: ignore[arg-type]
        source=str(area.source),
        statistics_computed_at=area.statistics_computed_at.isoformat()
        if area.statistics_computed_at
        else None,
        last_analyzed=latest.updated_at.isoformat() if latest and latest.updated_at else None,
        latest_analysis_id=str(latest.id) if latest else None,
        hotspot_count=hotspot_count,
        health_index=health_for_analysis(latest),
    )


def area_aoi_geojson(area: ProtectedArea) -> Dict[str, Any]:
    return dict(mapping(to_shape(area.analysis_aoi)))


def area_aoi_km2(area: ProtectedArea) -> float:
    return calculate_polygon_area_km2(to_shape(area.analysis_aoi))


def build_hotspot(
    event: ChangeEvent,
    analysis: Analysis,
    area_name: Optional[str],
    curated_ids: Sequence[uuid.UUID],
    read_only: bool,
    include_geometry: bool,
) -> HotspotItem:
    shp = to_shape(event.geom)
    centroid = shp.centroid
    props: Dict[str, Any] = dict(event.properties or {})  # type: ignore[arg-type]
    layer_type = props.get("layer_type") or CHANGE_TYPE_LAYER.get(str(event.change_type), "unknown")
    return HotspotItem(
        id=str(event.id),
        analysis_id=str(event.analysis_id),
        area_id=str(analysis.area_id) if analysis.area_id else None,
        area_name=area_name,
        layer_type=str(layer_type),
        change_type=str(event.change_type),
        change_label=change_type_label(str(event.change_type)),
        detected_at=(analysis.updated_at or analysis.created_at).isoformat(),
        affected_area_ha=float(event.affected_area_ha),  # type: ignore[arg-type]
        mean_ndvi_change=event.mean_ndvi_change,  # type: ignore[arg-type]
        valid_pixel_fraction=event.valid_pixel_fraction,  # type: ignore[arg-type]
        quality_label=event.quality_label,  # type: ignore[arg-type]
        severity=event_severity(event),
        priority_score=event.priority_score,  # type: ignore[arg-type]
        priority_components=props.get("priority_components"),
        priority_method_version=event.priority_method_version,  # type: ignore[arg-type]
        status=str(event.status),
        record_version=int(event.record_version),  # type: ignore[arg-type]
        method_version=str(event.method_version),
        sensor=props.get("sensor") or CHANGE_TYPE_SENSOR.get(str(layer_type)),
        coordinates=Coordinates(lat=float(centroid.y), lon=float(centroid.x)),
        geometry=dict(mapping(shp)) if include_geometry else None,
        baseline_value=props.get("baseline_value"),
        comparison_value=props.get("comparison_value"),
        value_name=props.get("value_name"),
        nearest_known_road_distance_m=event.nearest_known_road_distance_m,  # type: ignore[arg-type]
        nearest_known_settlement_distance_m=event.nearest_known_settlement_distance_m,  # type: ignore[arg-type]
        context_source=event.context_source,  # type: ignore[arg-type]
        baseline_window=f"{analysis.baseline_start} → {analysis.baseline_end}",
        comparison_window=f"{analysis.comparison_start} → {analysis.comparison_end}",
        is_curated_demo=analysis.workspace_id in curated_ids,
        read_only=read_only,
    )


def iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None
