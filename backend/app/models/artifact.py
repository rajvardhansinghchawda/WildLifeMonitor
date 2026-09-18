import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Artifact(Base):
    __tablename__ = "artifacts"

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
    attempt_id = Column(
        UUID(as_uuid=True), ForeignKey("job_attempts.id", ondelete="SET NULL"), nullable=True
    )
    layer_id = Column(
        UUID(as_uuid=True), ForeignKey("analysis_layers.id", ondelete="SET NULL"), nullable=True
    )

    object_key = Column(String(1024), nullable=False, unique=True)
    checksum_sha256 = Column(String(64), nullable=False)
    media_type = Column(String(100), nullable=False)
    byte_size = Column(BigInteger, nullable=False, default=0)
    artifact_metadata = Column("metadata", JSONB, nullable=False, default=dict)

    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    analysis = relationship("Analysis", back_populates="artifacts")
