"""app/services/audit.py — best-effort audit logging into payments-db."""
import json
import logging

from app import db

logger = logging.getLogger(__name__)


def log_action(
    action: str,
    *,
    entity_type: str | None = None,
    entity_id: str | None = None,
    detail: dict | None = None,
    ip: str | None = None,
    actor: str | None = None,
) -> None:
    """Record an audit entry. Never raises — audit must not break payments."""
    try:
        db.execute(
            "payments",
            """INSERT INTO payments_audit_log
                 (action, entity_type, entity_id, detail, ip, actor, created_at)
               VALUES (%s, %s, %s, %s::jsonb, %s, %s, NOW())""",
            (
                action,
                entity_type,
                entity_id,
                json.dumps(detail or {}),
                ip,
                actor,
            ),
        )
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Audit log write failed for %s: %s", action, exc)
