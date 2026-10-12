"""
core/logging.py — Structured JSON logger for the entire backend.

Every log line is a single JSON object written to:
  - stderr        (Passenger/LiteSpeed captures this -> cPanel Error Logs)
  - logs/app.log  (rotating file on the server, max 10 MB x 5 backups)

Usage anywhere in the codebase:
    from core.logging import get_logger
    logger = get_logger(__name__)
    logger.info("user signed up", extra={"phone": phone, "user_id": uid})
    logger.error("signup failed", exc_info=True, extra={"phone": phone})
"""

import json
import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone

# ── Log directory ─────────────────────────────────────────────────────────────
# backend/logs/  (created automatically if missing)
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_LOG_DIR  = os.path.join(_BASE_DIR, "logs")
os.makedirs(_LOG_DIR, exist_ok=True)
_LOG_FILE = os.path.join(_LOG_DIR, "app.log")


class _JSONFormatter(logging.Formatter):
    """
    Formats every LogRecord as a single-line JSON object.

    Fields always present:
        ts        ISO-8601 timestamp (UTC)
        level     DEBUG / INFO / WARNING / ERROR / CRITICAL
        logger    logger name (e.g. "app.core.middleware")
        msg       human-readable message

    Fields added when present in record.extra:
        method    HTTP verb
        path      URL path
        status    HTTP status code (int)
        ip        client IP
        duration_ms  request duration in milliseconds
        user_id   authenticated user id
        endpoint  FastAPI route name
        error     short error string
        traceback full traceback (errors only)
        + any other key passed via extra={}
    """

    # Fields that are standard LogRecord attributes — don't duplicate them
    _SKIP = frozenset({
        "args", "created", "exc_info", "exc_text", "filename",
        "funcName", "levelname", "levelno", "lineno", "message",
        "module", "msecs", "msg", "name", "pathname", "process",
        "processName", "relativeCreated", "stack_info", "taskName",
        "thread", "threadName",
    })

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "ts":     datetime.fromtimestamp(record.created, tz=timezone.utc)
                      .strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
            "level":  record.levelname,
            "logger": record.name,
            "msg":    record.getMessage(),
        }

        # Attach any extra= fields passed by the caller
        for key, val in record.__dict__.items():
            if key not in self._SKIP and not key.startswith("_"):
                payload[key] = val

        # Attach exception traceback if present
        if record.exc_info:
            payload["traceback"] = self.formatException(record.exc_info)
        elif record.exc_text:
            payload["traceback"] = record.exc_text

        try:
            return json.dumps(payload, default=str, ensure_ascii=False)
        except Exception:
            # Absolute fallback — never crash the logger
            return json.dumps({"ts": payload["ts"], "level": "ERROR",
                               "msg": "log serialization failed"})


def _build_logger() -> logging.Logger:
    root = logging.getLogger("app")
    if root.handlers:          # already configured (e.g. re-import)
        return root

    root.setLevel(logging.DEBUG)
    fmt = _JSONFormatter()

    # ── stderr handler (Passenger captures this → cPanel Error Logs) ─────────
    stderr_handler = logging.StreamHandler(sys.stderr)
    stderr_handler.setFormatter(fmt)
    stderr_handler.setLevel(logging.INFO)   # INFO and above → stderr
    root.addHandler(stderr_handler)

    # ── rotating file handler ────────────────────────────────────────────────
    try:
        file_handler = RotatingFileHandler(
            _LOG_FILE,
            maxBytes    = 10 * 1024 * 1024,   # 10 MB
            backupCount = 5,
            encoding    = "utf-8",
        )
        file_handler.setFormatter(fmt)
        file_handler.setLevel(logging.DEBUG)  # everything → file
        root.addHandler(file_handler)
    except OSError as e:
        # If the file can't be created (permissions) just warn on stderr
        root.warning("Could not create log file %s: %s", _LOG_FILE, e)

    # Silence noisy third-party loggers
    for noisy in ("uvicorn.access", "uvicorn.error", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    return root


# ── Module init ───────────────────────────────────────────────────────────────
_build_logger()


def get_logger(name: str) -> logging.Logger:
    """
    Return a child logger under the 'app' namespace.

        from core.logging import get_logger
        logger = get_logger(__name__)
    """
    # Ensure the name is under the 'app' root so all handlers fire
    if not name.startswith("app"):
        name = f"app.{name}"
    return logging.getLogger(name)
