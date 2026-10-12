"""
core/startup.py — Startup validation.

Called once when the app boots. Validates all external connections and
required config. Fails fast with a clear error rather than starting a
broken server that crashes on the first real request.
"""
import logging

from core.config import settings

logger = logging.getLogger(__name__)


def validate_startup() -> None:
    """
    Run all startup checks. Raises RuntimeError on any failure so the
    process exits immediately with a visible error message.
    """
    _check_database()
    logger.info("✓ All startup checks passed")


def _check_database() -> None:
    """Verify the database is reachable before accepting traffic."""
    try:
        from core.db import db
        db.table("products").select("id").limit(1).execute()
        logger.info("✓ Database connection OK")
    except Exception as e:
        raise RuntimeError(
            f"Database unreachable at startup. "
            f"Check DATABASE_TYPE env var and connection credentials. Error: {e}"
        )
