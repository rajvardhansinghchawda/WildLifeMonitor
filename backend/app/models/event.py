import uuid
from datetime import datetime, timezone
from enum import Enum

from geoalchemy2 import Geometry
from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, String, desc
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class VerificationStatusEnum(str, Enum):
    PENDINGFIELDVERIFICATION = "pendingfieldverification"
    INVESTIGATING = "investigating"
    VERIFIEDCHANGE = "verifiedchange"
    DISMISSED = "dismissed"
    INCONCLUSIVE = "inconclusive"


class ChangeEvent(Base):
    __tablename__ = "change_events"
    __table_args__ = (
        Index("events_geom_gist_idx", "geom", postgresql_using="gist"),
        Index("events_workspace_analysis_idx", "workspace_id", "analysis_id"),
        Index("events_priority_idx", "workspace_id", "analysis_id", desc("priority_score"), "id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    analysis_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analyses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    layer_id = Column(
        UUID(as_uuid=True), ForeignKey("analysis_layers.id", ondelete="SET NULL"), nullable=True
    )

    geom = Column(Geometry(geometry_type="POLYGON", srid=4326), nullable=False)
    change_type = Column(String(100), nullable=False)
    affected_area_ha = Column(Float, nullable=False)
    mean_ndvi_change = Column(Float, nullable=True)
    valid_pixel_fraction = Column(Float, nullable=True)
    quality_label = Column(String(50), nullable=True)
    source_confidence = Column(String(50), nullable=True)

    priority_score = Column(Float, nullable=True)
    priority_method_version = Column(String(50), nullable=True)

    # Extra real, method-specific values (baseline/comparison means, layer type, sensor, ...)
    properties = Column(JSONB, nullable=True)

    nearest_known_road_distance_m = Column(Float, nullable=True)
    nearest_known_settlement_distance_m = Column(Float, nullable=True)
    context_source = Column(String(100), nullable=True)

    status = Column(
        String(50), nullable=False, default=VerificationStatusEnum.PENDINGFIELDVERIFICATION.value
    )
    method_version = Column(String(50), nullable=False)
    record_version = Column(Integer, nullable=False, default=1)

    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    analysis = relationship("Analysis", back_populates="events")
    verifications = relationship(
        "Verification", back_populates="event", cascade="all, delete-orphan"
    )
