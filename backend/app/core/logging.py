import contextvars
import json
import logging
import re
import sys
from typing import Any, Dict

# Context variables for correlation across async tasks
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")
analysis_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("analysis_id", default="")
attempt_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("attempt_id", default="")

# Sensitive patterns and keys
BEARER_PATTERN = re.compile(r"Bearer\s+([A-Za-z0-9\-\._~\+\/]+=*)", re.IGNORECASE)
SENSITIVE_KEYS = {
    "password",
    "secret",
    "token",
    "access_key",
    "secret_key",
    "api_key",
    "credentials",
}
COORDINATE_KEYS = {"coordinates", "geom", "geometry"}


def redact_data(data: Any) -> Any:
    """Recursively redacts secrets and raw coordinates from log payloads."""
    if isinstance(data, dict):
        redacted = {}
        for key, value in data.items():
            lower_key = str(key).lower()
            if any(s in lower_key for s in SENSITIVE_KEYS):
                redacted[key] = "[REDACTED_SECRET]"
            elif lower_key in COORDINATE_KEYS:
                redacted[key] = "[REDACTED_COORDINATES]"
            else:
                redacted[key] = redact_data(value)
        return redacted
    elif isinstance(data, list):
        return [redact_data(item) for item in data]
    elif isinstance(data, str):
        return BEARER_PATTERN.sub("Bearer [REDACTED_TOKEN]", data)
    return data


class StructuredJSONFormatter(logging.Formatter):
    """Formats log records as JSON lines with correlation context and redaction."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Inject correlation identifiers if present
        req_id = request_id_ctx.get()
        if req_id:
            log_entry["request_id"] = req_id

        an_id = analysis_id_ctx.get()
        if an_id:
            log_entry["analysis_id"] = an_id

        att_id = attempt_id_ctx.get()
        if att_id:
            log_entry["attempt_id"] = att_id

        # Merge extra attributes if provided
        if hasattr(record, "extra") and isinstance(record.extra, dict):
            for k, v in record.extra.items():
                if k not in log_entry:
                    log_entry[k] = v

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Apply redaction per rules.md
        safe_log_entry = redact_data(log_entry)
        return json.dumps(safe_log_entry)


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Configure structured JSON logging handler for the root application logger."""
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level.upper())

    # Clear existing handlers
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredJSONFormatter())
    root_logger.addHandler(handler)

    # Suppress excessive third-party logs
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)

    return root_logger


logger = logging.getLogger("codeniti")
