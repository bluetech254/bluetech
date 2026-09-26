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
    _check_mpesa_production_config()
    logger.info("✓ All startup checks passed")


def _check_database() -> None:
    """Verify the database is reachable before accepting traffic."""
    try:
        from core.database import get_admin_db
        get_admin_db().table("products").select("id").limit(1).execute()
        logger.info("✓ Database connection OK")
    except Exception as e:
        raise RuntimeError(
            f"Database unreachable at startup. "
            f"Check SUPABASE_URL and SUPABASE_SERVICE_KEY. Error: {e}"
        )


def _check_mpesa_production_config() -> None:
    """
    In production M-Pesa mode, all payment credentials must be set.
    In sandbox mode this check is skipped so local dev works without them.
    """
    if settings.MPESA_ENV != "production":
        return

    required = {
        "MPESA_CONSUMER_KEY":    settings.MPESA_CONSUMER_KEY,
        "MPESA_CONSUMER_SECRET": settings.MPESA_CONSUMER_SECRET,
        "MPESA_PASSKEY":         settings.MPESA_PASSKEY,
        "MPESA_CALLBACK_URL":    settings.MPESA_CALLBACK_URL,
        "MPESA_SHORTCODE":       settings.MPESA_SHORTCODE,
    }
    missing = [k for k, v in required.items() if not v]
    if missing:
        raise RuntimeError(
            f"M-Pesa is set to 'production' but these vars are missing: "
            f"{', '.join(missing)}"
        )
    logger.info("✓ M-Pesa production config OK")
