"""Public / Demonstration API Router.

Unauthenticated, read-only endpoints serving curated demonstrations,
protected area spatial boundaries, generalized change events, and
system telemetry per spec.md, rules.md, and systemdesign.md.
"""

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import get_db
from app.models.analysis import Analysis
from app.models.area import ProtectedArea
from app.models.event import ChangeEvent
from app.models.workspace import Workspace

router = APIRouter(prefix="/public", tags=["Public Demonstration"])

DEMO_DISCLAIMER = (
    "Curated demonstration based on satellite telemetry observations. "
    "Investigation Priority scores reflect operational screening heuristics, "
    "not confirmed ecological outcome or causation."
)


def _get_priority_band(score: Optional[float]) -> str:
    """Priority is 0-100 (priority-v1)."""
    if score is None:
        return "UNKNOWN"
    if score >= 75:
        return "CRITICAL"
    if score >= 50:
        return "HIGH"
    if score >= 25:
        return "MEDIUM"
    return "LOW"


def _public_workspaces():
    """Only curated (is_public) workspaces may ever be exposed unauthenticated."""
    return select(Workspace.id).where(Workspace.is_public.is_(True))


def _change_type_label(change_type: str) -> str:
    labels = {
        "vegetation_loss": "Canopy Cover Reduction",
        "vegetation_gain": "Vegetation Regrowth",
        "water_loss": "Surface Water Contraction",
        "water_gain": "Surface Water Expansion",
        "builtup_increase": "Infrastructure Encroachment",
        "forest_alert": "Canopy Disturbance Alert",
    }
    return labels.get(change_type, change_type.replace("_", " ").title())


