from datetime import date

import pytest

from app.core.exceptions import ValidationException
from app.schemas.analysis import DateWindow
from app.services.analysis_validation import (
    validate_date_windows,
    validate_geometry,
)


def test_valid_geometry_validation():
    valid_aoi = {
        "type": "Polygon",
        "coordinates": [
            [
                [79.20, 21.60],
                [79.30, 21.60],
                [79.30, 21.70],
                [79.20, 21.70],
                [79.20, 21.60],
            ]
        ],
    }
    geom, area_km2 = validate_geometry(valid_aoi, max_km2=2500, max_vertices=5000)
    assert geom.is_valid
    assert 10.0 < area_km2 < 200.0


def test_self_intersecting_geometry_rejected():
    # Bow-tie self-intersecting polygon
    invalid_aoi = {
        "type": "Polygon",
        "coordinates": [
            [
                [0.0, 0.0],
                [1.0, 1.0],
                [0.0, 1.0],
                [1.0, 0.0],
                [0.0, 0.0],
            ]
        ],
    }
    with pytest.raises(ValidationException) as exc_info:
        validate_geometry(invalid_aoi)
    assert exc_info.value.error_code == "INVALIDGEOMETRY"


def test_wgs84_bounds_exceeded():
    out_of_bounds_aoi = {
        "type": "Polygon",
        "coordinates": [
            [
                [195.0, 20.0],
                [196.0, 20.0],
                [196.0, 21.0],
                [195.0, 21.0],
                [195.0, 20.0],
            ]
        ],
    }
    with pytest.raises(ValidationException) as exc_info:
        validate_geometry(out_of_bounds_aoi)
    assert exc_info.value.error_code in ["INVALIDGEOMETRY", "UNSUPPORTEDGEOMETRY"]


def test_antimeridian_crossing_rejected():
    antimeridian_aoi = {
        "type": "Polygon",
        "coordinates": [
            [
                [179.0, 10.0],
                [-179.0, 10.0],
                [-179.0, 11.0],
                [179.0, 11.0],
                [179.0, 10.0],
            ]
        ],
    }
    with pytest.raises(ValidationException) as exc_info:
        validate_geometry(antimeridian_aoi)
    assert exc_info.value.error_code == "UNSUPPORTEDGEOMETRY"


def test_oversized_aoi_rejected():
    # Large bounding polygon over 2500 km² (~5 degrees x 5 degrees is ~300,000 km²)
    oversized_aoi = {
        "type": "Polygon",
        "coordinates": [
            [
                [75.0, 15.0],
                [80.0, 15.0],
                [80.0, 20.0],
                [75.0, 20.0],
                [75.0, 15.0],
            ]
        ],
    }
    with pytest.raises(ValidationException) as exc_info:
        validate_geometry(oversized_aoi, max_km2=2500)
    assert exc_info.value.error_code == "AOITOOLARGE"
    assert "area_km2" in exc_info.value.details


def test_vertex_count_limit_exceeded():
    # Build polygon with more vertices than max_vertices
    max_v = 10
    coords = [[0.0 + (i * 0.001), 0.0] for i in range(max_v + 5)]
    coords.append([0.0, 0.01])
    coords.append([0.0, 0.0])
    polygon = {"type": "Polygon", "coordinates": [coords]}

    with pytest.raises(ValidationException) as exc_info:
        validate_geometry(polygon, max_vertices=max_v)
    assert exc_info.value.error_code == "TOOMANYVERTICES"


def test_date_windows_valid():
    baseline = DateWindow(start=date(2024, 1, 1), end=date(2024, 3, 1))
    comparison = DateWindow(start=date(2025, 1, 1), end=date(2025, 3, 1))
    warnings = validate_date_windows(baseline, comparison, max_window_days=180)
    assert warnings == []


def test_date_windows_inverted():
    baseline = DateWindow(start=date(2024, 3, 1), end=date(2024, 1, 1))
    comparison = DateWindow(start=date(2025, 1, 1), end=date(2025, 3, 1))
    with pytest.raises(ValidationException) as exc_info:
        validate_date_windows(baseline, comparison)
    assert exc_info.value.error_code == "INVALIDDATERANGE"


def test_date_windows_overlap_rejected():
    baseline = DateWindow(start=date(2024, 1, 1), end=date(2024, 5, 1))
    comparison = DateWindow(start=date(2024, 4, 1), end=date(2024, 8, 1))
    with pytest.raises(ValidationException) as exc_info:
        validate_date_windows(baseline, comparison)
    assert exc_info.value.error_code == "INVALIDDATERANGE"


def test_date_window_exceeds_180_days():
    baseline = DateWindow(start=date(2024, 1, 1), end=date(2024, 8, 1))  # 213 days
    comparison = DateWindow(start=date(2025, 1, 1), end=date(2025, 3, 1))
    with pytest.raises(ValidationException) as exc_info:
        validate_date_windows(baseline, comparison, max_window_days=180)
    assert exc_info.value.error_code == "INVALIDDATERANGE"


def test_seasonal_mismatch_warning():
    baseline = DateWindow(start=date(2024, 1, 1), end=date(2024, 3, 1))  # January
    comparison = DateWindow(start=date(2025, 6, 1), end=date(2025, 8, 1))  # June (5 months diff)
    warnings = validate_date_windows(baseline, comparison, max_window_days=180)
    assert len(warnings) == 1
    assert "SEASONALWINDOWMISMATCH" in warnings[0]
