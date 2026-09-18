import math
from typing import Any, Dict, List, Tuple

from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry
from shapely.validation import explain_validity

from app.core.exceptions import ValidationException
from app.schemas.analysis import DateWindow


def count_polygon_vertices(geom: BaseGeometry) -> int:
    """Count the total number of coordinate vertices in a Polygon or MultiPolygon."""
    if geom.geom_type == "Polygon":
        # exterior coords + all interior hole coords
        ext_count = len(geom.exterior.coords)  # type: ignore[attr-defined]
        int_count = sum(len(hole.coords) for hole in geom.interiors)  # type: ignore[attr-defined]
        return ext_count + int_count
    elif geom.geom_type == "MultiPolygon":
        return sum(count_polygon_vertices(part) for part in geom.geoms)  # type: ignore[attr-defined]
    return 0


def calculate_spherical_ring_area_km2(coords: List[Tuple[float, float]]) -> float:
    """Calculate the geodesic area of a polygon ring on a WGS84 authalic sphere.

    Method: Spherical excess line integral around the polygon boundary.
    Radius: WGS84 authalic radius R = 6371.0088 km.
    Accuracy: Within ~0.2% of ellipsoidal geodesic calculations, suitable for AOI bounds enforcement.
    """
    if len(coords) < 3:
        return 0.0

    radius_km = 6371.0088
    total = 0.0
    num_coords = len(coords)

    for i in range(num_coords):
        p1 = coords[i]
        p2 = coords[(i + 1) % num_coords]

        lon1_rad = math.radians(p1[0])
        lat1_rad = math.radians(p1[1])
        lon2_rad = math.radians(p2[0])
        lat2_rad = math.radians(p2[1])

        d_lon = lon2_rad - lon1_rad
        # Segment contribution to spherical excess
        total += d_lon * (2.0 + math.sin(lat1_rad) + math.sin(lat2_rad))

    area_km2 = abs(total * (radius_km**2) / 2.0)
    return area_km2


def calculate_polygon_area_km2(geom: BaseGeometry) -> float:
    """Calculate total geodesic area of Polygon or MultiPolygon in km²."""
    if geom.geom_type == "Polygon":
        exterior_coords = list(geom.exterior.coords)  # type: ignore[attr-defined]
        ext_area = calculate_spherical_ring_area_km2(exterior_coords)
        int_area = sum(
            calculate_spherical_ring_area_km2(list(hole.coords))
            for hole in geom.interiors  # type: ignore[attr-defined]
        )
        return max(0.0, ext_area - int_area)
    elif geom.geom_type == "MultiPolygon":
        return sum(calculate_polygon_area_km2(part) for part in geom.geoms)  # type: ignore[attr-defined]
    return 0.0


def check_antimeridian_crossing(aoi: Dict[str, Any]) -> bool:
    """Detect if an AOI's ring coordinates jump across the 180° antimeridian.

    GeoJSON coordinates crossing the 180th meridian require explicit splitting into a MultiPolygon.
    A single polygon whose longitude jumps > 180 degrees between consecutive points crosses the antimeridian.
    """
    geom_type = aoi.get("type")
    coords = aoi.get("coordinates", [])

    def inspect_ring(ring: List[Any]) -> bool:
        for i in range(len(ring) - 1):
            lon1, _ = ring[i][0], ring[i][1]
            lon2, _ = ring[i + 1][0], ring[i + 1][1]
            # If consecutive longitudes have opposite signs and absolute difference > 180
            if (lon1 * lon2 < 0) and abs(lon1 - lon2) > 180:
                return True
            # Also check if any longitude exceeds +/- 180
            if abs(lon1) > 180 or abs(lon2) > 180:
                return True
        return False

    if geom_type == "Polygon":
        for ring in coords:
            if inspect_ring(ring):
                return True
    elif geom_type == "MultiPolygon":
        for poly in coords:
            for ring in poly:
                if inspect_ring(ring):
                    return True

    return False


