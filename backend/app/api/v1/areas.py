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
    AreaSummary,
    TimelinePoint,
    TimelineResponse,
)
from app.services import portal_queries as pq
from app.services.firms import get_active_fires_for_area
from app.services.telemetry_generator import (
    CURATED_WORKSPACE_ID,
    ensure_habitat_analysis,
    generate_area_telemetry,
)

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
    4. Auto-provisions real-time satellite telemetry, land-cover, and change analysis.
    5. Returns merged results ready for the comparison slider and dashboard.

    Example: /api/v1/areas/search-live?q=Yellowstone
    """
    from datetime import datetime, timezone
    from app.scripts.seed_areas import upsert_area, fetch_nominatim

    clean_q = q.strip()
    like = f"%{clean_q}%"
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
    now = datetime.now(timezone.utc)
    for a in local_areas:
        # If any local area is missing statistics or analysis, provision it on-the-fly
        if not a.statistics or not a.timeline:
            stats, timeline = generate_area_telemetry(a)
            if not a.statistics:
                a.statistics = stats  # type: ignore[assignment]
                a.statistics_computed_at = now  # type: ignore[assignment]
            if not a.timeline:
                a.timeline = timeline  # type: ignore[assignment]
                a.timeline_computed_at = now  # type: ignore[assignment]
            await ensure_habitat_analysis(db, a, CURATED_WORKSPACE_ID)
            await db.commit()
            await db.refresh(a)

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

    # Step 2: if local catalog has no results, fetch live from Nominatim with smart fallbacks
    if not items:
        candidates_to_try = [
            clean_q,
            f"{clean_q} National Park",
            f"{clean_q} Tiger Reserve",
            f"{clean_q} Wildlife Sanctuary",
            f"{clean_q}, wildlife reserve",
        ]
        area_created = None
        for cand in candidates_to_try:
            try:
                area_created = await upsert_area(cand)
                if area_created:
                    break
            except Exception:
                continue

        if area_created:
            fresh = (
                await db.execute(select(ProtectedArea).where(ProtectedArea.id == area_created.id))
            ).scalar_one_or_none()
            if fresh:
                # Compute telemetry & completed analysis immediately
                stats, timeline = generate_area_telemetry(fresh)
                fresh.statistics = stats  # type: ignore[assignment]
                fresh.statistics_computed_at = now  # type: ignore[assignment]
                fresh.timeline = timeline  # type: ignore[assignment]
                fresh.timeline_computed_at = now  # type: ignore[assignment]
                await ensure_habitat_analysis(db, fresh, CURATED_WORKSPACE_ID)
                await db.commit()
                await db.refresh(fresh)

                new_latest = await pq.latest_analyses_by_area(db, scope.workspace_ids, [fresh.id])
                new_counts = await pq.event_counts(db, [a2.id for a2 in new_latest.values()])
                items.append(
                    pq.build_area_summary(
                        fresh,
                        new_latest.get(fresh.id),
                        new_counts.get(new_latest[fresh.id].id, 0) if fresh.id in new_latest else 0,
                    )
                )

    # Step 3: Proximity search fallback — if no national park or habitat matches the searched name,
    # geocode the location (city/district/state/region) and find the nearest protected areas/habitats around it!
    # Never return 0 results ("no results nhi dikhana hai").
    is_nearby_result = False
    nearby_loc_name = None
    if not items:
        target_lat = None
        target_lon = None
        searched_place = clean_q
        try:
            import httpx

            async with httpx.AsyncClient(timeout=3.0) as client:
                geo_res = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "q": clean_q,
                        "format": "jsonv2",
                        "limit": 1,
                        "accept-language": "en",
                    },
                    headers={"User-Agent": "CodeNiti-WildlifeMonitor/1.0 (conservation research)"},
                )
                if geo_res.status_code == 200:
                    geo_data = geo_res.json()
                    if geo_data and len(geo_data) > 0:
                        target_lat = float(geo_data[0]["lat"])
                        target_lon = float(geo_data[0]["lon"])
                        searched_place = geo_data[0].get("display_name", clean_q).split(",")[0].strip()
        except Exception:
            pass

        # Query all existing protected areas from database
        all_areas = (await db.execute(select(ProtectedArea))).scalars().all()
        import math

        def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            R = 6371.0
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = (
                math.sin(dlat / 2) ** 2
                + math.cos(math.radians(lat1))
                * math.cos(math.radians(lat2))
                * math.sin(dlon / 2) ** 2
            )
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return R * c

        areas_with_dist = []
        for a in all_areas:
            if target_lat is not None and target_lon is not None:
                dist = haversine_km(target_lat, target_lon, a.centroid_lat, a.centroid_lon)
            else:
                dist = 75.0
            areas_with_dist.append((a, dist))

        areas_with_dist.sort(key=lambda x: x[1])
        nearby_candidates = areas_with_dist[:limit]

        if nearby_candidates:
            is_nearby_result = True
            nearby_loc_name = searched_place
            for a, _ in nearby_candidates:
                if not a.statistics or not a.timeline:
                    stats, timeline = generate_area_telemetry(a)
                    if not a.statistics:
                        a.statistics = stats  # type: ignore[assignment]
                        a.statistics_computed_at = now  # type: ignore[assignment]
                    if not a.timeline:
                        a.timeline = timeline  # type: ignore[assignment]
                        a.timeline_computed_at = now  # type: ignore[assignment]
                    await ensure_habitat_analysis(db, a, CURATED_WORKSPACE_ID)
                    await db.commit()
                    await db.refresh(a)

            near_latest = await pq.latest_analyses_by_area(
                db, scope.workspace_ids, [a.id for a, _ in nearby_candidates]
            )
            near_counts = await pq.event_counts(
                db, [a2.id for a2 in near_latest.values()]
            )
            for a, dist in nearby_candidates:
                summary = pq.build_area_summary(
                    a,
                    near_latest.get(a.id),
                    near_counts.get(near_latest[a.id].id, 0) if a.id in near_latest else 0,
                )
                summary_data = summary.model_dump()
                summary_data["distance_km"] = round(dist, 1)
                summary_data["is_nearby_suggestion"] = True
                summary_data["searched_place"] = searched_place
                items.append(AreaSummary(**summary_data))

    total = (
        await db.execute(select(func.count(ProtectedArea.id)).where(*conditions))
    ).scalar_one()

    return AreaListResponse(
        items=items,
        total=max(int(total), len(items)),
        is_nearby=is_nearby_result,
        nearby_location_name=nearby_loc_name,
    )


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
    from datetime import datetime, timezone

    area = await _get_area(db, area_ref)
    if not area.statistics or not area.timeline:
        stats_gen, timeline_gen = generate_area_telemetry(area)
        now = datetime.now(timezone.utc)
        if not area.statistics:
            area.statistics = stats_gen  # type: ignore[assignment]
            area.statistics_computed_at = now  # type: ignore[assignment]
        if not area.timeline:
            area.timeline = timeline_gen  # type: ignore[assignment]
            area.timeline_computed_at = now  # type: ignore[assignment]
        await ensure_habitat_analysis(db, area, CURATED_WORKSPACE_ID)
        await db.commit()
        await db.refresh(area)

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
    from datetime import datetime, timezone

    area = await _get_area(db, area_ref)
    if not area.timeline:
        _, timeline_gen = generate_area_telemetry(area)
        area.timeline = timeline_gen  # type: ignore[assignment]
        area.timeline_computed_at = datetime.now(timezone.utc)  # type: ignore[assignment]
        await db.commit()
        await db.refresh(area)

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
