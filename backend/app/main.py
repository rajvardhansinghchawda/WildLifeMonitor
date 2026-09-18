import uuid

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import api_v1_router
from app.api.v1.health import router as root_health_router
from app.core.config import settings
from app.core.logging import request_id_ctx, setup_logging
from app.schemas.common import ErrorDetail, ErrorEnvelope

# Initialize structured logging
setup_logging(settings.LOG_LEVEL)

app = FastAPI(
    title="Wildlife Habitat Monitoring System API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware with explicit allowed origins per rules.md
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    """Tracks and propagates request_id across async context and response headers."""
    req_id = request.headers.get("X-Request-ID") or f"req-{uuid.uuid4().hex[:8]}"
    token = request_id_ctx.set(req_id)
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response
    finally:
        request_id_ctx.reset(token)


# Error Envelope Handlers per spec.md
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    req_id = request_id_ctx.get()
    error_code = getattr(exc, "error_code", None)
    if not error_code:
        if exc.status_code == 404:
            error_code = "NOTFOUND"
        elif exc.status_code == 403:
            error_code = "FORBIDDEN"
        elif exc.status_code == 401:
            error_code = "UNAUTHORIZED"
        elif exc.status_code == 409:
            error_code = "CONFLICT"
        elif exc.status_code == 501:
            error_code = "NOTIMPLEMENTED"
        else:
            error_code = "HTTPERROR"

    envelope = ErrorEnvelope(
        error=ErrorDetail(
            code=error_code,
            message=str(exc.detail),
            details={},
            request_id=req_id,
            retryable=exc.status_code in [502, 503, 504],
        )
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=envelope.model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = request_id_ctx.get()
    details = {"errors": exc.errors()}
    envelope = ErrorEnvelope(
        error=ErrorDetail(
            code="VALIDATIONERROR",
            message="Request body or query parameters failed schema validation.",
            details=details,
            request_id=req_id,
            retryable=False,
        )
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=envelope.model_dump(),
    )


# Mount root health probes (for container orchestrators) and API v1 routes
app.include_router(root_health_router)
app.include_router(api_v1_router, prefix=settings.API_PREFIX)
