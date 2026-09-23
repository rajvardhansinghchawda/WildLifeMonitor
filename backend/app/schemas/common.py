from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable explanation")
    details: Dict[str, Any] = Field(default_factory=dict, description="Structured error context")
    request_id: Optional[str] = Field(None, description="Request correlation identifier")
    retryable: bool = Field(default=False, description="Whether client should attempt retry")


class ErrorEnvelope(BaseModel):
    error: ErrorDetail
