"""
core/audit.py — Admin audit log helper.

Call log_action() from any admin endpoint or service to record who did
what and when. Failures are silently logged — audit writes must never
break the operation they're recording.
"""
import logging

logger = logging.getLogger(__name__)


def log_action(
    admin: dict,
    action: str,
    target: str | None = None,
    detail: dict | None = None,
) -> None:
    """
    Write a single audit log entry to admin_audit_log table.

    Args:
        admin:  The admin payload dict from get_current_admin() dependency.
        action: Dot-notation action string e.g. 'order.status_update'.
        target: Optional resource identifier e.g. 'order:abc123'.
        detail: Optional dict of additional context (status, amounts, etc.).
    """
    try:
        from core.db import db
        db.table("admin_audit_log").insert({
            "admin_id":   admin.get("admin_id"),
            "admin_name": admin.get("username"),
            "action":     action,
            "target":     target,
            "detail":     detail or {},
        }).execute()
    except Exception as e:
        # Never let audit failure crash the caller
        logger.warning(f"Audit log write failed (action={action}): {e}")
