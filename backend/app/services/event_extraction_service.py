import logging
import uuid
from typing import Any, Dict, List, Optional

from geoalchemy2.shape import from_shape
from shapely.geometry import shape
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import ChangeEvent, VerificationStatusEnum

logger = logging.getLogger(__name__)


class EventExtractionService:
    """Service converting analyzed layer components into durable, idempotent ChangeEvent records."""

    async def persist_events_idempotent(
        self,
        session: AsyncSession,
        workspace_id: uuid.UUID,
        analysis_id: uuid.UUID,
        layer_id: Optional[uuid.UUID],
        raw_events: List[Dict[str, Any]],
        method_version: str = "vegetation-v1",
    ) -> List[ChangeEvent]:
        """Persist change event records with attempt-scoped idempotency.

        Guarantees:
        - Worker retries will not duplicate published events.
        - Existing unverified candidate events for the same analysis and method are cleanly replaced.
        """
        # 1. Clean up any existing unverified candidate events for this analysis and method
        # This guarantees idempotency on worker retries
        await session.execute(
            delete(ChangeEvent).where(
                ChangeEvent.analysis_id == analysis_id,
                ChangeEvent.method_version == method_version,
                ChangeEvent.status == VerificationStatusEnum.PENDINGFIELDVERIFICATION.value,
            )
        )

        persisted_events: List[ChangeEvent] = []
        for raw in raw_events:
            geom_dict = raw["geometry"]
            shapely_geom = shape(geom_dict)
            wkb_geom = from_shape(shapely_geom, srid=4326)

            event = ChangeEvent(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                analysis_id=analysis_id,
                layer_id=layer_id,
                geom=wkb_geom,
                change_type=raw.get("changetype", "vegetationlosscandidate"),
                affected_area_ha=float(raw.get("affectedareaha", 0.0)),
                mean_ndvi_change=raw.get("meanndvichange"),
                valid_pixel_fraction=raw.get("validpixelfraction"),
                quality_label=raw.get("qualitylabel", "usable"),
                source_confidence=raw.get("sourceconfidence"),
                priority_score=raw.get("priorityscore"),
                priority_method_version=raw.get("prioritymethodversion"),
                status=raw.get("status", VerificationStatusEnum.PENDINGFIELDVERIFICATION.value),
                method_version=method_version,
                record_version=1,
            )
            session.add(event)
            persisted_events.append(event)

        await session.flush()
        logger.info(
            "Persisted %d idempotent ChangeEvents for analysis %s (method=%s)",
            len(persisted_events),
            analysis_id,
            method_version,
        )
        return persisted_events

    async def count_events_for_analysis(
        self,
        session: AsyncSession,
        analysis_id: uuid.UUID,
    ) -> int:
        query = select(ChangeEvent).where(ChangeEvent.analysis_id == analysis_id)
        result = await session.execute(query)
        return len(result.scalars().all())
