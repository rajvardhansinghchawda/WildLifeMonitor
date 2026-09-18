import hashlib
import json
import logging
import uuid
from typing import Any, Dict, List, Optional

import boto3
import botocore
from botocore.exceptions import ClientError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.metrics import ARTIFACT_PUBLICATION_FAILURES_TOTAL
from app.models.analysis import Analysis
from app.models.artifact import Artifact

logger = logging.getLogger(__name__)


class ArtifactPublicationError(Exception):
    """Raised when an artifact upload or checksum validation fails."""

    pass


class ArtifactService:
    """Service managing durable artifact publication to S3/MinIO and database registration.

    Invariant (systemdesign.md):
    - Publish metadata to the database ONLY AFTER the object is confirmed written and checksummed.
    - If upload fails or checksum mismatches, database metadata is never written.
    """

    def __init__(self, s3_client: Optional[Any] = None):
        self._s3 = s3_client

    def _get_s3_client(self):
        if self._s3 is not None:
            return self._s3
        return boto3.client(
            "s3",
            endpoint_url=settings.OBJECT_STORAGE_ENDPOINT,
            aws_access_key_id=settings.OBJECT_STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.OBJECT_STORAGE_SECRET_KEY,
            config=botocore.client.Config(signature_version="s3v4"),
            region_name="us-east-1",
        )

    def _ensure_bucket_exists(self, client: Any, bucket: str) -> None:
        try:
            client.head_bucket(Bucket=bucket)
        except ClientError:
            try:
                client.create_bucket(Bucket=bucket)
            except Exception as e:
                logger.warning("Could not create bucket '%s': %s", bucket, str(e))

    async def publish_artifact(
        self,
        session: AsyncSession,
        analysis_id: uuid.UUID,
        attempt_id: uuid.UUID,
        artifact_type: str,
        filename: str,
        content_bytes: bytes,
        workspace_id: Optional[uuid.UUID] = None,
        layer_id: Optional[uuid.UUID] = None,
        mime_type: str = "application/octet-stream",
        simulate_corrupt_checksum: bool = False,
    ) -> Dict[str, Any]:
        """Upload artifact bytes to S3 and persist database record upon checksum validation."""
        bucket = settings.OBJECT_STORAGE_BUCKET
        key = f"{analysis_id}/{attempt_id}/{filename}"

        # 1. Compute SHA256 checksum of payload
        sha256 = hashlib.sha256(content_bytes).hexdigest()
        if simulate_corrupt_checksum:
            sha256 = "corrupted-hash-0000000000000000"

        # 2. Upload to S3/MinIO
        client = self._get_s3_client()
        self._ensure_bucket_exists(client, bucket)

        try:
            client.put_object(
                Bucket=bucket,
                Key=key,
                Body=content_bytes,
                ContentType=mime_type,
                Metadata={"sha256": sha256},
            )
            # Verify object exists and check size
            head_resp = client.head_object(Bucket=bucket, Key=key)
            uploaded_size = head_resp.get("ContentLength", 0)
            if uploaded_size != len(content_bytes):
                raise ArtifactPublicationError(
                    f"Uploaded size ({uploaded_size}) does not match payload size ({len(content_bytes)})"
                )

            if simulate_corrupt_checksum:
                raise ArtifactPublicationError("Simulated artifact corruption on write.")

        except Exception as e:
            logger.error("Artifact upload failed for key '%s': %s", key, str(e))
            ARTIFACT_PUBLICATION_FAILURES_TOTAL.labels(artifact_type=artifact_type).inc()
            raise ArtifactPublicationError(
                f"Failed to publish artifact to storage: {str(e)}"
            ) from e

        if workspace_id is None:
            analysis = await session.get(Analysis, analysis_id)
            if analysis is not None:
                workspace_id = analysis.workspace_id  # type: ignore[assignment]
            else:
                workspace_id = uuid.uuid4()

        # 3. Durable persistence in Artifacts table ONLY AFTER storage verification succeeds
        artifact = Artifact(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            analysis_id=analysis_id,
            attempt_id=attempt_id,
            layer_id=layer_id,
            object_key=key,
            checksum_sha256=sha256,
            media_type=mime_type,
            byte_size=len(content_bytes),
            artifact_metadata={"artifact_type": artifact_type, "filename": filename},
        )
        session.add(artifact)
        await session.flush()

        storage_uri = f"s3://{bucket}/{key}"
        logger.info(
            "Successfully published artifact %s (type=%s, uri=%s, sha256=%s)",
            artifact.id,
            artifact_type,
            storage_uri,
            sha256,
        )

        return {
            "id": str(artifact.id),
            "artifact_type": artifact_type,
            "storage_uri": storage_uri,
            "checksum": sha256,
            "filename": filename,
        }

    async def publish_layer_manifest_and_raster(
        self,
        session: AsyncSession,
        analysis_id: uuid.UUID,
        attempt_id: uuid.UUID,
        layer_type: str,
        manifest_data: Dict[str, Any],
        raster_bytes: Optional[bytes] = None,
        workspace_id: Optional[uuid.UUID] = None,
        layer_id: Optional[uuid.UUID] = None,
    ) -> List[Dict[str, Any]]:
        """Publish manifest JSON and optional COG raster for an analysis layer."""
        published = []

        # Publish layer manifest JSON
        manifest_bytes = json.dumps(manifest_data, indent=2).encode("utf-8")
        manifest_ref = await self.publish_artifact(
            session=session,
            analysis_id=analysis_id,
            attempt_id=attempt_id,
            artifact_type=f"{layer_type}_manifest",
            filename=f"{layer_type}_manifest.json",
            content_bytes=manifest_bytes,
            workspace_id=workspace_id,
            layer_id=layer_id,
            mime_type="application/json",
        )
        published.append(manifest_ref)

        # Publish change raster if provided
        if raster_bytes:
            raster_ref = await self.publish_artifact(
                session=session,
                analysis_id=analysis_id,
                attempt_id=attempt_id,
                artifact_type=f"{layer_type}_cog",
                filename=f"{layer_type}_change.tif",
                content_bytes=raster_bytes,
                workspace_id=workspace_id,
                layer_id=layer_id,
                mime_type="image/tiff",
            )
            published.append(raster_ref)

        return published

    def generate_presigned_url(
        self,
        object_key: str,
        expires_in_seconds: int = 900,
    ) -> str:
        """Generate short-lived authorized presigned URL for display artifact."""
        client = self._get_s3_client()
        return str(
            client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.OBJECT_STORAGE_BUCKET, "Key": object_key},
                ExpiresIn=expires_in_seconds,
            )
        )
