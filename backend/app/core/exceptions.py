from typing import Any, Dict, Optional

from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base application exception mapping directly to spec.md Error Contract."""

    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        retryable: bool = False,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        self.retryable = retryable


class ValidationException(AppException):
    def __init__(
        self,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ):
        super().__init__(
            status_code=status_code,
            error_code=error_code,
            message=message,
            details=details,
            retryable=False,
        )


class ConflictException(AppException):
    def __init__(
        self,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code=error_code,
            message=message,
            details=details,
            retryable=False,
        )


class RateLimitedException(AppException):
    def __init__(
        self,
        error_code: str = "RATELIMITED",
        message: str = "Request rate limit or concurrent job limit exceeded.",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code=error_code,
            message=message,
            details=details,
            retryable=True,
        )


class NotFoundException(AppException):
    def __init__(
        self,
        error_code: str = "NOTFOUND",
        message: str = "Requested resource was not found.",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=error_code,
            message=message,
            details=details,
            retryable=False,
        )


class FencingTokenExpiredError(Exception):
    """Raised when a worker attempts to finalize or heartbeat with an expired/superseded token."""

    pass
