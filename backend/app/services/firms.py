"""NASA FIRMS (Fire Information for Resource Management System) integration service.

Fetches real-time thermal anomalies and active fire detections from NASA VIIRS / MODIS satellites.
Handles rate limiting (5000 transactions / 10 min), caching, and bounding-box queries for protected areas.
"""

import csv
import io
import logging
import time
from typing import Any, Dict, List, Optional
import httpx
from geoalchemy2.shape import to_shape

from app.core.config import settings

logger = logging.getLogger("firms")

# In-memory cache for FIRMS queries: cache_key -> (timestamp, data)
_FIRMS_CACHE: Dict[str, tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 600  # 10 minutes (aligns with NASA FIRMS transaction refresh interval)


async def fetch_active_fires(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
    days: int = 3,
    sensor: str = "VIIRS_SNPP_NRT",
) -> Dict[str, Any]:
    """Fetch active fires from NASA FIRMS Area CSV API for given bounding box."""
    key = settings.FIRMS_MAP_KEY
    if not key:
        return {
            "configured": False,
            "count": 0,
            "fires": [],
            "message": "NASA FIRMS MAP_KEY is not configured.",
        }

    # Bounding box bounds formatted as minLon,minLat,maxLon,maxLat
    bbox_str = f"{min_lon:.4f},{min_lat:.4f},{max_lon:.4f},{max_lat:.4f}"
    cache_key = f"{bbox_str}_{days}_{sensor}"

    now = time.time()
    if cache_key in _FIRMS_CACHE:
        cached_time, cached_data = _FIRMS_CACHE[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            logger.debug("Returning cached NASA FIRMS fire detections for %s", bbox_str)
            return cached_data

    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{sensor}/{bbox_str}/{days}"
    headers = {"User-Agent": "CodeNiti-WildlifeMonitor/1.0 (conservation research)"}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                logger.warning("NASA FIRMS returned status %d: %s", resp.status_code, resp.text[:200])
                return {
                    "configured": True,
                    "count": 0,
                    "fires": [],
                    "error": f"FIRMS HTTP {resp.status_code}",
                }

            content = resp.text
            reader = csv.DictReader(io.StringIO(content))
            fires: List[Dict[str, Any]] = []

            for row in reader:
                try:
                    lat = float(row.get("latitude", 0))
                    lon = float(row.get("longitude", 0))
                    frp = float(row.get("frp", 0.0)) if row.get("frp") else 0.0
                    conf = row.get("confidence", "nominal")
                    acq_date = row.get("acq_date", "")
                    acq_time = row.get("acq_time", "")
                    fires.append(
                        {
                            "latitude": lat,
                            "longitude": lon,
                            "acq_date": acq_date,
                            "acq_time": acq_time,
                            "confidence": conf,
                            "frp": frp,
                            "satellite": row.get("satellite", "N"),
                        }
                    )
                except (ValueError, KeyError):
                    continue

            result = {
                "configured": True,
                "count": len(fires),
                "fires": fires,
                "source": f"NASA FIRMS ({sensor})",
                "days_window": days,
                "bbox": [min_lon, min_lat, max_lon, max_lat],
                "queried_at": now,
            }

            _FIRMS_CACHE[cache_key] = (now, result)
            return result

    except Exception as exc:
        logger.error("Failed to fetch NASA FIRMS data: %s", exc)
        return {
            "configured": True,
            "count": 0,
            "fires": [],
            "error": str(exc),
        }


async def get_active_fires_for_area(area: Any, days: int = 3) -> Dict[str, Any]:
    """Calculate area bounding box and fetch NASA FIRMS active fires."""
    min_lon, min_lat, max_lon, max_lat = 0.0, 0.0, 0.0, 0.0

    try:
        if getattr(area, "boundary", None) is not None:
            geom = to_shape(area.boundary)
            min_lon, min_lat, max_lon, max_lat = geom.bounds
        elif getattr(area, "centroid", None) is not None:
            c = to_shape(area.centroid)
            min_lon, max_lon = c.x - 0.5, c.x + 0.5
            min_lat, max_lat = c.y - 0.5, c.y + 0.5
        else:
            return {"configured": bool(settings.FIRMS_MAP_KEY), "count": 0, "fires": []}
    except Exception:
        return {"configured": bool(settings.FIRMS_MAP_KEY), "count": 0, "fires": []}

    # Add small buffer around boundary for buffer zone / corridor detection
    buffer = 0.05
    return await fetch_active_fires(
        min_lon - buffer,
        min_lat - buffer,
        max_lon + buffer,
        max_lat + buffer,
        days=days,
    )
