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
        default="development",
        description="Authentication mode: development, local (self-issued OAuth2/JWT) or oidc",
    )
    OIDC_ISSUER: Optional[str] = Field(default=None, description="OIDC token issuer URL")
    OIDC_AUDIENCE: Optional[str] = Field(default=None, description="Expected OIDC token audience")

    # Local OAuth2 (password flow) + JWT settings — AUTH_MODE=local
    JWT_SECRET: str = Field(
        default="dev-insecure-change-me-please-0123456789",
        description="HS256 signing secret for self-issued access tokens",
    )
    JWT_ISSUER: str = Field(default="codeniti")
    ACCESS_TOKEN_TTL_MINUTES: int = Field(default=30)
    REFRESH_TOKEN_TTL_DAYS: int = Field(default=7)

    # Analysis provider selection: 'gee' (real Earth Engine) or 'fixture' (tests only)
    PROVIDER_MODE: str = Field(
        default="gee", description="Analysis provider mode: gee (real data) or fixture (tests)"
    )
    # Browser-reachable object-storage endpoint used ONLY for presigned URLs
    OBJECT_STORAGE_PUBLIC_ENDPOINT: Optional[str] = Field(default=None)
    FIRMS_MAP_KEY: Optional[str] = Field(default=None, description="NASA FIRMS MAP_KEY")
    # Grounded chat agent (Groq, OpenAI-compatible API)
    GROQAPIKEY: Optional[str] = Field(default=None, description="Groq API key for the chat agent")
    GROQMODEL: str = Field(
        default="openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b",
        description="Comma-separated Groq models, tried in order (fallback on limits/errors)",
    )
    CHATMAXLOOPITERATIONS: int = Field(default=5, ge=1, le=10)
    CHATMAXHISTORYTURNS: int = Field(default=10, ge=0, le=50)
    CONTEXT_BUFFER_KM: float = Field(
        default=5.0, description="Search buffer around AOI for nearest road/settlement (km)"
    )

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
        default=["http://localhost:3000", "http://localhost:5173"],
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
        if (
            self.APP_ENV.lower() == "production"
            and self.AUTH_MODE.lower() == "local"
            and self.JWT_SECRET.startswith("dev-insecure")
        ):
            raise ValueError("JWT_SECRET must be overridden when AUTH_MODE=local in production.")
        return self


settings = Settings()