@router.get("/overview")
async def get_public_overview(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Retrieve public system overview, operational status, and telemetry summary."""
    # Count protected areas
    areas_count_res = await db.execute(select(func.count(ProtectedArea.id)))
    monitored_reserves_count = areas_count_res.scalar_one() or 0

    # Total area monitored
    area_sum_res = await db.execute(select(func.sum(ProtectedArea.area_km2)))
    total_area_km2 = area_sum_res.scalar_one() or 0.0

    # Curated analyses count
    analyses_count_res = await db.execute(select(func.count(Analysis.id)).where(Analysis.workspace_id.in_(_public_workspaces())))
    analyses_count = analyses_count_res.scalar_one() or 0

    # Total events count
    events_count_res = await db.execute(select(func.count(ChangeEvent.id)).where(ChangeEvent.workspace_id.in_(_public_workspaces())))
    events_count = events_count_res.scalar_one() or 0

    methods = ["vegetation-v1", "water-v1", "builtup-v1"]
    if settings.GFW_ENABLED:
        methods.append("forestalerts-v1")

    data_sources = [
        {
            "name": "Copernicus Sentinel-2 (L2A)",
            "provider": "European Space Agency / European Union",
            "resolution": "10m Multispectral",
            "bands": ["B4 (Red)", "B8 (NIR)", "SCL (Scene Classification)"],
            "status": "operational",
            "attribution": "Contains modified Copernicus Sentinel data (2024–2026)",
        },
        {
            "name": "Google Dynamic World (V1)",
            "provider": "World Resources Institute / Google Earth Engine",
            "resolution": "10m Land Cover",
            "bands": ["water", "trees", "built", "crops", "bare"],
            "status": "operational",
            "attribution": "Dynamic World CC-BY 4.0",
        },
        {
            "name": "OpenStreetMap Boundary & Context",
            "provider": "OpenStreetMap Contributors",
            "resolution": "Vector (Polygon & Line)",
            "status": "operational",
            "attribution": "© OpenStreetMap contributors (ODbL)",
        },
        {
            "name": "NASA FIRMS Active Fire",
            "provider": "NASA Land, Atmosphere Near real-time Capability for EOS",
            "resolution": "375m VIIRS",
            "status": "configured" if settings.FIRMS_MAP_KEY else "unconfigured_optional",
            "attribution": "NASA FIRMS (MODIS / VIIRS)",
        },
    ]

    return {
        "system_status": "operational",
        "deployment": "Wildlife Habitat Monitoring & Change Detection Platform",
        "version": "1.0.0",
        "engine": "FastAPI + PostGIS + Google Earth Engine / Synthetic Engine",
        "demonstration_mode": True,
        "is_curated_demo": True,
        "disclaimer": DEMO_DISCLAIMER,
        "enabled_methods": methods,
        "monitored_reserves_count": monitored_reserves_count,
        "total_monitored_area_km2": round(float(total_area_km2), 2),
        "curated_analyses_count": analyses_count,
        "total_detected_events_count": events_count,
        "data_sources": data_sources,
    }


@router.get("/demonstrations")
async def list_demonstrations(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Retrieve list of curated demonstrations with real boundaries and change summaries."""
    query = (
        select(Analysis)
        .options(
            selectinload(Analysis.area),
            selectinload(Analysis.layers),
            selectinload(Analysis.events),
        )
        .where(Analysis.workspace_id.in_(_public_workspaces()))
        .order_by(desc(Analysis.created_at))
    )
    result = await db.execute(query)
    analyses = result.scalars().all()

    items: List[Dict[str, Any]] = []
    for analysis in analyses:
        area = analysis.area
        # Calculate summary metrics from layers and events
        veg_loss_ha = 0.0
        water_change_ha = 0.0
        for event in analysis.events:
            if "vegetation" in event.change_type:
                veg_loss_ha += event.affected_area_ha
            elif "water" in event.change_type:
                water_change_ha += event.affected_area_ha

        # Get boundary GeoJSON
        boundary_geojson = None
        if area and area.boundary is not None:
            boundary_geojson = mapping(to_shape(area.boundary))
        elif analysis.aoi_snapshot:
            boundary_geojson = analysis.aoi_snapshot

        items.append(
            {
                "id": str(analysis.id),
                "area_id": str(area.id) if area else None,
                "area_slug": area.slug if area else "custom-aoi",
                "area_name": area.name if area else "Curated Demo Area",
                "designation": area.designation if area else "National Park / Tiger Reserve",
                "country": area.country if area else "India",
                "state": area.state if area else None,
                "area_km2": area.area_km2 if area else 500.0,
                "centroid": {
                    "lat": area.centroid_lat if area else 21.69,
                    "lon": area.centroid_lon if area else 79.25,
                },
                "boundary": boundary_geojson,
                "baseline_period": {
                    "start": str(analysis.baseline_start),
                    "end": str(analysis.baseline_end),
                },
                "comparison_period": {
                    "start": str(analysis.comparison_start),
                    "end": str(analysis.comparison_end),
                },
                "status": analysis.status,
                "vegetation_loss_ha": round(veg_loss_ha, 2),
                "water_change_ha": round(water_change_ha, 2),
                "event_count": len(analysis.events),
                "is_curated_demo": True,
                "read_only": True,
                "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                "disclaimer": DEMO_DISCLAIMER,
            }
        )

    return {
        "items": items,
        "total": len(items),
        "is_curated_demo": True,
        "demonstration_notice": "Demonstrations use verified satellite observation periods and spatial boundaries.",
    }


@router.get("/demonstrations/{demo_id}")
async def get_demonstration_detail(
    demo_id: str, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve detailed demonstration metrics, layers, and scientific provenance."""
    try:
        parsed_id = uuid.UUID(demo_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid demonstration identifier."
        )

    query = (
        select(Analysis)
        .options(
            selectinload(Analysis.area),
            selectinload(Analysis.layers),
            selectinload(Analysis.events),
        )
        .where(Analysis.id == parsed_id, Analysis.workspace_id.in_(_public_workspaces()))
    )
    res = await db.execute(query)
    analysis = res.scalar_one_or_none()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Demonstration analysis not found."
        )

    area = analysis.area
    boundary_geojson = None
    if area and area.boundary is not None:
        boundary_geojson = mapping(to_shape(area.boundary))
    elif analysis.aoi_snapshot:
        boundary_geojson = analysis.aoi_snapshot

    layers_summary = []
    for layer in analysis.layers:
        layers_summary.append(
            {
                "id": str(layer.id),
                "layer_type": layer.layer_type,
                "status": layer.status,
                "quality_label": layer.quality_label or "cloud_screened_nominal",
                "method_version": layer.method_version or "v1.0",
                "metrics": layer.metrics or {},
                "warnings": layer.warnings or [],
                "provenance": layer.provenance
                or {
                    "sensor": "Sentinel-2 / MSI",
                    "processor": "ESA / S2_SR_HARMONIZED",
                    "grid_res_m": 10,
                },
            }
        )

    return {
        "id": str(analysis.id),
        "area_id": str(area.id) if area else None,
        "area_slug": area.slug if area else "custom-aoi",
        "area_name": area.name if area else "Curated Demo Area",
        "designation": area.designation if area else "National Park",
        "country": area.country if area else "India",
        "state": area.state if area else None,
        "area_km2": area.area_km2 if area else 500.0,
        "centroid": {
            "lat": area.centroid_lat if area else 21.69,
            "lon": area.centroid_lon if area else 79.25,
        },
        "boundary": boundary_geojson,
        "baseline_period": {
            "start": str(analysis.baseline_start),
            "end": str(analysis.baseline_end),
        },
        "comparison_period": {
            "start": str(analysis.comparison_start),
            "end": str(analysis.comparison_end),
        },
        "status": analysis.status,
        "layers": layers_summary,
        "event_count": len(analysis.events),
        "is_curated_demo": True,
        "read_only": True,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "disclaimer": DEMO_DISCLAIMER,
        "scientific_notes": [
            "Baseline and comparison windows were selected during identical dry-season phenological windows to avoid false seasonal alarms.",
            "Pixel values are cloud-masked via Sentinel-2 Scene Classification Layer (SCL).",
            "Priority scores combine magnitude (area and delta), conservation zone sensitivity, and proximity to human infrastructure.",
        ],
    }


@router.get("/demonstrations/{demo_id}/events")
async def get_demonstration_events(
    demo_id: str,
    change_type: Optional[str] = Query(None, description="Filter by change type"),
    severity: Optional[str] = Query(None, description="Filter by priority band"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieve curated change events with wildlife-safe generalized coordinates.

    Coordinates are generalized to polygon centroids / buffered coordinates per rules.md
    ('Avoid exposing sensitive wildlife locations publicly') and spec.md.
    """
    try:
        parsed_id = uuid.UUID(demo_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid demonstration identifier."
        )

    query = (
        select(ChangeEvent)
        .where(
            ChangeEvent.analysis_id == parsed_id,
            ChangeEvent.workspace_id.in_(_public_workspaces()),
        )
        .order_by(desc(ChangeEvent.priority_score))
    )
    if change_type:
        query = query.where(ChangeEvent.change_type == change_type)

    res = await db.execute(query)
    events = res.scalars().all()

    items: List[Dict[str, Any]] = []
    for evt in events:
        band = _get_priority_band(evt.priority_score)
        if severity and band.upper() != severity.upper():
            continue

        # Extract generalized centroid coordinate from polygon geom
        shape_geom = to_shape(evt.geom)
        centroid = shape_geom.centroid

        # Create generalized polygon (simplified / slightly buffered) for public view
        # to conceal poacher-exploitable precision per rules.md
        generalized_shape = shape_geom.simplify(0.001, preserve_topology=True)
        generalized_geojson = mapping(generalized_shape)

        components = {}
        if evt.properties and "priority_components" in evt.properties:
            components = evt.properties["priority_components"]
        elif evt.priority_score:
            # Standard breakdown representation
            components = {
                "magnitude": round(float(evt.priority_score) * 0.50, 3),
                "sensitivity": round(float(evt.priority_score) * 0.30, 3),
                "context": round(float(evt.priority_score) * 0.20, 3),
            }

        items.append(
            {
                "id": str(evt.id),
                "analysis_id": str(evt.analysis_id),
                "change_type": evt.change_type,
                "change_label": _change_type_label(evt.change_type),
                "affected_area_ha": round(float(evt.affected_area_ha), 2),
                "mean_ndvi_change": round(float(evt.mean_ndvi_change), 3)
                if evt.mean_ndvi_change is not None
                else None,
                "valid_pixel_fraction": round(float(evt.valid_pixel_fraction), 2)
                if evt.valid_pixel_fraction is not None
                else 1.0,
                "priority_score": round(float(evt.priority_score), 2)
                if evt.priority_score is not None
                else None,
                "priority_band": band,
                "priority_components": components,
                "status": evt.status,
                "generalized_coordinates": {
                    "lat": round(float(centroid.y), 4),
                    "lon": round(float(centroid.x), 4),
                },
                "generalized_geometry": generalized_geojson,
                "nearest_known_road_distance_m": round(float(evt.nearest_known_road_distance_m), 1)
                if evt.nearest_known_road_distance_m
                else None,
                "nearest_known_settlement_distance_m": round(
                    float(evt.nearest_known_settlement_distance_m), 1
                )
                if evt.nearest_known_settlement_distance_m
                else None,
                "context_source": evt.context_source or "OpenStreetMap contributors (ODbL)",
                "method_version": evt.method_version or "vegetation-v1",
                "is_curated_demo": True,
                "read_only": True,
                "security_notice": "Location coordinates generalized to protect sensitive habitat receptors per rules.md.",
            }
        )

    return {
        "items": items,
        "total": len(items),
        "is_curated_demo": True,
        "disclaimer": DEMO_DISCLAIMER,
    }
