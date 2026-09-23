"""Seed the protected-area catalog with REAL boundaries from OpenStreetMap (Nominatim).

Usage (inside the api container):
    python -m app.scripts.seed_areas            # seeds the default demo areas
    python -m app.scripts.seed_areas "Kanha National Park"   # add any other area by name

Nothing here is invented: boundary, country, state and centroid come from OSM. Fields OSM
does not provide (e.g. biome) are left null rather than guessed.
"""

import asyncio
import logging
import re
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

import requests
from geoalchemy2.shape import from_shape
from shapely.geometry import MultiPolygon, Polygon, box, shape
from shapely.ops import unary_union
from sqlalchemy import select

from app.core.config import settings
from app.db.session import async_session_factory
from app.models.area import ProtectedArea
from app.services.analysis_validation import calculate_polygon_area_km2

logger = logging.getLogger("seed_areas")

NOMINATIM = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "CodeNiti-WildlifeMonitor/1.0 (conservation research; contact via repository)"

DEFAULT_AREAS = [
    "Pench Tiger Reserve",
    "Tadoba Andhari Tiger Reserve",
    "Sundarbans National Park",
]

PROTECT_CLASS_TO_IUCN = {
    "1": "Ia",
    "1a": "Ia",
    "1b": "Ib",
    "2": "II",
    "3": "III",
    "4": "IV",
    "5": "V",
    "6": "VI",
}

# Analysis AOIs larger than this are clipped to a central window so GEE requests stay bounded
ANALYSIS_WINDOW_KM2 = 1500.0


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _to_multipolygon(geom: Any) -> MultiPolygon:
    if isinstance(geom, MultiPolygon):
        return geom
    if isinstance(geom, Polygon):
        return MultiPolygon([geom])
    polys = [g for g in getattr(geom, "geoms", []) if isinstance(g, Polygon)]
    if not polys:
        raise ValueError("Boundary contains no polygon geometry")
    return MultiPolygon(polys)


def multipolygon_area_km2(mp: MultiPolygon) -> float:
    return sum(calculate_polygon_area_km2(poly) for poly in mp.geoms)


def build_analysis_aoi(mp: MultiPolygon, max_km2: float) -> tuple[Polygon, str]:
    """Pick a single Polygon (<= max_km2) representing this area for analyses."""
    largest = max(mp.geoms, key=lambda p: p.area)
    simplified = largest.simplify(0.0008, preserve_topology=True)
    if not isinstance(simplified, Polygon) or simplified.is_empty:
        simplified = largest
    simplified = Polygon(simplified.exterior)  # drop interior rings for a robust analysis AOI
    area = calculate_polygon_area_km2(simplified)
    if area <= max_km2:
        note = "Full boundary of the largest polygon (simplified ~90 m)."
        return simplified, note

    # Too large for one request: clip to a central window
    centroid = simplified.centroid
    half_deg = (ANALYSIS_WINDOW_KM2**0.5) / 111.0 / 2.0
    window = box(
        centroid.x - half_deg, centroid.y - half_deg, centroid.x + half_deg, centroid.y + half_deg
    )
    clipped = simplified.intersection(window)
    clipped_poly = (
        max(clipped.geoms, key=lambda p: p.area) if hasattr(clipped, "geoms") else clipped
    )
    if not isinstance(clipped_poly, Polygon) or clipped_poly.is_empty:
        raise ValueError("Could not derive analysis window from boundary")
    note = (
        f"Central ~{ANALYSIS_WINDOW_KM2:.0f} km² window of the reserve (full boundary is "
        f"{area:.0f} km², above the {max_km2:.0f} km² per-analysis limit)."
    )
    return Polygon(clipped_poly.exterior), note


def fetch_nominatim(query: str) -> Dict[str, Any]:
    response = requests.get(
        NOMINATIM,
        params={
            "q": query,
            "format": "jsonv2",
            "polygon_geojson": 1,
            "polygon_threshold": 0.0003,
            "addressdetails": 1,
            "extratags": 1,
            "limit": 8,
            "accept-language": "en",
        },
        headers={"User-Agent": USER_AGENT},
        timeout=60,
    )
    response.raise_for_status()
    results: List[Dict[str, Any]] = response.json()
    candidates = [
        r
        for r in results
        if r.get("geojson", {}).get("type") in ("Polygon", "MultiPolygon")
        and r.get("category") in ("boundary", "leisure", "landuse", "natural")
    ]
    if not candidates:
        raise LookupError(f"No polygon boundary found on OpenStreetMap for '{query}'")
    # Prefer protected-area style objects, then the largest polygon
    candidates.sort(
        key=lambda r: (
            0 if r.get("type") in ("protected_area", "national_park", "nature_reserve") else 1,
            -shape(r["geojson"]).area,
        )
    )
    return candidates[0]


async def upsert_area(query: str) -> ProtectedArea:
    result = fetch_nominatim(query)
    mp = _to_multipolygon(shape(result["geojson"]))
    # Store a lightly simplified boundary (display + intersection use); keeps payloads small
    mp = _to_multipolygon(mp.simplify(0.0003, preserve_topology=True))
    area_km2 = multipolygon_area_km2(mp)
    aoi, note = build_analysis_aoi(mp, settings.MAX_AOI_KM2)
    centroid = unary_union(list(mp.geoms)).representative_point()

    address = result.get("address", {})
    extratags = result.get("extratags") or {}
    protect_class = str(extratags.get("protect_class", "")).split(";")[0].strip()
    name = result.get("name") or result.get("display_name", query).split(",")[0]
    slug = slugify(name)
    designation = (
        extratags.get("protection_title")
        or (result.get("type") or "").replace("_", " ").title()
        or None
    )

    async with async_session_factory() as session:
        existing = (
            await session.execute(select(ProtectedArea).where(ProtectedArea.slug == slug))
        ).scalar_one_or_none()
        area = existing or ProtectedArea(id=uuid.uuid4(), slug=slug)
        area.name = name
        area.designation = designation
        area.iucn_category = PROTECT_CLASS_TO_IUCN.get(protect_class)
        area.country = address.get("country")
        area.country_code = (address.get("country_code") or "").upper() or None
        area.state = address.get("state")
        area.biome = None  # not provided by OSM; never guessed
        area.osm_type = result.get("osm_type")
        area.osm_id = str(result.get("osm_id"))
        area.area_km2 = round(area_km2, 2)
        area.centroid_lat = float(centroid.y)
        area.centroid_lon = float(centroid.x)
        area.boundary = from_shape(mp, srid=4326)
        area.analysis_aoi = from_shape(aoi, srid=4326)
        area.analysis_aoi_note = note
        area.source = "OpenStreetMap contributors (Nominatim) — ODbL"
        area.source_fetched_at = datetime.now(timezone.utc)
        if existing is None:
            session.add(area)
        await session.commit()
        await session.refresh(area)
    logger.info(
        "Seeded %s (%s): %.1f km², analysis AOI %.1f km² — %s",
        area.name,
        area.slug,
        area_km2,
        calculate_polygon_area_km2(aoi),
        note,
    )
    return area


async def main(queries: List[str]) -> None:
    for i, query in enumerate(queries):
        if i:
            time.sleep(1.2)  # Nominatim usage policy: max 1 request/second
        try:
            await upsert_area(query)
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to seed '%s': %s", query, exc)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    asyncio.run(main(sys.argv[1:] or DEFAULT_AREAS))
