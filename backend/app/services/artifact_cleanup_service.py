import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis, JobStatusEnum
from app.models.artifact import Artifact
from app.services.artifact_service import ArtifactService

logger = logging.getLogger(__name__)


class ArtifactCleanupService:
    """Service cleaning up abandoned attempt artifacts while preserving published outputs.

    Contract (Phase 6):
    - Deletes abandoned (failed or cancelled attempts older than grace period) artifacts.
    - NEVER deletes published artifacts associated with completed/succeeded analyses before
      workspace retention policy permits.
    """

    DEFAULT_GRACE_PERIOD_HOURS = 24

    def __init__(self, artifact_service: Optional[ArtifactService] = None):
        self.artifact_service = artifact_service or ArtifactService()

    async def cleanup_abandoned_artifacts(
        self,
        session: AsyncSession,
        grace_period_hours: int = DEFAULT_GRACE_PERIOD_HOURS,
    ) -> Dict[str, int]:
        """Identify and delete abandoned attempt artifacts in object storage and database."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=grace_period_hours)

        # 1. Query artifacts whose job_attempt or parent analysis is failed/cancelled and older than cutoff
        query = (
            select(Artifact)
            .join(Analysis, Artifact.analysis_id == Analysis.id)
            .where(
                Analysis.status.in_([JobStatusEnum.FAILED.value, JobStatusEnum.CANCELLED.value]),
                Artifact.created_at < cutoff,
            )
        )
        res = await session.execute(query)
        candidates = list(res.scalars().all())

        deleted_count = 0
        s3_client = self.artifact_service._get_s3_client()

        for art in candidates:
            # Delete from S3/MinIO
            try:
                from app.core.config import settings

                s3_client.delete_object(
                    Bucket=settings.OBJECT_STORAGE_BUCKET,
                    Key=art.object_key,
                )
            except Exception as e:
                logger.warning(
                    "Could not delete S3 object %s during cleanup: %s", art.object_key, str(e)
                )

            # Delete from DB
            await session.delete(art)
            deleted_count += 1

        await session.commit()
        logger.info(
            "Cleaned up %d abandoned artifacts older than %d hours",
            deleted_count,
            grace_period_hours,
        )
        return {"deleted_artifacts": deleted_count}
