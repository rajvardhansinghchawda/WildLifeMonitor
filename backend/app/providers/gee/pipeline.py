"""Real Earth Engine change-detection pipelines (vegetation, water, built-up).

Scientific / labelling rules enforced here (rules.md, systemdesign.md):
- No data is never treated as no change: masked pixels are excluded from every statistic.
- NDVI change is reported as an index difference, never as "percent vegetation loss".
- Built-up output is a *probability* change candidate, never construction area.
- The analysis-grid resolution is chosen from the AOI size and always recorded; it is
  never silently coarsened.
"""

import logging
import math
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from typing import Any, Callable, Dict, List, Optional, Tuple

import ee
from shapely.geometry import shape

from app.providers.gee.client import fetch_bytes
from app.services.analysis_validation import calculate_polygon_area_km2

logger = logging.getLogger(__name__)

S2_COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"
DW_COLLECTION = "GOOGLE/DYNAMICWORLD/V1"
S2_FIRST_DATE = date(2017, 3, 28)
DW_FIRST_DATE = date(2015, 6, 27)

PIXEL_BUDGET = 3_000_000
MIN_EVENT_HA = 0.5
MAX_EVENTS = 300
MIN_SCENES_PER_WINDOW = 1
MIN_VALID_FRACTION = 0.2
USABLE_VALID_FRACTION = 0.7

# Versioned method thresholds
NDVI_DROP_THRESHOLD = 0.2  # comparison - baseline <= -0.2
BASELINE_MIN_NDVI = 0.35  # only previously vegetated pixels can be a "vegetation loss candidate"
WATER_T = 0.6
LAND_T = 0.4
BUILT_HIGH = 0.6
BUILT_LOW = 0.3

DIVERGING_PALETTE = ["#b2182b", "#ef8a62", "#fddbc7", "#f7f7f7", "#d9f0d3", "#7fbf7b", "#1b7837"]
NDVI_PALETTE = ["#7a4f1d", "#c9a15a", "#e8dca8", "#9cc46b", "#4c9a2a", "#1a6b1a"]
WATER_PALETTE = ["#ffffff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"]
BUILT_PALETTE = ["#ffffff", "#fdd0a2", "#fd8d3c", "#d94801", "#7f2704"]
WATER_CHANGE_PALETTE = ["#d95f0e", "#f7f7f7", "#2b8cbe"]  # loss, none, gain


def choose_scale_m(area_km2: float) -> int:
    """Pick the analysis-grid resolution so the pixel count stays within PIXEL_BUDGET."""
    raw = math.sqrt((area_km2 * 1e6) / PIXEL_BUDGET)
    return int(min(100, max(10, math.ceil(raw / 10.0) * 10)))


def _bounds(aoi: Dict[str, Any]) -> Tuple[float, float, float, float]:
    return shape(aoi).bounds  # (minx, miny, maxx, maxy)


def _region(aoi: Dict[str, Any]) -> ee.Geometry:
    return ee.Geometry(aoi, None, False)


def _rect(aoi: Dict[str, Any]) -> ee.Geometry:
    minx, miny, maxx, maxy = _bounds(aoi)
    return ee.Geometry.Rectangle([minx, miny, maxx, maxy], None, False)


def _leaflet_bounds(aoi: Dict[str, Any]) -> List[List[float]]:
    minx, miny, maxx, maxy = _bounds(aoi)
    return [[miny, minx], [maxy, maxx]]  # [[south, west], [north, east]]


def _ee_range(start: date, end: date) -> Tuple[ee.Date, ee.Date]:
    return ee.Date(start.isoformat()), ee.Date(end.isoformat())  # end exclusive in EE


# ---------------------------------------------------------------------------
# Sentinel-2 (vegetation)
# ---------------------------------------------------------------------------
def _s2_ndvi_collection(region: ee.Geometry, start: date, end: date) -> ee.ImageCollection:
    s, e = _ee_range(start, end)

    def _prep(img: ee.Image) -> ee.Image:
        scl = img.select("SCL")
        clear = (
            scl.neq(0)
            .And(scl.neq(1))  # saturated / defective
            .And(scl.neq(3))  # cloud shadow
            .And(scl.neq(8))  # cloud medium probability
            .And(scl.neq(9))  # cloud high probability
            .And(scl.neq(10))  # thin cirrus
            .And(scl.neq(11))  # snow / ice
        )
        b8 = img.select("B8").toFloat()
        b4 = img.select("B4").toFloat()
        denominator = b8.add(b4)
        ndvi = b8.subtract(b4).divide(denominator).rename("NDVI")
        # zero-denominator pixels are unobserved -> masked, never imputed as 0
        return ndvi.updateMask(clear).updateMask(denominator.gt(0))

    return (
        ee.ImageCollection(S2_COLLECTION)
        .filterBounds(region)
        .filterDate(s, e)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 80))
        .map(_prep)
    )


