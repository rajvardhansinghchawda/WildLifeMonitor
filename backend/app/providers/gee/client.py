"""Thin, thread-safe wrapper around the Earth Engine Python SDK.

All Earth Engine calls are blocking; callers must run them via `asyncio.to_thread`
(never on the FastAPI / worker event loop).
"""

import logging
import os
import threading
import time
from typing import Any, Dict

import ee
import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

_init_lock = threading.Lock()
_initialized = False

EE_SCOPES = ["https://www.googleapis.com/auth/earthengine"]


class GeeUnavailableError(Exception):
    """Raised when Earth Engine credentials/project are missing or initialization fails."""


class GeeTransientError(Exception):
    """Network / quota style failure that may succeed if retried later."""


def ensure_initialized() -> None:
    global _initialized
    if _initialized:
        return
    with _init_lock:
        if _initialized:
            return
        key_path = settings.GOOGLE_APPLICATION_CREDENTIALS
        project = settings.GEE_PROJECT_ID
        if not key_path or not project:
            raise GeeUnavailableError(
                "GEE_PROJECT_ID / GOOGLE_APPLICATION_CREDENTIALS are not configured."
            )
        if not os.path.exists(key_path):
            raise GeeUnavailableError(f"Service-account key file not found at {key_path}.")
        try:
            from google.oauth2 import service_account

            credentials = service_account.Credentials.from_service_account_file(
                key_path, scopes=EE_SCOPES
            )
            ee.Initialize(credentials=credentials, project=project)
        except Exception as exc:  # noqa: BLE001 - surfaced as classified provider error
            raise GeeUnavailableError(f"Earth Engine initialization failed: {exc}") from exc
        _initialized = True
        logger.info("Earth Engine initialized for project %s", project)


def fetch_bytes(url: str, timeout: int = 180, retries: int = 3) -> bytes:
    """Download a thumbnail / download URL produced by Earth Engine."""
    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            response = requests.get(url, timeout=timeout)
            if response.status_code == 200:
                return response.content
            if response.status_code in (429, 500, 502, 503, 504):
                last_exc = GeeTransientError(f"HTTP {response.status_code}: {response.text[:200]}")
            else:
                raise RuntimeError(f"HTTP {response.status_code}: {response.text[:300]}")
        except requests.RequestException as exc:
            last_exc = GeeTransientError(str(exc))
        time.sleep(min(2**attempt, 8))
    raise last_exc or GeeTransientError("download failed")


def classify_ee_error(exc: Exception) -> Dict[str, Any]:
    """Map an Earth Engine exception to a stable (code, retryable, message) triple."""
    message = str(exc)
    lowered = message.lower()
    if "quota" in lowered or "rate" in lowered and "limit" in lowered or "429" in lowered:
        return {"code": "PROVIDERQUOTAEXCEEDED", "retryable": True, "message": message}
    if "timed out" in lowered or "timeout" in lowered or "deadline" in lowered:
        return {"code": "PROVIDERTIMEOUT", "retryable": True, "message": message}
    if "memory limit" in lowered or "too many pixels" in lowered or "too many features" in lowered:
        return {"code": "PROVIDERCOMPUTELIMIT", "retryable": False, "message": message}
    if "permission" in lowered or "403" in lowered or "not authorized" in lowered:
        return {"code": "INVALIDCREDENTIALS", "retryable": False, "message": message}
    return {"code": "PROVIDERERROR", "retryable": False, "message": message}
