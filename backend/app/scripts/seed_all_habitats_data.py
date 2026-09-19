"""Pre-load and compute satellite telemetry and analyses for all habitats in the database.

Usage (inside api container):
    python -m app.scripts.seed_all_habitats_data
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.db.session import async_session_factory
from app.models.area import ProtectedArea
from app.services.telemetry_generator import (
    CURATED_WORKSPACE_ID,
    ensure_habitat_analysis,
    generate_area_telemetry,
    infer_biome,
)

logger = logging.getLogger("seed_all_habitats_data")


async def main() -> None:
    async with async_session_factory() as session:
        stmt = select(ProtectedArea).order_by(ProtectedArea.name)
        areas = (await session.execute(stmt)).scalars().all()
        logger.info("Found %d protected areas in database.", len(areas))

        now = datetime.now(timezone.utc)
        updated_count = 0
        analysis_count = 0

        for area in areas:
            changed = False
            # 1. Infer biome if missing
            if not area.biome:
                area.biome = infer_biome(
                    area.centroid_lat,
                    area.centroid_lon,
                    state=area.state,
                    country=area.country,
                    name=area.name,
                )
                changed = True

            # 2. Compute statistics & timeline if missing
            if not area.statistics or not area.timeline:
                stats, timeline = generate_area_telemetry(area)
                if not area.statistics:
                    area.statistics = stats  # type: ignore[assignment]
                    area.statistics_computed_at = now  # type: ignore[assignment]
                    changed = True
                if not area.timeline:
                    area.timeline = timeline  # type: ignore[assignment]
                    area.timeline_computed_at = now  # type: ignore[assignment]
                    changed = True

            if changed:
                updated_count += 1

            # 3. Ensure completed Analysis exists with layers and hotspots
            analysis = await ensure_habitat_analysis(session, area, CURATED_WORKSPACE_ID)
            if analysis:
                analysis_count += 1

            logger.info(
                "Processed '%s': Biome='%s', Forest=%.1f%%, Water=%.1f ha, Analysis=%s",
                area.name,
                area.biome,
                (area.statistics or {}).get("forest_cover_percent", 0.0),
                (area.statistics or {}).get("water_bodies_ha", 0.0),
                analysis.id if analysis else "None",
            )

        await session.commit()
        logger.info(
            "Successfully verified and updated %d habitats with %d active analyses.",
            updated_count,
            analysis_count,
        )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    asyncio.run(main())
