"""
core/middleware.py — Request / Response logging middleware.

Every HTTP request through the API is logged as a single JSON line:

  Successful request (2xx / 3xx):
    {"ts":"...","level":"INFO","msg":"POST /api/v1/auth/signup → 201",
     "method":"POST","path":"/api/v1/auth/signup","status":201,
     "ip":"197.232.x.x","duration_ms":143,"user_id":null}

  Client error (4xx):
    {"ts":"...","level":"WARNING","msg":"POST /api/v1/auth/signup → 400",
     "method":"POST","path":"/api/v1/auth/signup","status":400,
     "ip":"197.232.x.x","duration_ms":38,"user_id":null,
     "error":"Phone number already registered"}

  Server error (5xx / unhandled exception):
    {"ts":"...","level":"ERROR","msg":"POST /api/v1/auth/signup → 500",
     ..., "error":"KeyError: 'id'", "traceback":"Traceback (most recent call last)..."}

Also attaches a unique X-Request-ID header to every response so you can
correlate a request in the browser DevTools network tab with its log line.
"""

import time
import traceback
import uuid

from core.logging import get_logger
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = get_logger("core.middleware")

# Paths to skip entirely (health probes, docs, static assets)
_SKIP_PATHS = frozenset({
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
})


def _get_client_ip(request: Request) -> str:
    """
    Return the real client IP.
    Checks X-Forwarded-For first (set by LiteSpeed/nginx reverse proxy),
    then X-Real-IP, then falls back to the direct connection IP.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    xri = request.headers.get("x-real-ip")
    if xri:
        return xri.strip()
    if request.client:
        return request.client.host
    return "unknown"


def _extract_user_id(request: Request) -> str | None:
    """
    Pull the user_id from the JWT if it was already decoded by a dependency.
    FastAPI stores the decoded payload in request.state.user when
    the auth dependency runs.  Falls back gracefully if not present.
    """
    user = getattr(request.state, "user", None)
    if user is None:
        return None
    if isinstance(user, dict):
        return str(user.get("id") or user.get("user_id") or user.get("sub") or "")
    return str(getattr(user, "id", "") or "")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Starlette BaseHTTPMiddleware that:
    - Assigns a unique X-Request-ID to every request
    - Times the request
    - Logs a structured JSON line on completion
    - Catches unhandled exceptions, logs full traceback, returns a clean 500
    """

    async def dispatch(self, request: Request, call_next):
        # Skip health probes and docs — they're noisy and useless
        if request.url.path in _SKIP_PATHS:
            return await call_next(request)

        request_id = str(uuid.uuid4())
        request.state.request_id = request_id   # available to route handlers

        ip          = _get_client_ip(request)
        method      = request.method
        path        = request.url.path
        query       = str(request.url.query) if request.url.query else None
        started_at  = time.perf_counter()

        # ── Base log fields shared by success + error ─────────────────────────
        base_extra = {
            "request_id": request_id,
            "method":     method,
            "path":       path,
            "ip":         ip,
        }
        if query:
            base_extra["query"] = query

        response: Response | None = None
        try:
            response = await call_next(request)
        except Exception as exc:
            # Unhandled exception — log full traceback and return 500
            duration_ms = round((time.perf_counter() - started_at) * 1000, 1)
            tb          = traceback.format_exc()
            error_str   = f"{type(exc).__name__}: {exc}"

            logger.error(
                f"{method} {path} → 500",
                extra={
                    **base_extra,
                    "status":      500,
                    "duration_ms": duration_ms,
                    "user_id":     _extract_user_id(request),
                    "error":       error_str,
                    "traceback":   tb,
                },
            )

            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
                headers={"X-Request-ID": request_id},
            )

        # ── Request completed normally ────────────────────────────────────────
        duration_ms = round((time.perf_counter() - started_at) * 1000, 1)
        status      = response.status_code
        user_id     = _extract_user_id(request)

        extra = {
            **base_extra,
            "status":      status,
            "duration_ms": duration_ms,
            "user_id":     user_id or None,
        }

        if status >= 500:
            logger.error(f"{method} {path} → {status}", extra=extra)
        elif status >= 400:
            logger.warning(f"{method} {path} → {status}", extra=extra)
        else:
            logger.info(f"{method} {path} → {status}", extra=extra)

        response.headers["X-Request-ID"] = request_id
        return response
