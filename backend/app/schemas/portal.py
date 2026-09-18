"""Response/request models for the Investigator portal (areas, hotspots, alerts, reports)."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    lat: float
    lon: float


# ---------------------------------------------------------------- areas
class AreaSummary(BaseModel):
    id: str
    slug: str
    name: str
    designation: Optional[str] = None
    iucn_category: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    state: Optional[str] = None
    biome: Optional[str] = None
    area_km2: float
    coordinates: Coordinates
    source: str
    statistics_computed_at: Optional[str] = None
    last_analyzed: Optional[str] = None
    latest_analysis_id: Optional[str] = None
    hotspot_count: int = 0
    health_index: Optional[Dict[str, Any]] = None


class AreaListResponse(BaseModel):
    items: List[AreaSummary]
    total: int


class AreaDetail(AreaSummary):
    analysis_aoi: Dict[str, Any]
    analysis_aoi_km2: float
    analysis_aoi_note: Optional[str] = None
    source_fetched_at: Optional[str] = None
    attribution: str = "© OpenStreetMap contributors"


class AreaStatistics(BaseModel):
    area_id: str
    area_name: str
    computed_at: Optional[str] = None
    source: Optional[str] = None
    scale_m: Optional[int] = None
    window: Optional[str] = None
    forest_cover_percent: Optional[float] = None
    water_bodies_ha: Optional[float] = None
    urban_builtup_ha: Optional[float] = None
    land_cover_distribution: Dict[str, float] = Field(default_factory=dict)
    last_cloud_free_pass: Optional[str] = None
    latest_analysis_id: Optional[str] = None
    vegetation_loss_candidate_ha: Optional[float] = None
    active_fires_count: Optional[int] = None
    health_index: Optional[Dict[str, Any]] = None
    unavailable: List[str] = Field(default_factory=list)


class TimelinePoint(BaseModel):
    date: str
    ndvi: Optional[float] = None
    baseline: Optional[float] = None
    water_cover_ha: Optional[float] = None


class TimelineResponse(BaseModel):
    area_id: str
    points: List[TimelinePoint]
    computed_at: Optional[str] = None
    source: Optional[str] = None
    scale_m: Optional[int] = None
    notes: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------- hotspots
class HotspotItem(BaseModel):
    id: str
    analysis_id: str
    area_id: Optional[str] = None
    area_name: Optional[str] = None
    layer_type: str
    change_type: str
    change_label: str
    detected_at: str
    affected_area_ha: float
    mean_ndvi_change: Optional[float] = None
    valid_pixel_fraction: Optional[float] = None
    quality_label: Optional[str] = None
    severity: str
    priority_score: Optional[float] = None
    priority_components: Optional[Dict[str, Optional[float]]] = None
    priority_method_version: Optional[str] = None
    status: str
    record_version: int
    method_version: str
    sensor: Optional[str] = None
    coordinates: Coordinates
    geometry: Optional[Dict[str, Any]] = None
    baseline_value: Optional[float] = None
    comparison_value: Optional[float] = None
    value_name: Optional[str] = None
    nearest_known_road_distance_m: Optional[float] = None
    nearest_known_settlement_distance_m: Optional[float] = None
    context_source: Optional[str] = None
    baseline_window: Optional[str] = None
    comparison_window: Optional[str] = None
    is_curated_demo: bool = False
    read_only: bool = False


class HotspotListResponse(BaseModel):
    items: List[HotspotItem]
    total: int
    limit: int
    offset: int


# ---------------------------------------------------------------- alerts
class AlertItem(BaseModel):
    id: str
    event_id: str
    analysis_id: str
    area_id: Optional[str] = None
    area_name: Optional[str] = None
    title: str
    message: str
    severity: str
    status: str
    triggered_at: str
    read_only: bool = False


class AlertListResponse(BaseModel):
    items: List[AlertItem]
    total: int
    unread_count: int


class AlertUpdateRequest(BaseModel):
    status: str = Field(..., description="unread | acknowledged | dismissed")


# ---------------------------------------------------------------- analyses list
class AnalysisListItem(BaseModel):
    analysis_id: str
    status: str
    stage: Optional[str] = None
    area_id: Optional[str] = None
    area_name: Optional[str] = None
    layers: List[Dict[str, Any]] = Field(default_factory=list)
    baseline: Dict[str, str]
    comparison: Dict[str, str]
    event_count: int = 0
    created_at: str
    updated_at: str
    is_curated_demo: bool = False


class AnalysisListResponse(BaseModel):
    items: List[AnalysisListItem]
    total: int
    limit: int
    offset: int


# ---------------------------------------------------------------- reports
class ReportCreateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    format: str = Field(default="csv", description="csv | geojson")
    area_id: Optional[str] = None
    analysis_id: Optional[str] = None


class ReportItem(BaseModel):
    id: str
    title: str
    format: str
    area_id: Optional[str] = None
    area_name: Optional[str] = None
    analysis_id: Optional[str] = None
    status: str
    byte_size: int
    event_count: int
    created_at: str
    error: Optional[str] = None


class ReportListResponse(BaseModel):
    items: List[ReportItem]
    total: int


class ReportDownloadResponse(BaseModel):
    url: str
    expires_at: str
    expires_in_seconds: int
    filename: str
    media_type: str
