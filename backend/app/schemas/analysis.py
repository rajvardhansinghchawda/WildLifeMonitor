import uuid
from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator


class DateWindow(BaseModel):
    start: date = Field(..., description="Start date (inclusive)")
    end: date = Field(..., description="End date (exclusive)")


class AnalysisCreateRequest(BaseModel):
    aoi: Optional[Dict[str, Any]] = Field(
        default=None,
        description="GeoJSON geometry representing Study AOI (omit when area_id is given)",
    )
    area_id: Optional[uuid.UUID] = Field(
        default=None, description="Protected-area catalog id; its analysis AOI is used if aoi is omitted"
    )
    baseline: DateWindow = Field(..., description="Baseline observation window")
    comparison: DateWindow = Field(..., description="Comparison observation window")
    layers: List[str] = Field(default=["vegetation"], description="Requested change layers")
    configuration_id: str = Field(default="mvp-v1", description="Configuration identifier")

    @model_validator(mode="after")
    def require_aoi_or_area(self) -> "AnalysisCreateRequest":
        if self.aoi is None and self.area_id is None:
            raise ValueError("Provide either 'aoi' (GeoJSON) or 'area_id'.")
        return self


class AnalysisCreateResponse(BaseModel):
    analysis_id: str = Field(..., description="Unique analysis identifier")
    status: str = Field(..., description="Initial job status (queued)")
    created_at: str = Field(..., description="ISO UTC timestamp of creation")
    status_url: str = Field(..., description="URL to poll job status")
    results_url: str = Field(..., description="URL to retrieve results manifest upon completion")


class LayerStatusItem(BaseModel):
    layer_id: str
    type: str
    status: str
    error_code: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None


class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    status: str
    stage: Optional[str] = None
    completed_layers: int = 0
    total_layers: int = 0
    layers: List[LayerStatusItem] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    updated_at: str


class ResultManifestResponse(BaseModel):
    analysis_id: str
    status: str
    configuration_id: str
    input_snapshot: Optional[Dict[str, Any]] = None
    layers: List[Dict[str, Any]] = Field(default_factory=list)
    provenance: Dict[str, Any] = Field(default_factory=dict)
    warnings: List[Dict[str, Any]] = Field(default_factory=list)
    attribution: Dict[str, str] = Field(default_factory=dict)
    event_count: int = 0
    events_url: Optional[str] = None
