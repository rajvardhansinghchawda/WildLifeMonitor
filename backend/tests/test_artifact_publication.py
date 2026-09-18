import hashlib
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.artifact import Artifact
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.job_attempt_repository import JobAttemptRepository
from app.services.artifact_service import ArtifactPublicationError, ArtifactService


@pytest.mark.asyncio
async def test_artifact_upload_and_sha256_verification(
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
):
    analysis_repo = AnalysisRepository()
    attempt_repo = JobAttemptRepository()
    analysis, _ = await analysis_repo.create_analysis_with_layers_and_outbox(
        session=db_session,
        workspace_id=test_workspace,
        created_by="test-user",
        aoi_snapshot={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        baseline_start=datetime.now(timezone.utc).date(),
        baseline_end=datetime.now(timezone.utc).date(),
        comparison_start=datetime.now(timezone.utc).date(),
        comparison_end=datetime.now(timezone.utc).date(),
        requested_layers=["vegetation"],
        configuration_id="mvp-v1",
    )
    attempt = await attempt_repo.create_attempt(
        session=db_session,
        analysis_id=analysis.id,
        worker_id="test-worker",
    )
    await db_session.commit()

    analysis_id = analysis.id
    attempt_id = attempt.id
    content = b"TEST-RASTER-BYTES-FOR-MINIO-VERIFICATION"
    expected_sha256 = hashlib.sha256(content).hexdigest()

    service = ArtifactService()
    ref = await service.publish_artifact(
        session=db_session,
        analysis_id=analysis_id,
        attempt_id=attempt_id,
        workspace_id=test_workspace,
        artifact_type="vegetation_cog",
        filename="vegetation_change.tif",
        content_bytes=content,
        mime_type="image/tiff",
    )
    await db_session.commit()

    assert ref["checksum"] == expected_sha256
    assert "s3://" in ref["storage_uri"]

    # Verify database persistence
    stmt = select(Artifact).where(Artifact.id == uuid.UUID(ref["id"]))
    res = await db_session.execute(stmt)
    art_row = res.scalar_one_or_none()
    assert art_row is not None
    assert art_row.checksum == expected_sha256
    assert art_row.artifact_type == "vegetation_cog"


@pytest.mark.asyncio
async def test_corrupted_artifact_write_rejected(
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
):
    analysis_id = uuid.uuid4()
    attempt_id = uuid.uuid4()
    content = b"CORRUPTED-PAYLOAD-SIMULATION"

    service = ArtifactService()
    with pytest.raises(ArtifactPublicationError):
        await service.publish_artifact(
            session=db_session,
            analysis_id=analysis_id,
            attempt_id=attempt_id,
            artifact_type="vegetation_cog",
            filename="corrupted.tif",
            content_bytes=content,
            simulate_corrupt_checksum=True,
        )

    # Invariant: Failed upload must not persist metadata to database
    stmt = select(Artifact).where(Artifact.analysis_id == analysis_id)
    res = await db_session.execute(stmt)
    assert len(res.scalars().all()) == 0
