from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class EventVerificationUpdateRequest(BaseModel):
    status: str = Field(
        ...,
        description="Target status: pendingfieldverification, investigating, verifiedchange, dismissed, inconclusive",
    )
    expected_record_version: int = Field(
        ..., description="Expected record version for optimistic locking"
    )
    notes: Optional[str] = Field(
        None, description="Investigator notes (mandatory for dismissed/inconclusive)"
    )


class EventProperties(BaseModel):
    analysis_id: str
    change_type: str
    affected_area_ha: float
    mean_ndvi_change: Optional[float] = None
    valid_pixel_fraction: Optional[float] = None
    quality_label: Optional[str] = None
    source_confidence: Optional[str] = None
    priority_score: Optional[float] = None
    priority_method_version: Optional[str] = None
    status: str
    method_version: str
    record_version: int


class EventDetailResponse(BaseModel):
    type: str = "Feature"
    id: str
    geometry: Dict[str, Any]
    properties: EventProperties
