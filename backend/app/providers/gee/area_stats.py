"""Real per-area land-cover statistics and NDVI/water timeline from Earth Engine.

Coarse scales are used on purpose (this is context, not change detection) so the free
quota is barely touched. All numbers are computed from Sentinel-2 SR and Dynamic World.
"""

from datetime import date
from typing import Any, Dict, List

import ee

from app.providers.gee.client import ensure_initialized
from app.providers.gee.pipeline import (
    DW_COLLECTION,
    S2_COLLECTION,
    _region,
    _s2_ndvi_collection,
)
from shapely.geometry import shape

from app.services.analysis_validation import calculate_polygon_area_km2

DW_CLASSES = [
    "water",
    "trees",
    "grass",
    "flooded_vegetation",
    "crops",
    "shrub_and_scrub",
    "built",
    "bare",
    "snow_and_ice",
]


def _scale_for(area_km2: float) -> int:
    return 100 if area_km2 <= 1500 else 200


def compute_statistics(aoi: Dict[str, Any], start: date, end: date) -> Dict[str, Any]:
    ensure_initialized()
    region = _region(aoi)
    area_km2 = calculate_polygon_area_km2(shape(aoi))
    scale = _scale_for(area_km2)
    dw = (
        ee.ImageCollection(DW_COLLECTION)
        .filterBounds(region)
        .filterDate(start.isoformat(), end.isoformat())
        .select("label")
    )
    label = dw.mode().rename("label")
    hist = ee.Dictionary(
        label.reduceRegion(
            reducer=ee.Reducer.frequencyHistogram(),
            geometry=region,
            scale=scale,
            maxPixels=10_000_000,
            bestEffort=True,
        ).get("label")
    ).getInfo()
    counts = {DW_CLASSES[int(float(k))]: float(v) for k, v in (hist or {}).items()}
    total = sum(counts.values())
    if total <= 0:
        raise RuntimeError("Dynamic World returned no pixels for this area/window.")
    ha_per_px = (scale * scale) / 10_000.0
    distribution = {k: round(100.0 * v / total, 2) for k, v in counts.items()}

    recent_start = ee.Date(end.isoformat()).advance(-90, "day")
    last = (
        ee.ImageCollection(S2_COLLECTION)
        .filterBounds(region)
        .filterDate(recent_start, ee.Date(end.isoformat()))
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
        .aggregate_max("system:time_start")
        .getInfo()
    )
    last_pass = ee.Date(last).format("YYYY-MM-dd").getInfo() if last else None

    return {
        "source": "Google Dynamic World V1 (CC BY 4.0) — modal land-cover label",
        "scale_m": scale,
        "window": f"{start.isoformat()} to {end.isoformat()}",
        "forest_cover_percent": distribution.get("trees", 0.0),
        "water_bodies_ha": round(counts.get("water", 0.0) * ha_per_px, 1),
        "urban_builtup_ha": round(counts.get("built", 0.0) * ha_per_px, 1),
        "land_cover_distribution": distribution,
        "last_cloud_free_pass": last_pass,
    }


def compute_timeline(aoi: Dict[str, Any], end: date, months: int = 24) -> Dict[str, Any]:
    """Monthly median NDVI (cloud-masked) and surface-water hectares for the last `months`."""
    ensure_initialized()
    region = _region(aoi)
    area_km2 = calculate_polygon_area_km2(shape(aoi))
    scale = _scale_for(area_km2) * 2
    start = ee.Date(end.isoformat()).advance(-months, "month")
    starts = ee.List.sequence(0, months - 1).map(lambda i: start.advance(ee.Number(i), "month"))

    def _month(d: Any) -> ee.Feature:
        m0 = ee.Date(d)
        m1 = m0.advance(1, "month")
        ndvi = _s2_ndvi_collection(region, m0, m1)  # type: ignore[arg-type]
        n_img = ndvi.median().rename("ndvi")
        water = (
            ee.ImageCollection(DW_COLLECTION)
            .filterBounds(region)
            .filterDate(m0, m1)
            .select("water")
            .mean()
            .gte(0.5)
            .rename("water")
        )
        stack = n_img.addBands(water)
        vals = stack.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=scale,
            maxPixels=5_000_000,
            bestEffort=True,
        )
        return ee.Feature(None, {"date": m0.format("YYYY-MM-dd")}).set(vals)

    fc = ee.FeatureCollection(starts.map(_month))
    data = fc.getInfo()["features"]
    points: List[Dict[str, Any]] = []
    for f in data:
        p = f["properties"]
        water_frac = p.get("water")
        points.append(
            {
                "date": p["date"],
                "ndvi": round(p["ndvi"], 4) if p.get("ndvi") is not None else None,
                "water_cover_ha": round(water_frac * area_km2 * 100.0, 1)
                if water_frac is not None
                else None,
            }
        )
    # Baseline = same calendar month one year earlier.
    for i, p in enumerate(points):
        p["baseline"] = points[i - 12]["ndvi"] if i >= 12 else None
    return {
        "source": "Sentinel-2 SR Harmonized (cloud-masked monthly median NDVI); Dynamic World water",
        "scale_m": scale,
        "points": points[12:],
        "notes": [
            "Months with no cloud-free scene are null, never interpolated.",
            "baseline is the same calendar month one year earlier.",
        ],
    }
