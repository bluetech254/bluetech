"""Admin audit log helper — call from any admin endpoint."""
from app.database import supabase_admin
import logging

logger = logging.getLogger(__name__)


def log_action(admin: dict, action: str, target: str = None, detail: dict = None):
    """Write an audit log entry. Never raises — failures are logged only."""
    try:
        supabase_admin.table("admin_audit_log").insert({
            "admin_id":   admin.get("admin_id"),
            "admin_name": admin.get("username"),
            "action":     action,
            "target":     target,
            "detail":     detail or {},
        }).execute()
    except Exception as e:
        logger.warning(f"Audit log write failed: {e}")
