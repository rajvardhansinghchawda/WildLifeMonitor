import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Set test environment defaults
os.environ["APP_ENV"] = "development"
os.environ["AUTH_MODE"] = "development"
TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/wildlife",
)
os.environ["DATABASE_URL"] = TEST_DB_URL

from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402


def get_test_engine():
    return create_async_engine(
        TEST_DB_URL,
        echo=False,
        future=True,
        poolclass=NullPool,
    )


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Ensure PostGIS extension and baseline tables exist for the test session."""
    engine = get_test_engine()
    async with engine.begin() as conn:
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
