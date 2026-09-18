from typing import List

from pydantic import BaseModel, Field


class SystemLimits(BaseModel):
    maximum_aoi_km2: float = Field(..., description="Maximum allowed AOI area in square kilometers")
    maximum_geometry_vertices: int = Field(
        ..., description="Maximum allowed vertices in AOI polygon"
    )
    maximum_observation_window_days: int = Field(
        default=180, description="Maximum observation window in days"
    )
    maximum_active_jobs_per_workspace: int = Field(
        default=2, description="Maximum concurrent active jobs per workspace"
    )
    default_event_page_size: int = Field(
        default=50, description="Default page size for event pagination"
    )
    maximum_event_page_size: int = Field(
        default=100, description="Maximum allowed page size for event pagination"
    )


class CapabilitiesResponse(BaseModel):
    enabled_methods: List[str] = Field(
        ..., description="List of currently active change detection methods"
    )
    limits: SystemLimits = Field(
        ..., description="Deployment configured scientific and operational limits"
    )
