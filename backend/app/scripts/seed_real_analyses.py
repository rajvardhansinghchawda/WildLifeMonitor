"""Run REAL analyses for the catalog areas inside a curated, read-only public workspace.

Every result comes from the configured providers (PROVIDER_MODE=gee): Sentinel-2 / Dynamic
World via Earth Engine and OpenStreetMap context. Nothing is fabricated. Requires the worker,
dispatcher and scheduler to be running. Spends Earth Engine quota, so areas run sequentially.

    python -m app.scripts.seed_real_analyses [slug ...]
"""

import asyncio
import datetime
import logging
import sys
import uuid

from sqlalchemy import select

from app.core.config import settings
from app.db.session import async_session_factory
from app.models.analysis import Analysis
from app.models.area import ProtectedArea
from app.models.workspace import Workspace
from app.schemas.analysis import AnalysisCreateRequest, DateWindow
from app.services import portal_queries as pq
from app.services.analysis_service import AnalysisService

logger = logging.getLogger("seed_real_analyses")

CURATED_WORKSPACE_ID = uuid.UUID("00000000-0000-0000-0000-00000000c0de")
SYSTEM_USER = "system-curator"
TERMINAL = {"succeeded", "partial", "failed", "cancelled"}

# Same dry-season window, one year apart (limits cloud/phenology effects).
BASELINE = DateWindow(start=datetime.date(2025, 2, 15), end=datetime.date(2025, 4, 15))
COMPARISON = DateWindow(start=datetime.date(2026, 2, 15), end=datetime.date(2026, 4, 15))
LAYERS = ["vegetation", "water", "builtup"]


async def _ensure_workspace() -> None:
    async with async_session_factory() as session:
        ws = await session.get(Workspace, CURATED_WORKSPACE_ID)
        if ws is None:
            session.add(
                Workspace(
                    id=CURATED_WORKSPACE_ID,
                    name="Curated Real Analyses",
                    is_public=True,
                    settings={"description": "Precomputed real satellite analyses (read-only)."},
                )
            )
        else:
            ws.is_public = True  # type: ignore[assignment]
        await session.commit()


async def _run_area(area_id: uuid.UUID, slug: str, timeout_s: int = 1800) -> None:
    async with async_session_factory() as session:
        existing = (
            await session.execute(
                select(Analysis.id).where(
                    Analysis.workspace_id == CURATED_WORKSPACE_ID,
                    Analysis.area_id == area_id,
                    Analysis.status.in_(["succeeded", "partial"]),
                )
            )
        ).first()
        if existing:
            logger.info("%s: already analysed, skipping", slug)
            return
        area = await session.get(ProtectedArea, area_id)
        assert area is not None
        request = AnalysisCreateRequest(
            aoi=pq.area_aoi_geojson(area),
            area_id=area_id,
            baseline=BASELINE,
            comparison=COMPARISON,
            layers=LAYERS,
        )
        resp, _ = await AnalysisService().submit_analysis(
            session=session,
            workspace_id=CURATED_WORKSPACE_ID,
            user_id=SYSTEM_USER,
            request=request,
            idempotency_key=f"curated-{slug}-{BASELINE.start}-{COMPARISON.start}",
            area_id=area_id,
        )
        await session.commit()
        analysis_id = uuid.UUID(str(resp.analysis_id))
    logger.info("%s: submitted %s", slug, analysis_id)

    waited = 0
    while waited < timeout_s:
        await asyncio.sleep(15)
        waited += 15
        async with async_session_factory() as session:
            a = await session.get(Analysis, analysis_id)
            assert a is not None
            logger.info("%s: %s (%s) after %ss", slug, a.status, a.stage, waited)
            if a.status in TERMINAL:
                return
    logger.error("%s: timed out waiting for analysis %s", slug, analysis_id)


async def main(slugs: list[str]) -> None:
    if settings.PROVIDER_MODE != "gee":
        raise SystemExit("PROVIDER_MODE must be 'gee' — refusing to seed non-real data.")
    await _ensure_workspace()
    async with async_session_factory() as session:
        stmt = select(ProtectedArea.id, ProtectedArea.slug)
        if slugs:
            stmt = stmt.where(ProtectedArea.slug.in_(slugs))
        areas = (await session.execute(stmt)).all()
    for area_id, slug in areas:
        await _run_area(area_id, slug)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main(sys.argv[1:]))
