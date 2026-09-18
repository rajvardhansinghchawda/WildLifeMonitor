import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base


class Outbox(Base):
    __tablename__ = "outbox"
    __table_args__ = (Index("outbox_published_created_idx", "published_at", "created_at"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic = Column(String(100), nullable=False, index=True)
    message = Column(JSONB, nullable=False)
    status = Column(String(50), nullable=False, default="pending", index=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Key field from systemdesign.md: "Message, published timestamp"
    # Nullable published_at allows fast indexed query WHERE published_at IS NULL
    published_at = Column(DateTime(timezone=True), nullable=True, index=True)
