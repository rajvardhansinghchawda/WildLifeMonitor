import os
import uuid

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Set test environment defaults
os.environ["APP_ENV"] = "development"
os.environ["AUTH_MODE"] = "development"
os.environ["PROVIDER_MODE"] = "fixture"

_BASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/wildlife",
)
# Tests run against a DEDICATED database so real (curated/precomputed) data in the
# application database is never wiped by migration-lifecycle tests.
TEST_DB_NAME = "wildlife_test"
TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL", _BASE_URL.rsplit("/", 1)[0] + "/" + TEST_DB_NAME
)
ADMIN_DB_URL = TEST_DB_URL.rsplit("/", 1)[0] + "/postgres"
os.environ["DATABASE_URL"] = TEST_DB_URL

from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.models.workspace import Membership, RoleEnum, Workspace  # noqa: E402


def get_test_engine():
    return create_async_engine(
        TEST_DB_URL,
        echo=False,
        future=True,
        poolclass=NullPool,
    )


async def ensure_test_database() -> None:
    admin = create_async_engine(ADMIN_DB_URL, isolation_level="AUTOCOMMIT", poolclass=NullPool)
    db_name = TEST_DB_URL.rsplit("/", 1)[1]
    async with admin.connect() as conn:
        exists = await conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": db_name}
        )
        if not exists.scalar():
            await conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    await admin.dispose()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create the dedicated test DB, reset its schema, and build all tables."""
    await ensure_test_database()
    engine = get_test_engine()
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    yield


@pytest_asyncio.fixture
async def db_session():
    """Provides a fresh isolated database session per test with NullPool."""
    engine = get_test_engine()
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest_asyncio.fixture
async def client():
    """FastAPI async test client with fresh database session per request."""
    engine = get_test_engine()
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    fastapi_app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    fastapi_app.dependency_overrides.clear()
    await engine.dispose()


@pytest_asyncio.fixture
async def async_client(client: AsyncClient):
    """Alias for client."""
    return client


@pytest_asyncio.fixture
async def test_workspace(db_session: AsyncSession) -> uuid.UUID:
    """Create a test workspace and analyst membership for tests."""
    ws_id = uuid.uuid4()
    ws = Workspace(id=ws_id, name=f"Test Workspace {ws_id.hex[:6]}")
    membership = Membership(
        workspace_id=ws_id,
        user_id="test-analyst",
        role=RoleEnum.ANALYST.value,
    )
    db_session.add(ws)
    db_session.add(membership)
    await db_session.commit()
    return ws_id


@pytest_asyncio.fixture
async def auth_headers(test_workspace: uuid.UUID) -> dict:
    """Provide valid authentication and workspace headers for test requests."""
    return {
        "Authorization": "Bearer dev-user:test-analyst",
        "X-Workspace-ID": str(test_workspace),
    }
