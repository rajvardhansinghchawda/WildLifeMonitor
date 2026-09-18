"""Compute and store real land-cover statistics and NDVI timelines for catalog areas.

    python -m app.scripts.compute_area_stats [slug ...]
"""

import asyncio
import datetime
import logging
import sys

from sqlalchemy import select

from app.core.config import settings
from app.db.session import async_session_factory
from app.models.area import ProtectedArea
from app.providers.gee.area_stats import compute_statistics, compute_timeline
from app.services import portal_queries as pq

logger = logging.getLogger("compute_area_stats")


async def main(slugs: list[str]) -> None:
    if settings.PROVIDER_MODE != "gee":
        raise SystemExit("PROVIDER_MODE must be 'gee'.")
    end = datetime.date.today().replace(day=1)
    start = end - datetime.timedelta(days=365)
    async with async_session_factory() as session:
        stmt = select(ProtectedArea)
        if slugs:
            stmt = stmt.where(ProtectedArea.slug.in_(slugs))
        for area in (await session.execute(stmt)).scalars().all():
            aoi = pq.area_aoi_geojson(area)
            logger.info("%s: statistics", area.slug)
            stats = await asyncio.to_thread(compute_statistics, aoi, start, end)
            logger.info("%s: timeline", area.slug)
            timeline = await asyncio.to_thread(compute_timeline, aoi, end)
            now = datetime.datetime.now(datetime.timezone.utc)
            area.statistics = stats  # type: ignore[assignment]
            area.statistics_computed_at = now  # type: ignore[assignment]
            area.timeline = timeline  # type: ignore[assignment]
            area.timeline_computed_at = now  # type: ignore[assignment]
            await session.commit()
            logger.info("%s: stored %s", area.slug, stats["land_cover_distribution"])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main(sys.argv[1:]))
