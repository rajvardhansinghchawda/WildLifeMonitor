import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Index, String, desc
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class JobStatusEnum(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    PARTIAL = "partial"
    FAILED = "failed"
    CANCELREQUESTED = "cancelrequested"
    CANCELLED = "cancelled"


class LayerStatusEnum(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    READY = "ready"
    INSUFFICIENTDATA = "insufficientdata"
    UNSUPPORTED = "unsupported"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Analysis(Base):
    __tablename__ = "analyses"
    __table_args__ = (
        Index("analyses_workspace_created_idx", "workspace_id", desc("created_at"), desc("id")),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Optional link to the protected-area catalog entry this analysis was run for
    area_id = Column(
        UUID(as_uuid=True),
        ForeignKey("protected_areas.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Inputs snapshot — immutable per systemdesign.md
    aoi_snapshot = Column(JSONB, nullable=False)
    baseline_start = Column(Date, nullable=False)
    baseline_end = Column(Date, nullable=False)
    comparison_start = Column(Date, nullable=False)
    comparison_end = Column(Date, nullable=False)
    requested_layers = Column(JSONB, nullable=False)
    configuration_id = Column(String(100), nullable=False)

    # Job lifecycle state machine
    status = Column(String(50), nullable=False, default=JobStatusEnum.QUEUED.value, index=True)
    stage = Column(String(100), nullable=True)
    cancel_requested = Column(Boolean, nullable=False, default=False)
    idempotency_key = Column(String(255), nullable=True, index=True)

    created_by = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    workspace = relationship("Workspace", back_populates="analyses")
    layers = relationship(
        "AnalysisLayer",
        back_populates="analysis",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    job_attempts = relationship(
        "JobAttempt",
        back_populates="analysis",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    events = relationship("ChangeEvent", back_populates="analysis", cascade="all, delete-orphan")
    artifacts = relationship("Artifact", back_populates="analysis", cascade="all, delete-orphan")


class AnalysisLayer(Base):
    __tablename__ = "analysis_layers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analyses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    layer_type = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default=LayerStatusEnum.PENDING.value)

    quality_label = Column(String(50), nullable=True)
    metrics = Column(JSONB, nullable=True)
    warnings = Column(JSONB, nullable=True)
    provenance = Column(JSONB, nullable=True)

    # Classified error fields per backendhandoverfile.md Layer-result contract
    error_code = Column(String(100), nullable=True)
    error_details = Column(JSONB, nullable=True)

    method_version = Column(String(50), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    analysis = relationship("Analysis", back_populates="layers")
