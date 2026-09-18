import os

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

TEST_DB_URL = os.environ["DATABASE_URL"]  # set to the dedicated test DB by tests/conftest.py


def get_alembic_config() -> Config:
    """Constructs Alembic Config pointing to backend/alembic.ini."""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    ini_path = os.path.join(base_dir, "alembic.ini")
    cfg = Config(ini_path)
    cfg.set_main_option("script_location", os.path.join(base_dir, "migrations"))
    cfg.set_main_option("sqlalchemy.url", TEST_DB_URL)
    return cfg


CORE_TABLES = "('workspaces', 'analyses', 'change_events', 'artifacts', 'outbox')"
PORTAL_TABLES = "('users', 'refresh_tokens', 'protected_areas', 'alerts', 'reports')"


@pytest.mark.asyncio
async def test_migration_lifecycle_apply_and_rollback():
    """
    Validates complete Alembic migration lifecycle on the dedicated test database:
    0. Reset schema (tables were pre-created by create_all for other tests)
    1. Upgrade to head
    2. Assert required tables / indexes exist in PostgreSQL
    3. Downgrade to base (rollback verification) and assert tables dropped
    4. Re-apply upgrade to head
    """
    alembic_cfg = get_alembic_config()
    engine = create_async_engine(TEST_DB_URL, echo=False)

    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))

    # 1. Upgrade head
    command.upgrade(alembic_cfg, "head")

    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                f"WHERE table_schema = 'public' AND table_name IN {CORE_TABLES};"
            )
        )
        tables = [row[0] for row in result.fetchall()]
        for expected in ("workspaces", "analyses", "change_events", "artifacts", "outbox"):
            assert expected in tables

        portal = await conn.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                f"WHERE table_schema = 'public' AND table_name IN {PORTAL_TABLES};"
            )
        )
        assert len(portal.fetchall()) == 5

        # Required indexes from dsabackendoptimisation.md
        idx_result = await conn.execute(
            text(
                "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND "
                "indexname IN ('analyses_workspace_created_idx', 'events_geom_gist_idx', "
                "'events_workspace_analysis_idx', 'events_priority_idx', "
                "'outbox_published_created_idx', 'protected_areas_boundary_gist_idx');"
            )
        )
        indexes = [row[0] for row in idx_result.fetchall()]
        for expected_idx in (
            "analyses_workspace_created_idx",
            "events_geom_gist_idx",
            "events_workspace_analysis_idx",
            "events_priority_idx",
            "outbox_published_created_idx",
            "protected_areas_boundary_gist_idx",
        ):
            assert expected_idx in indexes

    # 2. Downgrade to base (Rollback verification)
    command.downgrade(alembic_cfg, "base")

    async with engine.connect() as conn:
        after = await conn.execute(
            text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' "
                f"AND table_name IN {CORE_TABLES};"
            )
        )
        assert len(after.fetchall()) == 0

    # 3. Re-apply upgrade head
    command.upgrade(alembic_cfg, "head")

    await engine.dispose()
