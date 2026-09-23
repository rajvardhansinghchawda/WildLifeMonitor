import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class Report(Base):
    """A generated export (CSV / GeoJSON) of real change events, stored in object storage."""

    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    format = Column(String(20), nullable=False)
    area_id = Column(
        UUID(as_uuid=True),
        ForeignKey("protected_areas.id", ondelete="SET NULL"),
        nullable=True,
    )
    analysis_id = Column(
        UUID(as_uuid=True), ForeignKey("analyses.id", ondelete="SET NULL"), nullable=True
    )
    status = Column(String(20), nullable=False, default="ready")
    object_key = Column(String(1024), nullable=True)
    byte_size = Column(BigInteger, nullable=False, default=0)
    event_count = Column(BigInteger, nullable=False, default=0)
    error = Column(Text, nullable=True)
    created_by = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
