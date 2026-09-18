from typing import Dict

from pydantic import BaseModel, Field


class HealthLiveResponse(BaseModel):
    status: str = Field(default="ok", description="Process liveness status")


class HealthReadyResponse(BaseModel):
    status: str = Field(..., description="Overall readiness status ('ok' or 'unhealthy')")
    dependencies: Dict[str, str] = Field(..., description="Status of core dependencies")
