"""
core/startup.py — Startup validation.

Called once when the app boots. Validates all external connections and
required config. Logs warnings instead of crashing when DATABASE_TYPE
is not set, so the app can still start (e.g. on Render before env vars
are configured). The /health/db endpoint provides runtime DB status.
"""
import logging
import os

logger = logging.getLogger(__name__)


def validate_startup() -> None:
    """
    Run all startup checks. Raises RuntimeError on any failure so the
    process exits immediately with a visible error message — unless
    DATABASE_TYPE is not set, in which case we warn and let the app
    start so it can be configured remotely.
    """
    db_type = os.getenv("DATABASE_TYPE", "").lower()
    if not db_type:
        try:
            from core.config import settings
            db_type = settings.DATABASE_TYPE.lower()
        except Exception:
            pass

    if not db_type:
        logger.warning(
            "⚠ DATABASE_TYPE not set. Set it to 'postgresql' or 'supabase' "
            "in the environment (e.g. Render dashboard env vars). "
            "DB endpoints will return errors until configured."
        )
        return

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
