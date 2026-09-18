import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_config_defaults():
    """Verify default configurations align with spec.md and backendhandoverfile.md."""
    config = Settings(
        APP_ENV="development",
        AUTH_MODE="development",
        DATABASE_URL="postgresql+asyncpg://postgres:pass@localhost:5432/wildlife",
    )
    assert config.API_PREFIX == "/api/v1"
    assert config.MAX_AOI_KM2 == 2500.0
    assert config.MAX_AOI_VERTICES == 5000
    assert config.MAX_ACTIVE_JOBS_PER_WORKSPACE == 2
    assert config.GFW_ENABLED is False
    assert config.GEE_PROJECT_ID is None
    assert config.GOOGLE_APPLICATION_CREDENTIALS is None


def test_config_production_dev_auth_rejection():
    """Enforce: Development authentication must be rejected at startup in production mode."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            APP_ENV="production",
            AUTH_MODE="development",
            DATABASE_URL="postgresql+asyncpg://postgres:pass@localhost:5432/wildlife",
        )
    assert "Development authentication mode (AUTH_MODE=development) is strictly forbidden" in str(
        exc_info.value
    )


def test_config_production_oidc_allowed():
    """Verify production with OIDC authentication succeeds."""
    config = Settings(
        APP_ENV="production",
        AUTH_MODE="oidc",
        OIDC_ISSUER="https://auth.example.com",
        OIDC_AUDIENCE="codeniti-api",
        DATABASE_URL="postgresql+asyncpg://postgres:pass@localhost:5432/wildlife",
    )
    assert config.APP_ENV == "production"
    assert config.AUTH_MODE == "oidc"
