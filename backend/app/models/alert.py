import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text, desc
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class AlertStatusEnum(str, Enum):
    UNREAD = "unread"
    ACKNOWLEDGED = "acknowledged"
    DISMISSED = "dismissed"


class SeverityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Alert(Base):
    """Notification derived from a persisted ChangeEvent (never authored by hand)."""

    __tablename__ = "alerts"
    __table_args__ = (Index("alerts_workspace_triggered_idx", "workspace_id", desc("triggered_at")),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("change_events.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    analysis_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analyses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    area_id = Column(
        UUID(as_uuid=True),
        ForeignKey("protected_areas.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, default=AlertStatusEnum.UNREAD.value, index=True)
    triggered_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
