import asyncio
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import NotFoundException
from app.core.security import ReadScope, get_read_scope
from app.db.session import get_db
from app.models.area import ProtectedArea
from app.schemas.portal import (
    AreaDetail,
    AreaListResponse,
    AreaStatistics,
    TimelinePoint,
    TimelineResponse,
)
from app.services import portal_queries as pq
from app.services.firms import get_active_fires_for_area

router = APIRouter(prefix="/areas", tags=["Areas"])


# ---------------------------------------------------------------------------
# Global Live Search — searches ANY habitat worldwide via OpenStreetMap,
# auto-caches into PostGIS, and returns the area for immediate use.
# ---------------------------------------------------------------------------


@router.get("/search-live", response_model=AreaListResponse)
async def search_live(
    q: str = Query(..., min_length=2, description="Search query: any wildlife habitat, national park, or reserve worldwide"),
    limit: int = Query(5, ge=1, le=20, description="Max results to return"),
    db: AsyncSession = Depends(get_db),
    scope: ReadScope = Depends(get_read_scope),
):
    """Live global search via OpenStreetMap Nominatim.

    1. Searches local PostGIS catalog first (fast, zero-latency).
    2. If fewer than `limit` results found, queries Nominatim for any
       protected area / national park globally matching the query.
    3. Auto-ingests the new boundary into PostGIS so subsequent requests are instant.
    4. Returns merged results ready for the comparison slider.

    Example: /api/v1/areas/search-live?q=Yellowstone
    """
    from app.scripts.seed_areas import upsert_area, fetch_nominatim

    like = f"%{q.strip()}%"
    conditions = [
        or_(
            ProtectedArea.name.ilike(like),
            ProtectedArea.state.ilike(like),
            ProtectedArea.country.ilike(like),
        )
    ]

    # Step 1: local catalog
    local_areas = (
        (
            await db.execute(
                select(ProtectedArea)
                .where(*conditions)
                .order_by(ProtectedArea.name)
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )

    items: List = []
    latest = await pq.latest_analyses_by_area(db, scope.workspace_ids, [a.id for a in local_areas])
    counts = await pq.event_counts(db, [a.id for a in latest.values()])
    for a in local_areas:
        items.append(
            pq.build_area_summary(
                a,
                latest.get(a.id),
                counts.get(latest[a.id].id, 0) if a.id in latest else 0,
            )
        )

    # Step 2: if local catalog has no results, fetch live from Nominatim
    if not items:
        try:
            # Run Nominatim fetch in threadpool (it's a sync HTTP call)
            result = await asyncio.to_thread(fetch_nominatim, f"{q.strip()}, wildlife reserve")
            area = await upsert_area(q.strip())
            # Reload from DB with fresh data
            fresh = (
                await db.execute(select(ProtectedArea).where(ProtectedArea.id == area.id))
            ).scalar_one_or_none()
            if fresh:
                new_latest = await pq.latest_analyses_by_area(db, scope.workspace_ids, [fresh.id])
                new_counts = await pq.event_counts(db, [a2.id for a2 in new_latest.values()])
                items.append(
                    pq.build_area_summary(
                        fresh,
                        new_latest.get(fresh.id),
                        new_counts.get(new_latest[fresh.id].id, 0) if fresh.id in new_latest else 0,
                    )
                )
        except LookupError:
            # No boundary polygon found on OSM — try without suffix
            try:
                area = await upsert_area(q.strip())
                fresh = (
                    await db.execute(select(ProtectedArea).where(ProtectedArea.id == area.id))
                ).scalar_one_or_none()
                if fresh:
                    new_latest = await pq.latest_analyses_by_area(db, scope.workspace_ids, [fresh.id])
                    new_counts = await pq.event_counts(db, [a2.id for a2 in new_latest.values()])
                    items.append(
                        pq.build_area_summary(
                            fresh,
                            new_latest.get(fresh.id),
                            new_counts.get(new_latest[fresh.id].id, 0) if fresh.id in new_latest else 0,
                        )
                    )
            except Exception:
                pass  # Return empty list; frontend will show "not found" state
        except Exception as exc:
            # Nominatim/DB error — gracefully return empty (don't 500)
            pass

    total = (
        await db.execute(select(func.count(ProtectedArea.id)).where(*conditions))
    ).scalar_one()

    return AreaListResponse(items=items, total=max(int(total), len(items)))


async def _get_area(db: AsyncSession, ident: str) -> ProtectedArea:
    stmt = select(ProtectedArea)
    try:
        stmt = stmt.where(ProtectedArea.id == uuid.UUID(ident))
    except ValueError:
        stmt = stmt.where(ProtectedArea.slug == ident)
    area = (await db.execute(stmt)).scalar_one_or_none()
    if area is None:
        raise NotFoundException(error_code="AREANOTFOUND", message="Protected area not found.")
    return area


@router.get("", response_model=AreaListResponse)
async def list_areas(
    search: Optional[str] = Query(None, description="Case-insensitive name/state/country search"),
    country: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Browse the real protected-area catalog (OpenStreetMap boundaries)."""
    conditions = []
    if search:
        like = f"%{search.strip()}%"
        conditions.append(
            or_(
                ProtectedArea.name.ilike(like),
                ProtectedArea.state.ilike(like),
                ProtectedArea.country.ilike(like),
            )
        )
    if country:
        conditions.append(ProtectedArea.country.ilike(country))
    if state:
        conditions.append(ProtectedArea.state.ilike(state))

    total = (
        await db.execute(select(func.count(ProtectedArea.id)).where(*conditions))
    ).scalar_one()
    areas = (
        (
            await db.execute(
                select(ProtectedArea)
                .where(*conditions)
                .order_by(ProtectedArea.name)
                .limit(limit)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )
    latest = await pq.latest_analyses_by_area(db, scope.workspace_ids, [a.id for a in areas])
    counts = await pq.event_counts(db, [a.id for a in latest.values()])
    items = [
        pq.build_area_summary(a, latest.get(a.id), counts.get(latest[a.id].id, 0) if a.id in latest else 0)
        for a in areas
    ]
    return AreaListResponse(items=items, total=int(total))


@router.get("/{area_ref}", response_model=AreaDetail)
async def get_area(
    area_ref: str,
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    area = await _get_area(db, area_ref)
    latest = await pq.latest_analyses_by_area(db, scope.workspace_ids, [area.id])
    counts = await pq.event_counts(db, [a.id for a in latest.values()])
    summary = pq.build_area_summary(
        area, latest.get(area.id), counts.get(latest[area.id].id, 0) if area.id in latest else 0
    )
    return AreaDetail(
        **summary.model_dump(),
        analysis_aoi=pq.area_aoi_geojson(area),
        analysis_aoi_km2=round(pq.area_aoi_km2(area), 2),
        analysis_aoi_note=area.analysis_aoi_note,  # type: ignore[arg-type]
        source_fetched_at=pq.iso(area.source_fetched_at),  # type: ignore[arg-type]
    )


@router.get("/{area_ref}/boundary")
async def get_area_boundary(
    area_ref: str,
    tolerance: float = Query(0.0008, ge=0.0, le=0.05),
    _scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Boundary as a GeoJSON Feature (simplified for display; ODbL attribution required)."""
    area = await _get_area(db, area_ref)
    geom = to_shape(area.boundary)
    if tolerance > 0:
        geom = geom.simplify(tolerance, preserve_topology=True)
    return {
        "type": "Feature",
        "id": str(area.id),
        "properties": {
            "name": area.name,
            "slug": area.slug,
            "area_km2": area.area_km2,
            "attribution": "© OpenStreetMap contributors (ODbL)",
        },
        "geometry": mapping(geom),
    }


@router.get("/{area_ref}/statistics", response_model=AreaStatistics)
async def get_area_statistics(
    area_ref: str,
    scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Real Earth Engine land-cover statistics plus NASA FIRMS active fire count and indicative Habitat Health Index."""
    area = await _get_area(db, area_ref)
    stats = dict(area.statistics or {})  # type: ignore[arg-type]
    latest = (await pq.latest_analyses_by_area(db, scope.workspace_ids, [area.id])).get(area.id)
    veg = pq.layer_metrics(latest).get("vegetation", {})

    unavailable = []
    if not stats:
        unavailable.append("Land-cover statistics have not been computed for this area yet.")

    active_fires: Optional[int] = None
    if settings.FIRMS_MAP_KEY:
        firms_data = await get_active_fires_for_area(area, days=3)
        active_fires = firms_data.get("count", 0)
    else:
        unavailable.append("Active fire count requires a NASA FIRMS key (FIRMS_MAP_KEY not configured).")

    return AreaStatistics(
        area_id=str(area.id),
        area_name=str(area.name),
        computed_at=pq.iso(area.statistics_computed_at),  # type: ignore[arg-type]
        source=stats.get("source"),
        scale_m=stats.get("scale_m"),
        window=stats.get("window"),
        forest_cover_percent=stats.get("forest_cover_percent"),
        water_bodies_ha=stats.get("water_bodies_ha"),
        urban_builtup_ha=stats.get("urban_builtup_ha"),
        land_cover_distribution=stats.get("land_cover_distribution", {}),
        last_cloud_free_pass=stats.get("last_cloud_free_pass"),
        latest_analysis_id=str(latest.id) if latest else None,
        vegetation_loss_candidate_ha=veg.get("vegetationlossareaha"),
        active_fires_count=active_fires,
        health_index=pq.health_for_analysis(latest),
        unavailable=unavailable,
    )


@router.get("/{area_ref}/fires")
async def get_area_fires(
    area_ref: str,
    days: int = Query(3, ge=1, le=10, description="Window in days to query from NASA FIRMS"),
    _scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Real thermal anomalies / active fire detections from NASA FIRMS satellites (VIIRS / MODIS)."""
    area = await _get_area(db, area_ref)
    return await get_active_fires_for_area(area, days=days)


@router.get("/{area_ref}/timeline", response_model=TimelineResponse)
async def get_area_timeline(
    area_ref: str,
    _scope: ReadScope = Depends(get_read_scope),
    db: AsyncSession = Depends(get_db),
):
    """Real monthly NDVI / surface-water time series computed from Earth Engine."""
    area = await _get_area(db, area_ref)
    payload = dict(area.timeline or {})  # type: ignore[arg-type]
    return TimelineResponse(
        area_id=str(area.id),
        points=[TimelinePoint(**p) for p in payload.get("points", [])],
        computed_at=pq.iso(area.timeline_computed_at),  # type: ignore[arg-type]
        source=payload.get("source"),
        scale_m=payload.get("scale_m"),
        notes=(
            payload.get("notes", [])
            + [
                "Monsoon months (Jun–Sep) have few clear observations; Dynamic World water "
                "and NDVI values there are unreliable and may understate surface water."
            ]
            if payload.get("points")
            else ["Timeline has not been computed for this area yet."]
        ),
    )
