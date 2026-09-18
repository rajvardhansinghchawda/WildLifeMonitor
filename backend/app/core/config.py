from typing import List, Optional

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application & Environment
    APP_ENV: str = Field(
        default="development", description="Runtime environment (development, staging, production)"
    )
    API_PREFIX: str = Field(default="/api/v1", description="Prefix for public application routes")
    LOG_LEVEL: str = Field(default="INFO", description="Log verbosity level")

    # Persistence & Queue
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgrespassword@localhost:5432/wildlife",
        description="Async PostgreSQL connection string",
    )
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for queue and cache",
    )

    # Object Storage (S3-compatible / MinIO)
    OBJECT_STORAGE_ENDPOINT: str = Field(default="http://localhost:9000")
    OBJECT_STORAGE_BUCKET: str = Field(default="wildlife-artifacts")
    OBJECT_STORAGE_ACCESS_KEY: str = Field(default="replace-me")
    OBJECT_STORAGE_SECRET_KEY: str = Field(default="replace-me")

    # Authentication & Identity
    AUTH_MODE: str = Field(
        default="development", description="Authentication mode: development or oidc"
    )
    OIDC_ISSUER: Optional[str] = Field(default=None, description="OIDC token issuer URL")
    OIDC_AUDIENCE: Optional[str] = Field(default=None, description="Expected OIDC token audience")

    # Providers
    GEE_PROJECT_ID: Optional[str] = Field(
        default=None, description="Google Earth Engine project ID"
    )
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = Field(
        default=None, description="Path to GCP service account key"
    )
    GFW_ENABLED: bool = Field(
        default=False, description="Whether Global Forest Watch provider is enabled"
    )
    GFW_API_KEY: Optional[str] = Field(default=None, description="API key for Global Forest Watch")
    OVERPASS_ENDPOINT: str = Field(
        default="https://overpass-api.de/api/interpreter",
        description="Overpass API endpoint for contextual spatial queries",
    )

    # Scientific & Operational Limits
    MAX_AOI_KM2: float = Field(
        default=2500.0, description="Maximum permitted AOI area in square kilometers"
    )
    MAX_AOI_VERTICES: int = Field(
        default=5000, description="Maximum permitted vertices in AOI polygon"
    )
    MAX_ACTIVE_JOBS_PER_WORKSPACE: int = Field(
        default=2, description="Maximum concurrent active jobs per workspace"
    )

    # Security & CORS
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:5173"],
        description="Explicit allowed CORS origins",
    )

    @model_validator(mode="after")
    def validate_production_auth_mode(self) -> "Settings":
        """
        Enforce backendhandoverfile.md constraint:
        Development authentication must be rejected at startup in production mode.
        """
        if self.APP_ENV.lower() == "production" and self.AUTH_MODE.lower() == "development":
            raise ValueError(
                "Development authentication mode (AUTH_MODE=development) is strictly forbidden "
                "when running in production mode (APP_ENV=production)."
            )
        return self


settings = Settings()