def validate_geometry(
    aoi: Dict[str, Any],
    max_km2: float = 2500.0,
    max_vertices: int = 5000,
) -> Tuple[BaseGeometry, float]:
    """Validate GeoJSON geometry per spec.md and systemdesign.md.

    Enforces:
    - Valid GeoJSON Polygon or MultiPolygon
    - WGS84 coordinate bounds (-180 <= lon <= 180, -90 <= lat <= 90)
    - Rejection of antimeridian crossing (UNSUPPORTEDGEOMETRY)
    - Valid topological polygon without self-intersections (INVALIDGEOMETRY)
    - Max vertices threshold (TOOMANYVERTICES)
    - Max area threshold in km² (AOITOOLARGE)
    """
    if not isinstance(aoi, dict) or "type" not in aoi or "coordinates" not in aoi:
        raise ValidationException(
            error_code="INVALIDGEOMETRY",
            message="AOI must be a valid GeoJSON object with 'type' and 'coordinates'.",
        )

    if aoi["type"] not in ["Polygon", "MultiPolygon"]:
        raise ValidationException(
            error_code="INVALIDGEOMETRY",
            message=f"Unsupported geometry type '{aoi['type']}'. Only Polygon and MultiPolygon are supported.",
        )

    # Check antimeridian crossing
    if check_antimeridian_crossing(aoi):
        raise ValidationException(
            error_code="UNSUPPORTEDGEOMETRY",
            message="Antimeridian-crossing AOIs are not supported in V1.",
            details={"issue": "Geometry crosses 180 meridian without standard split."},
        )

    # Verify WGS84 coordinate bounds
    def verify_bounds(coords: Any) -> None:
        if isinstance(coords, (list, tuple)):
            if (
                len(coords) >= 2
                and isinstance(coords[0], (int, float))
                and isinstance(coords[1], (int, float))
            ):
                lon, lat = coords[0], coords[1]
                if not (-180.0 <= lon <= 180.0 and -90.0 <= lat <= 90.0):
                    raise ValidationException(
                        error_code="INVALIDGEOMETRY",
                        message=f"Coordinates ({lon}, {lat}) exceed WGS84 bounds [-180..180, -90..90].",
                    )
            else:
                for sub in coords:
                    verify_bounds(sub)

    verify_bounds(aoi["coordinates"])

    try:
        geom = shape(aoi)
    except Exception as e:
        raise ValidationException(
            error_code="INVALIDGEOMETRY",
            message=f"Could not construct geometry from coordinates: {str(e)}",
        )

    if not geom.is_valid:
        reason = explain_validity(geom)
        raise ValidationException(
            error_code="INVALIDGEOMETRY",
            message=f"Geometry is invalid: {reason}",
            details={"validity_reason": reason},
        )

    if geom.is_empty:
        raise ValidationException(
            error_code="INVALIDGEOMETRY",
            message="Geometry is empty.",
        )

    # Enforce vertex count
    vertex_count = count_polygon_vertices(geom)
    if vertex_count > max_vertices:
        raise ValidationException(
            error_code="TOOMANYVERTICES",
            message=f"AOI geometry has {vertex_count} vertices, exceeding maximum limit of {max_vertices}.",
            details={"vertex_count": vertex_count, "maximum_vertices": max_vertices},
        )

    # Enforce area limit (geodesic spherical excess in km²)
    area_km2 = calculate_polygon_area_km2(geom)
    if area_km2 > max_km2:
        raise ValidationException(
            error_code="AOITOOLARGE",
            message=f"AOI area ({area_km2:.2f} km²) exceeds maximum allowed limit of {max_km2:.0f} km².",
            details={"area_km2": round(area_km2, 2), "maximum_area_km2": max_km2},
        )

    return geom, area_km2


def validate_date_windows(
    baseline: DateWindow,
    comparison: DateWindow,
    max_window_days: int = 180,
) -> List[str]:
    """Validate observation date windows per spec.md.

    Enforces:
    - start < end for both windows (start-inclusive, end-exclusive)
    - window duration <= 180 days
    - no overlap between baseline and comparison windows
    - warnings emitted on seasonal window mismatch (> 2 months difference in start months)
    """
    warnings: List[str] = []

    if baseline.start >= baseline.end:
        raise ValidationException(
            error_code="INVALIDDATERANGE",
            message=f"Baseline start date ({baseline.start}) must be strictly before end date ({baseline.end}).",
        )

    if comparison.start >= comparison.end:
        raise ValidationException(
            error_code="INVALIDDATERANGE",
            message=f"Comparison start date ({comparison.start}) must be strictly before end date ({comparison.end}).",
        )

    # Check 180-day max observation window
    baseline_days = (baseline.end - baseline.start).days
    if baseline_days > max_window_days:
        raise ValidationException(
            error_code="INVALIDDATERANGE",
            message=f"Baseline observation window ({baseline_days} days) exceeds maximum limit of {max_window_days} days.",
            details={"window_days": baseline_days, "maximum_window_days": max_window_days},
        )

    comparison_days = (comparison.end - comparison.start).days
    if comparison_days > max_window_days:
        raise ValidationException(
            error_code="INVALIDDATERANGE",
            message=f"Comparison observation window ({comparison_days} days) exceeds maximum limit of {max_window_days} days.",
            details={"window_days": comparison_days, "maximum_window_days": max_window_days},
        )

    # Reject overlapping windows in V1: start-inclusive, end-exclusive [s, e)
    # Two intervals [s1, e1) and [s2, e2) overlap if max(s1, s2) < min(e1, e2)
    latest_start = max(baseline.start, comparison.start)
    earliest_end = min(baseline.end, comparison.end)
    if latest_start < earliest_end:
        raise ValidationException(
            error_code="INVALIDDATERANGE",
            message="Baseline and comparison observation windows must not overlap in V1.",
            details={
                "baseline": {"start": str(baseline.start), "end": str(baseline.end)},
                "comparison": {"start": str(comparison.start), "end": str(comparison.end)},
            },
        )

    # Seasonal mismatch warning heuristic (> 2 month circular difference in start months)
    # Note: Flagged as product heuristic assumption pending formal ecological sign-off
    b_month = baseline.start.month
    c_month = comparison.start.month
    circular_month_diff = min(abs(b_month - c_month), 12 - abs(b_month - c_month))
    if circular_month_diff > 2:
        warnings.append(
            f"SEASONALWINDOWMISMATCH: Baseline start (month {b_month}) and comparison start (month {c_month}) "
            f"differ by {circular_month_diff} months, which may introduce phenological differences."
        )

    return warnings
