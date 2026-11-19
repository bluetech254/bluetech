"""
app/db.py — thin psycopg2 connection-pool helpers for the two databases.

Usage:
    from app.db import fetch_all, fetch_one, execute

    fetch_one("bluetech", "SELECT * FROM orders WHERE id = %s", (order_id,))
    execute("bluetech", "UPDATE orders SET payment_status='paid' WHERE id=%s", (order_id,))
    execute("payments", "INSERT INTO payments_transaction (...) VALUES (...)", params)

`which` is either "bluetech" (authoritative) or "payments" (isolated/audit).
"""
import logging
from typing import Any

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

from app.config import settings

logger = logging.getLogger(__name__)

_pools: dict[str, Any] = {}


def _dsn(which: str) -> str:
    if which == "bluetech":
        return (
            f"host={settings.DB_HOST} port={settings.DB_PORT} "
            f"dbname={settings.DB_NAME} user={settings.DB_USER} "
            f"password={settings.DB_PASSWORD}"
        )
    if which == "payments":
        return (
            f"host={settings.PAYMENTS_DB_HOST} port={settings.PAYMENTS_DB_PORT} "
            f"dbname={settings.PAYMENTS_DB_NAME} user={settings.PAYMENTS_DB_USER} "
            f"password={settings.PAYMENTS_DB_PASSWORD}"
        )
    raise ValueError(f"Unknown database '{which}' (expected 'bluetech' or 'payments')")


def _get_pool(which: str) -> pool.SimpleConnectionPool:
    if which not in _pools:
        _pools[which] = pool.SimpleConnectionPool(1, 10, _dsn(which))
        logger.info("Initialised connection pool for %s", which)
    return _pools[which]


def _get_conn(which: str):
    return _get_pool(which).getconn()


def _release(which: str, conn) -> None:
    try:
        _get_pool(which).putconn(conn)
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Failed to return %s connection to pool: %s", which, exc)


def fetch_all(which: str, sql: str, params: tuple | None = None) -> list[dict]:
    conn = _get_conn(which)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            return [dict(row) for row in cur.fetchall()]
    finally:
        _release(which, conn)


def fetch_one(which: str, sql: str, params: tuple | None = None) -> dict | None:
    rows = fetch_all(which, sql, params)
    return rows[0] if rows else None


def execute(which: str, sql: str, params: tuple | None = None) -> int:
    """Run a write statement, commit, and return the affected row count."""
    conn = _get_conn(which)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            rowcount = cur.rowcount
        conn.commit()
        return rowcount
    except Exception:
        conn.rollback()
        raise
    finally:
        _release(which, conn)


def healthcheck() -> dict:
    result: dict[str, str] = {}
    for which in ("bluetech", "payments"):
        try:
            fetch_one(which, "SELECT 1 AS ok")
            result[which] = "up"
        except Exception as exc:  # pragma: no cover - depends on infra
            result[which] = f"down: {exc}"
    return result