def _composite(col: ee.ImageCollection) -> ee.Image:
    return col.median().updateMask(col.count().gte(2)).rename("v")


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------
def _thumb_png(
    image: ee.Image,
    aoi: Dict[str, Any],
    vis: Dict[str, Any],
    max_dim: int = 1200,
) -> bytes:
    region = _region(aoi)
    styled = image.clip(region).visualize(**vis)
    url = styled.getThumbURL(
        {"region": _rect(aoi), "dimensions": max_dim, "format": "png", "crs": "EPSG:3857"}
    )
    return fetch_bytes(url)


def _geotiff(image: ee.Image, aoi: Dict[str, Any], scale: int, band_name: str) -> bytes:
    exported = image.rename(band_name).unmask(-9999).toFloat()
    url = exported.getDownloadURL(
        {
            "region": _region(aoi),
            "scale": scale,
            "crs": "EPSG:4326",
            "format": "GEO_TIFF",
        }
    )
    return fetch_bytes(url)


def _vectorize(
    mask_img: ee.Image,
    stack_img: ee.Image,
    region: ee.Geometry,
    scale: int,
) -> ee.Dictionary:
    """Vectorize a candidate mask into polygons >= MIN_EVENT_HA with per-polygon band means."""
    cand = mask_img.selfMask().toInt().rename("c")
    min_px = int(math.ceil(MIN_EVENT_HA * 1e4 / (scale * scale)))
    if min_px > 1:
        cc = cand.connectedPixelCount(maxSize=min(256, max(min_px, 2)), eightConnected=True)
        cand = cand.updateMask(cc.gte(min_px))
    vectors = cand.reduceToVectors(
        geometry=region,
        scale=scale,
        geometryType="polygon",
        eightConnected=True,
        labelProperty="c",
        maxPixels=1e10,
        tileScale=4,
    )
    enriched = stack_img.reduceRegions(
        collection=vectors, reducer=ee.Reducer.mean(), scale=scale, tileScale=4
    )
    enriched = enriched.map(
        lambda f: ee.Feature(f).set("area_ha", ee.Feature(f).geometry().area(1).divide(1e4))
    ).filter(ee.Filter.gte("area_ha", MIN_EVENT_HA))

    def _pack(item: Any) -> Any:
        feature = ee.Feature(item)
        geometry = feature.geometry()
        return (
            feature.toDictionary()
            .set("coords", geometry.coordinates())
            .set("gtype", geometry.type())
        )

    # NOTE: a FeatureCollection nested in an ee.Dictionary is serialized without its
    # features, so features are packed into plain dictionaries (geometry as coordinates).
    return ee.Dictionary(
        {
            "count": enriched.size(),
            "area_ha": enriched.aggregate_sum("area_ha"),
            "items": enriched.sort("area_ha", False)
            .limit(MAX_EVENTS)
            .toList(MAX_EVENTS)
            .map(_pack),
        }
    )


