"""Batch-seed India top National Parks and Tiger Reserves into protected_areas catalog.

Uses existing upsert_area() from seed_areas.py which fetches real
polygon boundaries from OpenStreetMap / Nominatim.

Usage (inside the api container):
    python -m app.scripts.seed_india_habitats

Rate limit: Nominatim policy is max 1 req/second. 1.2s delay used.
"""

import asyncio
import logging
import time

from app.scripts.seed_areas import upsert_area

logger = logging.getLogger("seed_india_habitats")

INDIA_HABITATS = [
    # NORTH INDIA
    "Jim Corbett National Park",
    "Rajaji National Park",
    "Dudhwa National Park",
    "Pilibhit Tiger Reserve",
    "Hemis National Park",
    "Great Himalayan National Park",
    "Nanda Devi National Park",
    "Valley of Flowers National Park",
    # CENTRAL INDIA
    "Kanha National Park",
    "Bandhavgarh National Park",
    "Panna National Park",
    "Satpura National Park",
    "Sanjay National Park",
    "Kuno National Park",
    # WEST INDIA
    "Ranthambhore National Park",
    "Sariska Tiger Reserve",
    "Gir National Park",
    "Blackbuck National Park Velavadar",
    "Tadoba Andhari Tiger Reserve",
    "Melghat Tiger Reserve",
    "Sahyadri Tiger Reserve",
    # EAST AND NORTHEAST
    "Kaziranga National Park",
    "Manas National Park",
    "Namdapha National Park",
    "Orang National Park",
    "Nameri National Park",
    "Buxa Tiger Reserve",
    "Gorumara National Park",
    "Jaldapara National Park",
    "Similipal National Park",
    "Bhitarkanika National Park",
    "Keoladeo National Park",
    # SOUTH INDIA
    "Bandipur National Park",
    "Nagarhole National Park",
    "Periyar National Park",
    "Mudumalai National Park",
    "Silent Valley National Park",
    "Eravikulam National Park",
    "Kudremukh National Park",
    "Kalakad Mundanthurai Tiger Reserve",
    "Valmiki National Park",
    # ANDAMAN
    "Campbell Bay National Park",
    "Mahatma Gandhi Marine National Park",
]


async def main() -> None:
    success = 0
    failed = 0
    skipped = 0

    for i, query in enumerate(INDIA_HABITATS):
        if i > 0:
            time.sleep(1.2)

        try:
            area = await upsert_area(query)
            logger.info("OK [%02d/%02d] %s - %s, %s (%.0f km2)",
                        i + 1, len(INDIA_HABITATS),
                        area.name, area.state or "?", area.country or "?", area.area_km2 or 0)
            success += 1
        except LookupError as exc:
            logger.warning("SKIP [%02d/%02d] %s: %s", i + 1, len(INDIA_HABITATS), query, exc)
            skipped += 1
        except Exception as exc:
            logger.error("FAIL [%02d/%02d] %s: %s", i + 1, len(INDIA_HABITATS), query, exc)
            failed += 1

    logger.info("Seed Complete: %d ok, %d skipped, %d failed out of %d",
                success, skipped, failed, len(INDIA_HABITATS))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    asyncio.run(main())

