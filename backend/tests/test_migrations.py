import os

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/wildlife",
    ),
)


def get_alembic_config() -> Config:
    """Constructs Alembic Config pointing to backend/alembic.ini."""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    ini_path = os.path.join(base_dir, "alembic.ini")
    cfg = Config(ini_path)
    cfg.set_main_option("script_location", os.path.join(base_dir, "migrations"))
    cfg.set_main_option("sqlalchemy.url", TEST_DB_URL)
    return cfg


@pytest.mark.asyncio
async def test_migration_lifecycle_apply_and_rollback():
    """
    Validates complete Alembic migration lifecycle:
    1. Upgrade to head
    2. Assert required tables exist in PostgreSQL
    3. Downgrade to base (rollback verification)
    4. Assert tables dropped cleanly
    5. Re-apply upgrade to head
    """
    alembic_cfg = get_alembic_config()
    engine = create_async_engine(TEST_DB_URL, echo=False)

    # 1. Upgrade head
    command.upgrade(alembic_cfg, "head")

    async with engine.connect() as conn:
        # Check tables in database
        result = await conn.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name IN "
                "('workspaces', 'analyses', 'change_events', 'artifacts', 'outbox');"
            )
        )
        tables = [row[0] for row in result.fetchall()]
        assert "workspaces" in tables
        assert "analyses" in tables
        assert "change_events" in tables
        assert "artifacts" in tables
        assert "outbox" in tables

        # Verify required indexes from dsabackendoptimisation.md exist
        idx_result = await conn.execute(
            text(
                "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND "
                "indexname IN ('analyses_workspace_created_idx', 'events_geom_gist_idx', "
                "'events_workspace_analysis_idx', 'events_priority_idx', 'outbox_published_created_idx');"
            )
        )
        indexes = [row[0] for row in idx_result.fetchall()]
        assert "analyses_workspace_created_idx" in indexes
        assert "events_geom_gist_idx" in indexes
        assert "events_workspace_analysis_idx" in indexes
        assert "events_priority_idx" in indexes
        assert "outbox_published_created_idx" in indexes

    # 2. Downgrade to base (Rollback verification)
    command.downgrade(alembic_cfg, "base")

    async with engine.connect() as conn:
        result_after_rollback = await conn.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name IN "
                "('workspaces', 'analyses', 'change_events', 'artifacts', 'outbox');"
            )
        )
        tables_after_rollback = [row[0] for row in result_after_rollback.fetchall()]
        assert len(tables_after_rollback) == 0

    # 3. Re-apply upgrade head
    command.upgrade(alembic_cfg, "head")

    await engine.dispose()