def _features(vec: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Rebuild GeoJSON-like features from the packed dictionaries returned by _vectorize."""
    out: List[Dict[str, Any]] = []
    for item in vec.get("items") or []:
        props = {k: v for k, v in item.items() if k not in ("coords", "gtype")}
        out.append(
            {
                "geometry": {"type": item["gtype"], "coordinates": item["coords"]},
                "properties": props,
            }
        )
    return out


def _run_parallel(tasks: Dict[str, Callable[[], Any]]) -> Dict[str, Any]:
    """Run independent Earth Engine requests concurrently.

    Each export re-evaluates the composite server-side, so issuing them in parallel cuts
    wall-clock time roughly to that of the slowest request. Failures are captured per task
    (returned as the exception object) so one failed overlay never discards the metrics.
    """
    results: Dict[str, Any] = {}
    with ThreadPoolExecutor(max_workers=max(1, len(tasks))) as pool:
        futures = {name: pool.submit(fn) for name, fn in tasks.items()}
        for name, future in futures.items():
            try:
                results[name] = future.result()
            except Exception as exc:  # noqa: BLE001
                results[name] = exc
    return results


def _asset_tasks(
    aoi: Dict[str, Any],
    scale: int,
    change: Tuple[ee.Image, Dict[str, Any]],
    baseline: Tuple[ee.Image, Dict[str, Any]],
    comparison: Tuple[ee.Image, Dict[str, Any]],
    raster: ee.Image,
    raster_band: str,
) -> Dict[str, Callable[[], Any]]:
    return {
        "change_overlay": lambda: _thumb_png(change[0], aoi, change[1]),
        "baseline_overlay": lambda: _thumb_png(baseline[0], aoi, baseline[1]),
        "comparison_overlay": lambda: _thumb_png(comparison[0], aoi, comparison[1]),
        "change_raster": lambda: _geotiff(raster, aoi, scale, raster_band),
    }


def _collect_payloads(
    results: Dict[str, Any],
    aoi: Dict[str, Any],
    prefix: str,
    scale: int,
    raster_band: str,
    legends: Dict[str, Dict[str, Any]],
    warnings: List[str],
) -> List[Dict[str, Any]]:
    payloads: List[Dict[str, Any]] = []
    for role in ("change_overlay", "baseline_overlay", "comparison_overlay", "change_raster"):
        outcome = results.get(role)
        if outcome is None or isinstance(outcome, Exception):
            warnings.append(f"{role} could not be produced: {outcome}")
            continue
        if role == "change_raster":
            payloads.append(
                _payload(
                    role,
                    f"{prefix}_change.tif",
                    outcome,
                    "image/tiff",
                    aoi,
                    extra={
                        "nodata": -9999,
                        "band": raster_band,
                        "scale_m": scale,
                        "crs": "EPSG:4326",
                    },
                )
            )
        else:
            payloads.append(
                _payload(
                    role,
                    f"{prefix}_{role.split('_')[0]}.png",
                    outcome,
                    "image/png",
                    aoi,
                    legend=legends[role],
                )
            )
    return payloads


def _quality(valid_fraction: float) -> str:
    return "usable" if valid_fraction >= USABLE_VALID_FRACTION else "degraded"


def _insufficient(
    method_version: str, reason: str, code: str, details: Dict[str, Any]
) -> Dict[str, Any]:
    return {
        "status": "insufficientdata",
        "method_version": method_version,
        "quality_label": "insufficient",
        "metrics": {},
        "events": [],
        "payloads": [],
        "warnings": [reason],
        "error_code": code,
        "error_details": {"reason": reason, **details},
        "provenance": details,
    }


def _payload(
    role: str,
    filename: str,
    content: bytes,
    media_type: str,
    aoi: Dict[str, Any],
    legend: Optional[Dict[str, Any]] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    metadata: Dict[str, Any] = {"role": role, "bounds": _leaflet_bounds(aoi)}
    if legend:
        metadata["legend"] = legend
    if extra:
        metadata.update(extra)
    return {
        "role": role,
        "filename": filename,
        "content": content,
        "media_type": media_type,
        "metadata": metadata,
    }


# ---------------------------------------------------------------------------
# Vegetation (Sentinel-2 NDVI difference)
# ---------------------------------------------------------------------------
def run_vegetation(
    aoi: Dict[str, Any],
    baseline: Tuple[date, date],
    comparison: Tuple[date, date],
) -> Dict[str, Any]:
    method_version = "vegetation-gee-v1"
    region = _region(aoi)
    aoi_km2 = calculate_polygon_area_km2(shape(aoi))
    aoi_ha = aoi_km2 * 100.0
    scale = choose_scale_m(aoi_km2)

    base_col = _s2_ndvi_collection(region, *baseline)
    comp_col = _s2_ndvi_collection(region, *comparison)
    scene_counts = ee.Dictionary(
        {"baseline": base_col.size(), "comparison": comp_col.size()}
    ).getInfo()
    provenance = {
        "provider": "google-earth-engine",
        "dataset": S2_COLLECTION,
        "bands": ["B4", "B8", "SCL"],
        "method": "sentinel2_scl_masked_median_ndvi_difference",
        "baseline_window": f"{baseline[0]} to {baseline[1]} (end exclusive)",
        "comparison_window": f"{comparison[0]} to {comparison[1]} (end exclusive)",
        "scenes": scene_counts,
        "analysis_scale_m": scale,
        "native_resolution_m": 10,
        "analysis_crs": "EPSG:4326",
        "thresholds": {
            "ndvi_drop": NDVI_DROP_THRESHOLD,
            "baseline_min_ndvi": BASELINE_MIN_NDVI,
            "min_event_ha": MIN_EVENT_HA,
        },
    }
    if (
        scene_counts["baseline"] < MIN_SCENES_PER_WINDOW
        or scene_counts["comparison"] < MIN_SCENES_PER_WINDOW
    ):
        return _insufficient(
            method_version,
            "No usable Sentinel-2 observations in one of the observation windows.",
            "INSUFFICIENTVALIDOBSERVATIONS",
            provenance,
        )

    base = _composite(base_col)
    comp = _composite(comp_col)
    diff = comp.subtract(base).rename("diff")
    valid_mask = diff.mask()
    base_v = base.updateMask(valid_mask).rename("base")
    comp_v = comp.updateMask(valid_mask).rename("comp")

    candidate = diff.lte(-NDVI_DROP_THRESHOLD).And(base.gte(BASELINE_MIN_NDVI))
    candidate = candidate.updateMask(valid_mask)

    pixel_ha = ee.Image.pixelArea().divide(1e4)
    means = ee.Image.cat([diff.rename("diff"), base_v, comp_v]).reduceRegion(
        ee.Reducer.mean(), region, scale, maxPixels=1e10, bestEffort=True, tileScale=4
    )
    bins = ee.Image.cat(
        [
            pixel_ha.updateMask(valid_mask).rename("valid_ha"),
            pixel_ha.updateMask(valid_mask.And(diff.lt(-0.4))).rename("severe_loss"),
            pixel_ha.updateMask(valid_mask.And(diff.gte(-0.4)).And(diff.lt(-0.2))).rename(
                "moderate_loss"
            ),
            pixel_ha.updateMask(valid_mask.And(diff.gte(-0.2)).And(diff.lte(0.2))).rename("stable"),
            pixel_ha.updateMask(valid_mask.And(diff.gt(0.2)).And(diff.lte(0.4))).rename("gain"),
            pixel_ha.updateMask(valid_mask.And(diff.gt(0.4))).rename("high_gain"),
        ]
    ).reduceRegion(ee.Reducer.sum(), region, scale, maxPixels=1e10, bestEffort=True, tileScale=4)
    hist = ee.Image.cat([base_v, comp_v]).reduceRegion(
        ee.Reducer.fixedHistogram(0, 1, 10),
        region,
        scale,
        maxPixels=1e10,
        bestEffort=True,
        tileScale=4,
    )
    vectors = _vectorize(
        candidate, ee.Image.cat([diff.rename("diff"), base_v, comp_v]), region, scale
    )

    asset_tasks = _asset_tasks(
        aoi,
        scale,
        change=(diff, {"min": -0.5, "max": 0.5, "palette": DIVERGING_PALETTE}),
        baseline=(base_v, {"min": 0.0, "max": 0.9, "palette": NDVI_PALETTE}),
        comparison=(comp_v, {"min": 0.0, "max": 0.9, "palette": NDVI_PALETTE}),
        raster=diff,
        raster_band="ndvi_change",
    )
    core_task = lambda: ee.Dictionary(  # noqa: E731
        {"means": means, "bins": bins, "hist": hist, "vectors": vectors}
    ).getInfo()
    parallel = _run_parallel({"core": core_task, **asset_tasks})
    if isinstance(parallel["core"], Exception):
        raise parallel["core"]
    evaluated = parallel["core"]
    means_v = evaluated["means"]
    bins_v = evaluated["bins"]
    valid_ha = float(bins_v.get("valid_ha") or 0.0)
    valid_fraction = min(1.0, valid_ha / aoi_ha) if aoi_ha > 0 else 0.0

    if means_v.get("diff") is None or valid_fraction < MIN_VALID_FRACTION:
        return _insufficient(
            method_version,
            f"Only {valid_fraction:.0%} of the AOI has valid observations in both windows.",
            "INSUFFICIENTVALIDOBSERVATIONS",
            {**provenance, "valid_pixel_fraction": valid_fraction},
        )

    vec = evaluated["vectors"]
    events: List[Dict[str, Any]] = []
    for feat in _features(vec):
        props = feat["properties"]
        events.append(
            {
                "geometry": feat["geometry"],
                "changetype": "vegetationlosscandidate",
                "affectedareaha": round(float(props["area_ha"]), 4),
                "meanndvichange": round(float(props["diff"]), 4),
                "validpixelfraction": round(valid_fraction, 4),
                "qualitylabel": _quality(valid_fraction),
                "sourceconfidence": None,
                "properties": {
                    "layer_type": "vegetation",
                    "sensor": "Sentinel-2 L2A (SR Harmonized)",
                    "baseline_value": round(float(props["base"]), 4),
                    "comparison_value": round(float(props["comp"]), 4),
                    "value_name": "NDVI",
                    "analysis_scale_m": scale,
                },
            }
        )

    warnings: List[str] = []
    if vec["count"] > len(events):
        warnings.append(
            f"Showing the {len(events)} largest of {vec['count']} loss-candidate components."
        )
    warnings.append(
        f"Analysis grid {scale} m (native 10 m); components smaller than {MIN_EVENT_HA} ha excluded."
    )

    hist_v = evaluated["hist"]

    def _density(key: str) -> List[Dict[str, float]]:
        rows = hist_v.get(key) or []
        total = sum(r[1] for r in rows) or 1.0
        return [{"ndvi": f"{r[0]:.1f}", "density": round(r[1] / total, 5)} for r in rows]

    base_density = _density("base")
    comp_density = _density("comp")
    distributions = {
        "ndvi": [
            {
                "ndvi": b["ndvi"],
                "baseline": b["density"],
                "current": c["density"],
            }
            for b, c in zip(base_density, comp_density)
        ],
        "change_bins": [
            {
                "key": "severe_loss",
                "label": "< -0.4 (severe loss)",
                "areaHa": round(bins_v["severe_loss"] or 0, 2),
            },
            {
                "key": "moderate_loss",
                "label": "-0.4 to -0.2",
                "areaHa": round(bins_v["moderate_loss"] or 0, 2),
            },
            {
                "key": "stable",
                "label": "-0.2 to +0.2 (stable)",
                "areaHa": round(bins_v["stable"] or 0, 2),
            },
            {"key": "gain", "label": "+0.2 to +0.4", "areaHa": round(bins_v["gain"] or 0, 2)},
            {
                "key": "high_gain",
                "label": "> +0.4 (high gain)",
                "areaHa": round(bins_v["high_gain"] or 0, 2),
            },
        ],
    }

    loss_ha = round(float(vec["area_ha"] or 0.0), 4)
    gain_ha = round(float((bins_v["gain"] or 0) + (bins_v["high_gain"] or 0)), 4)
    metrics = {
        "meanndvichange": round(float(means_v["diff"]), 4),
        "vegetationlossareaha": loss_ha,
        "vegetationgainareaha": gain_ha,
        "baselinemeanndvi": round(float(means_v["base"]), 4),
        "comparisonmeanndvi": round(float(means_v["comp"]), 4),
        "validpixelfraction": round(valid_fraction, 4),
        "validareaha": round(valid_ha, 2),
        "aoiareaha": round(aoi_ha, 2),
        "analysisscalem": scale,
        "eventcount": int(vec["count"]),
        "distributions": distributions,
    }

    payloads = _collect_payloads(
        parallel,
        aoi,
        "vegetation",
        scale,
        "ndvi_change",
        legends={
            "change_overlay": {
                "title": "NDVI change (comparison − baseline)",
                "min": -0.5,
                "max": 0.5,
                "palette": DIVERGING_PALETTE,
                "unit": "NDVI index",
            },
            "baseline_overlay": {
                "title": "Baseline NDVI",
                "min": 0.0,
                "max": 0.9,
                "palette": NDVI_PALETTE,
                "unit": "NDVI index",
            },
            "comparison_overlay": {
                "title": "Comparison NDVI",
                "min": 0.0,
                "max": 0.9,
                "palette": NDVI_PALETTE,
                "unit": "NDVI index",
            },
        },
        warnings=warnings,
    )

    return {
        "status": "ready",
        "method_version": method_version,
        "quality_label": _quality(valid_fraction),
        "metrics": metrics,
        "events": events,
        "payloads": payloads,
        "warnings": warnings,
        "provenance": provenance,
    }


# ---------------------------------------------------------------------------
# Dynamic World based layers (water, built-up)
# ---------------------------------------------------------------------------
def _dw_probability(
    region: ee.Geometry, start: date, end: date, band: str
) -> Tuple[ee.Image, ee.ImageCollection]:
    s, e = _ee_range(start, end)
    col = ee.ImageCollection(DW_COLLECTION).filterBounds(region).filterDate(s, e).select(band)
    return col.mean().updateMask(col.count().gte(2)).rename("p"), col


def run_water(
    aoi: Dict[str, Any],
    baseline: Tuple[date, date],
    comparison: Tuple[date, date],
) -> Dict[str, Any]:
    method_version = "water-gee-v1"
    region = _region(aoi)
    aoi_km2 = calculate_polygon_area_km2(shape(aoi))
    aoi_ha = aoi_km2 * 100.0
    scale = choose_scale_m(aoi_km2)

    base, base_col = _dw_probability(region, *baseline, "water")
    comp, comp_col = _dw_probability(region, *comparison, "water")
    scene_counts = ee.Dictionary(
        {"baseline": base_col.size(), "comparison": comp_col.size()}
    ).getInfo()
    provenance = {
        "provider": "google-earth-engine",
        "dataset": DW_COLLECTION,
        "bands": ["water"],
        "method": "matched_period_dynamic_world_water_probability",
        "baseline_window": f"{baseline[0]} to {baseline[1]} (end exclusive)",
        "comparison_window": f"{comparison[0]} to {comparison[1]} (end exclusive)",
        "scenes": scene_counts,
        "analysis_scale_m": scale,
        "native_resolution_m": 10,
        "analysis_crs": "EPSG:4326",
        "thresholds": {"water": WATER_T, "land": LAND_T, "min_event_ha": MIN_EVENT_HA},
    }
    if (
        scene_counts["baseline"] < MIN_SCENES_PER_WINDOW
        or scene_counts["comparison"] < MIN_SCENES_PER_WINDOW
    ):
        return _insufficient(
            method_version,
            "No Dynamic World observations in one of the observation windows.",
            "INSUFFICIENTVALIDOBSERVATIONS",
            provenance,
        )

    valid_mask = base.mask().And(comp.mask())
    gain = base.lt(LAND_T).And(comp.gte(WATER_T)).updateMask(valid_mask)
    loss = base.gte(WATER_T).And(comp.lt(LAND_T)).updateMask(valid_mask)
    ambiguous = valid_mask.And(
        base.gte(LAND_T).And(base.lt(WATER_T)).Or(comp.gte(LAND_T).And(comp.lt(WATER_T)))
    )
    diff = comp.subtract(base).rename("diff")

    pixel_ha = ee.Image.pixelArea().divide(1e4)
    areas = ee.Image.cat(
        [
            pixel_ha.updateMask(valid_mask).rename("valid_ha"),
            pixel_ha.updateMask(valid_mask.And(base.gte(WATER_T))).rename("base_water_ha"),
            pixel_ha.updateMask(valid_mask.And(comp.gte(WATER_T))).rename("comp_water_ha"),
            pixel_ha.updateMask(ambiguous).rename("ambiguous_ha"),
        ]
    ).reduceRegion(ee.Reducer.sum(), region, scale, maxPixels=1e10, bestEffort=True, tileScale=4)
    stack = ee.Image.cat([diff, base.rename("base"), comp.rename("comp")])
    gain_vec = _vectorize(gain, stack, region, scale)
    loss_vec = _vectorize(loss, stack, region, scale)

    change_class = gain.unmask(0).subtract(loss.unmask(0)).updateMask(valid_mask).rename("d")
    asset_tasks = _asset_tasks(
        aoi,
        scale,
        change=(change_class, {"min": -1, "max": 1, "palette": WATER_CHANGE_PALETTE}),
        baseline=(base, {"min": 0.0, "max": 1.0, "palette": WATER_PALETTE}),
        comparison=(comp, {"min": 0.0, "max": 1.0, "palette": WATER_PALETTE}),
        raster=diff,
        raster_band="water_probability_change",
    )
    water_core = lambda: ee.Dictionary(  # noqa: E731
        {"areas": areas, "gain": gain_vec, "loss": loss_vec}
    ).getInfo()
    parallel = _run_parallel({"core": water_core, **asset_tasks})
    if isinstance(parallel["core"], Exception):
        raise parallel["core"]
    ev = parallel["core"]
    valid_ha = float(ev["areas"].get("valid_ha") or 0.0)
    valid_fraction = min(1.0, valid_ha / aoi_ha) if aoi_ha > 0 else 0.0
    if valid_fraction < MIN_VALID_FRACTION:
        return _insufficient(
            method_version,
            f"Only {valid_fraction:.0%} of the AOI has valid observations in both windows.",
            "INSUFFICIENTVALIDOBSERVATIONS",
            {**provenance, "valid_pixel_fraction": valid_fraction},
        )

    events: List[Dict[str, Any]] = []
    for key, change_type in (("gain", "watergaincandidate"), ("loss", "waterlosscandidate")):
        for feat in _features(ev[key]):
            props = feat["properties"]
            events.append(
                {
                    "geometry": feat["geometry"],
                    "changetype": change_type,
                    "affectedareaha": round(float(props["area_ha"]), 4),
                    "meanndvichange": None,
                    "validpixelfraction": round(valid_fraction, 4),
                    "qualitylabel": _quality(valid_fraction),
                    "sourceconfidence": None,
                    "properties": {
                        "layer_type": "water",
                        "sensor": "Dynamic World V1 (Sentinel-2)",
                        "baseline_value": round(float(props["base"]), 4),
                        "comparison_value": round(float(props["comp"]), 4),
                        "value_name": "water probability",
                        "analysis_scale_m": scale,
                    },
                }
            )

    gain_ha = round(float(ev["gain"]["area_ha"] or 0.0), 4)
    loss_ha = round(float(ev["loss"]["area_ha"] or 0.0), 4)
    base_water = round(float(ev["areas"].get("base_water_ha") or 0.0), 4)
    comp_water = round(float(ev["areas"].get("comp_water_ha") or 0.0), 4)
    net = round(gain_ha - loss_ha, 4)
    relative_pct: Optional[float] = round(net / base_water * 100.0, 2) if base_water > 0 else None
    metrics = {
        "baselinewaterareaha": base_water,
        "comparisonwaterareaha": comp_water,
        "watergainareaha": gain_ha,
        "waterlossareaha": loss_ha,
        "netwaterchangeha": net,
        "ambiguousareaha": round(float(ev["areas"].get("ambiguous_ha") or 0.0), 4),
        "validcomparisonareaha": round(valid_ha, 4),
        "relativechangepct": relative_pct,
        "validpixelfraction": round(valid_fraction, 4),
        "aoiareaha": round(aoi_ha, 2),
        "analysisscalem": scale,
        "eventcount": int(ev["gain"]["count"]) + int(ev["loss"]["count"]),
    }
    warnings = [
        f"Ambiguous probability pixels ({LAND_T} <= p < {WATER_T}) remain unclassified.",
        f"Analysis grid {scale} m (native 10 m); components smaller than {MIN_EVENT_HA} ha excluded.",
    ]
    if relative_pct is None:
        warnings.append(
            "Baseline classified water area is zero: relative change is undefined (null)."
        )

    payloads = _collect_payloads(
        parallel,
        aoi,
        "water",
        scale,
        "water_probability_change",
        legends={
            "change_overlay": {
                "title": "Water change (loss / no change / gain)",
                "min": -1,
                "max": 1,
                "palette": WATER_CHANGE_PALETTE,
                "unit": "class",
            },
            "baseline_overlay": {
                "title": "Baseline water probability",
                "min": 0.0,
                "max": 1.0,
                "palette": WATER_PALETTE,
                "unit": "probability",
            },
            "comparison_overlay": {
                "title": "Comparison water probability",
                "min": 0.0,
                "max": 1.0,
                "palette": WATER_PALETTE,
                "unit": "probability",
            },
        },
        warnings=warnings,
    )

    return {
        "status": "ready",
        "method_version": method_version,
        "quality_label": _quality(valid_fraction),
        "metrics": metrics,
        "events": events,
        "payloads": payloads,
        "warnings": warnings,
        "provenance": provenance,
    }


def run_builtup(
    aoi: Dict[str, Any],
    baseline: Tuple[date, date],
    comparison: Tuple[date, date],
) -> Dict[str, Any]:
    method_version = "builtup-gee-v1"
    region = _region(aoi)
    aoi_km2 = calculate_polygon_area_km2(shape(aoi))
    aoi_ha = aoi_km2 * 100.0
    scale = choose_scale_m(aoi_km2)

    base, base_col = _dw_probability(region, *baseline, "built")
    comp, comp_col = _dw_probability(region, *comparison, "built")
    scene_counts = ee.Dictionary(
        {"baseline": base_col.size(), "comparison": comp_col.size()}
    ).getInfo()
    provenance = {
        "provider": "google-earth-engine",
        "dataset": DW_COLLECTION,
        "bands": ["built"],
        "method": "matched_period_dynamic_world_built_probability",
        "baseline_window": f"{baseline[0]} to {baseline[1]} (end exclusive)",
        "comparison_window": f"{comparison[0]} to {comparison[1]} (end exclusive)",
        "scenes": scene_counts,
        "analysis_scale_m": scale,
        "native_resolution_m": 10,
        "analysis_crs": "EPSG:4326",
        "thresholds": {
            "built_low": BUILT_LOW,
            "built_high": BUILT_HIGH,
            "min_event_ha": MIN_EVENT_HA,
        },
        "label": "probability change",
    }
    if (
        scene_counts["baseline"] < MIN_SCENES_PER_WINDOW
        or scene_counts["comparison"] < MIN_SCENES_PER_WINDOW
    ):
        return _insufficient(
            method_version,
            "No Dynamic World observations in one of the observation windows.",
            "INSUFFICIENTVALIDOBSERVATIONS",
            provenance,
        )

    valid_mask = base.mask().And(comp.mask())
    diff = comp.subtract(base).rename("diff")
    candidate = base.lt(BUILT_LOW).And(comp.gte(BUILT_HIGH)).updateMask(valid_mask)
    ambiguous = valid_mask.And(
        base.gte(BUILT_LOW)
        .And(base.lt(BUILT_HIGH))
        .Or(comp.gte(BUILT_LOW).And(comp.lt(BUILT_HIGH)))
    )

    pixel_ha = ee.Image.pixelArea().divide(1e4)
    areas = ee.Image.cat(
        [
            pixel_ha.updateMask(valid_mask).rename("valid_ha"),
            pixel_ha.updateMask(ambiguous).rename("ambiguous_ha"),
        ]
    ).reduceRegion(ee.Reducer.sum(), region, scale, maxPixels=1e10, bestEffort=True, tileScale=4)
    mean_diff = diff.updateMask(valid_mask).reduceRegion(
        ee.Reducer.mean(), region, scale, maxPixels=1e10, bestEffort=True, tileScale=4
    )
    stack = ee.Image.cat([diff, base.rename("base"), comp.rename("comp")])
    vectors = _vectorize(candidate, stack, region, scale)
    valid_diff = diff.updateMask(valid_mask)
    asset_tasks = _asset_tasks(
        aoi,
        scale,
        change=(valid_diff, {"min": -0.5, "max": 0.5, "palette": DIVERGING_PALETTE[::-1]}),
        baseline=(base, {"min": 0.0, "max": 1.0, "palette": BUILT_PALETTE}),
        comparison=(comp, {"min": 0.0, "max": 1.0, "palette": BUILT_PALETTE}),
        raster=diff,
        raster_band="built_probability_change",
    )
    built_core = lambda: ee.Dictionary(  # noqa: E731
        {"areas": areas, "mean": mean_diff, "vectors": vectors}
    ).getInfo()
    parallel = _run_parallel({"core": built_core, **asset_tasks})
    if isinstance(parallel["core"], Exception):
        raise parallel["core"]
    ev = parallel["core"]

    valid_ha = float(ev["areas"].get("valid_ha") or 0.0)
    valid_fraction = min(1.0, valid_ha / aoi_ha) if aoi_ha > 0 else 0.0
    if valid_fraction < MIN_VALID_FRACTION:
        return _insufficient(
            method_version,
            f"Only {valid_fraction:.0%} of the AOI has valid observations in both windows.",
            "INSUFFICIENTVALIDOBSERVATIONS",
            {**provenance, "valid_pixel_fraction": valid_fraction},
        )

    events: List[Dict[str, Any]] = []
    for feat in _features(ev["vectors"]):
        props = feat["properties"]
        events.append(
            {
                "geometry": feat["geometry"],
                "changetype": "builtupprobabilitychangecandidate",
                "affectedareaha": round(float(props["area_ha"]), 4),
                "meanndvichange": None,
                "validpixelfraction": round(valid_fraction, 4),
                "qualitylabel": _quality(valid_fraction),
                "sourceconfidence": None,
                "properties": {
                    "layer_type": "builtup",
                    "sensor": "Dynamic World V1 (Sentinel-2)",
                    "baseline_value": round(float(props["base"]), 4),
                    "comparison_value": round(float(props["comp"]), 4),
                    "value_name": "built-class probability",
                    "meanprobabilitychange": round(float(props["diff"]), 4),
                    "label": "probability change",
                    "analysis_scale_m": scale,
                },
            }
        )

    metrics = {
        "builtupgainareaha": round(float(ev["vectors"]["area_ha"] or 0.0), 4),
        "ambiguousareaha": round(float(ev["areas"].get("ambiguous_ha") or 0.0), 4),
        "validcomparisonareaha": round(valid_ha, 4),
        "meanprobabilitychange": round(float(ev["mean"].get("diff") or 0.0), 4),
        "surfaced_label": "probability change",
        "validpixelfraction": round(valid_fraction, 4),
        "aoiareaha": round(aoi_ha, 2),
        "analysisscalem": scale,
        "eventcount": int(ev["vectors"]["count"]),
    }
    warnings = [
        "Built-up output is a class-probability change candidate, not measured construction area.",
        f"Analysis grid {scale} m (native 10 m); components smaller than {MIN_EVENT_HA} ha excluded.",
    ]

    payloads = _collect_payloads(
        parallel,
        aoi,
        "builtup",
        scale,
        "built_probability_change",
        legends={
            "change_overlay": {
                "title": "Built-class probability change",
                "min": -0.5,
                "max": 0.5,
                "palette": DIVERGING_PALETTE[::-1],
                "unit": "probability",
            },
            "baseline_overlay": {
                "title": "Baseline built probability",
                "min": 0.0,
                "max": 1.0,
                "palette": BUILT_PALETTE,
                "unit": "probability",
            },
            "comparison_overlay": {
                "title": "Comparison built probability",
                "min": 0.0,
                "max": 1.0,
                "palette": BUILT_PALETTE,
                "unit": "probability",
            },
        },
        warnings=warnings,
    )

    return {
        "status": "ready",
        "method_version": method_version,
        "quality_label": _quality(valid_fraction),
        "metrics": metrics,
        "events": events,
        "payloads": payloads,
        "warnings": warnings,
        "provenance": provenance,
    }
