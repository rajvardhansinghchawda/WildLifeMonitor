import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.labels import change_type_label
from app.models.alert import Alert, AlertStatusEnum
from app.models.analysis import Analysis
from app.models.area import ProtectedArea
from app.models.event import ChangeEvent
from app.services.priority_service import compute_magnitude, severity_band

logger = logging.getLogger(__name__)

# Alerts are raised for events at or above this severity band
ALERT_MIN_SEVERITIES = {"medium", "high", "critical"}


def event_severity(event: ChangeEvent) -> str:
    return severity_band(
        compute_magnitude(float(event.affected_area_ha), event.mean_ndvi_change)  # type: ignore[arg-type]
    )


class AlertService:
    """Creates alerts from persisted ChangeEvents. Idempotent per event."""

    async def create_alerts_for_analysis(self, session: AsyncSession, analysis_id: uuid.UUID) -> int:
        analysis = await session.get(Analysis, analysis_id)
        if analysis is None:
            return 0
        area_name: Optional[str] = None
        if analysis.area_id is not None:
            area = await session.get(ProtectedArea, analysis.area_id)
            area_name = str(area.name) if area else None

        events = (
            (
                await session.execute(
                    select(ChangeEvent).where(ChangeEvent.analysis_id == analysis_id)
                )
            )
            .scalars()
            .all()
        )
        existing = set(
            (
                await session.execute(select(Alert.event_id).where(Alert.analysis_id == analysis_id))
            )
            .scalars()
            .all()
        )

        created = 0
        for event in events:
            if event.id in existing:
                continue
            severity = event_severity(event)
            if severity not in ALERT_MIN_SEVERITIES:
                continue
            label = change_type_label(str(event.change_type))
            details = [f"{label} of {float(event.affected_area_ha):.1f} ha"]  # type: ignore[arg-type]
            if event.mean_ndvi_change is not None:
                details.append(f"mean NDVI change {float(event.mean_ndvi_change):+.2f}")  # type: ignore[arg-type]
            if event.nearest_known_road_distance_m is not None:
                details.append(
                    f"nearest known road {float(event.nearest_known_road_distance_m):.0f} m"  # type: ignore[arg-type]
                )
            message = (
                ", ".join(details)
                + ". Pending field verification — satellite-derived change is a candidate, "
                "not proof of cause."
            )
            session.add(
                Alert(
                    id=uuid.uuid4(),
                    workspace_id=analysis.workspace_id,
                    event_id=event.id,
                    analysis_id=analysis.id,
                    area_id=analysis.area_id,
                    title=f"{label}" + (f" — {area_name}" if area_name else ""),
                    message=message,
                    severity=severity,
                    status=AlertStatusEnum.UNREAD.value,
                    triggered_at=datetime.now(timezone.utc),
                )
            )
            created += 1
        await session.flush()
        logger.info("Created %d alerts for analysis %s", created, analysis_id)
        return created
