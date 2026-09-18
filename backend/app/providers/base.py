import uuid
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Dict, List, Optional, Protocol


@dataclass
class AnalysisRequestData:
    aoi: Dict[str, Any]
    baseline_start: date
    baseline_end: date
    comparison_start: date
    comparison_end: date
    layers: List[str]
    configuration_id: str


@dataclass
class AnalysisContext:
    analysis_id: uuid.UUID
    attempt_id: uuid.UUID
    workspace_id: uuid.UUID
    aoi: Dict[str, Any]
    baseline_start: date
    baseline_end: date
    comparison_start: date
    comparison_end: date
    configuration_id: str


@dataclass
class CapabilityResult:
    supported: bool
    reason: Optional[str] = None
    limits: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LayerResult:
    """Standardized Layer Result contract per backendhandoverfile.md.

    Contains:
    - Status and optional classified error.
    - Metrics with explicit units.
    - Quality including valid coverage.
    - Artifact references rather than embedded large payloads.
    - Events or an event-extraction artifact.
    - Provenance and source attribution.
    - Warnings and method version.
    """

    status: str
    method_version: str
    quality_label: Optional[str] = None
    metrics: Dict[str, Any] = field(default_factory=dict)
    error_code: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None
    artifacts: List[Dict[str, Any]] = field(default_factory=list)
    # Binary outputs to publish (real rasters / overlays): each item is
    # {role, filename, content(bytes), media_type, metadata{bounds, legend, ...}}
    payloads: List[Dict[str, Any]] = field(default_factory=list)
    events: List[Dict[str, Any]] = field(default_factory=list)
    provenance: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


class ChangeProvider(Protocol):
    """Authoritative provider interface per backendhandoverfile.md."""

    async def check_capability(
        self,
        request: AnalysisRequestData,
    ) -> CapabilityResult: ...

    async def analyze(
        self,
        context: AnalysisContext,
    ) -> LayerResult: ...
