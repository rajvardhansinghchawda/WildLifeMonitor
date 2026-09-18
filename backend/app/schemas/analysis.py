from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DateWindow(BaseModel):
    start: date = Field(..., description="Start date (inclusive)")
    end: date = Field(..., description="End date (exclusive)")


class AnalysisCreateRequest(BaseModel):
    aoi: Dict[str, Any] = Field(..., description="GeoJSON geometry representing Study AOI")
    baseline: DateWindow = Field(..., description="Baseline observation window")
    comparison: DateWindow = Field(..., description="Comparison observation window")
    layers: List[str] = Field(default=["vegetation"], description="Requested change layers")
    configuration_id: str = Field(default="mvp-v1", description="Configuration identifier")


class AnalysisCreateResponse(BaseModel):
    analysis_id: str = Field(..., description="Unique analysis identifier")
    status: str = Field(..., description="Initial job status (queued)")
    created_at: str = Field(..., description="ISO UTC timestamp of creation")
    status_url: str = Field(..., description="URL to poll job status")
    results_url: str = Field(..., description="URL to retrieve results manifest upon completion")


class LayerStatusItem(BaseModel):
    type: str
    status: str


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
    layers: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[Dict[str, Any]] = Field(default_factory=list)
    attribution: Dict[str, str] = Field(default_factory=dict)
    event_count: int = 0
    events_url: Optional[str] = None
