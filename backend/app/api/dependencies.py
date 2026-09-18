import uuid

from fastapi import Request

from app.core.logging import request_id_ctx


async def get_request_id(request: Request) -> str:
    """Extracts or generates unique request correlation ID."""
    req_id = request.headers.get("X-Request-ID") or f"req-{uuid.uuid4().hex[:8]}"
    request_id_ctx.set(req_id)
    return req_id
