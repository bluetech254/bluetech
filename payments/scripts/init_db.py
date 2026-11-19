"""
scripts/init_db.py — create the tables in the isolated payments database.

Run inside the container or from the payments/ directory:

    python scripts/init_db.py

Idempotent: safe to run repeatedly.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import psycopg2  # noqa: E402

from app.config import settings  # noqa: E402

DDL = """
CREATE TABLE IF NOT EXISTS payments_transaction (
    id          BIGSERIAL PRIMARY KEY,
    gateway     TEXT NOT NULL,
    gateway_ref TEXT NOT NULL UNIQUE,
    external_ref TEXT,
    checkout_request_id TEXT,
    kind        TEXT,
    entity_id   TEXT,
    amount_kes  NUMERIC(12,2),
    status      TEXT NOT NULL DEFAULT 'pending',
    currency    TEXT NOT NULL DEFAULT 'KES',
    phone       TEXT,
    provider_ref TEXT,
    raw         JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payments_transaction ADD COLUMN IF NOT EXISTS external_ref TEXT;
ALTER TABLE payments_transaction ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
ALTER TABLE payments_transaction ADD COLUMN IF NOT EXISTS provider_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_transaction_external ON payments_transaction (external_ref);

CREATE INDEX IF NOT EXISTS idx_payments_transaction_kind
    ON payments_transaction (kind);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_entity
    ON payments_transaction (entity_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_status
    ON payments_transaction (status);

CREATE TABLE IF NOT EXISTS payments_audit_log (
    id          BIGSERIAL PRIMARY KEY,
    action      TEXT NOT NULL,
    entity_type TEXT,
    entity_id   TEXT,
    detail      JSONB,
    ip          TEXT,
    actor       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_audit_entity
    ON payments_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_payments_audit_created
    ON payments_audit_log (created_at);
"""


def main() -> None:
    conn = psycopg2.connect(
        host=settings.PAYMENTS_DB_HOST,
        port=settings.PAYMENTS_DB_PORT,
        dbname=settings.PAYMENTS_DB_NAME,
        user=settings.PAYMENTS_DB_USER,
        password=settings.PAYMENTS_DB_PASSWORD,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(DDL)
        conn.commit()
    finally:
        conn.close()
    print(
        f"payments-db ready at "
        f"{settings.PAYMENTS_DB_HOST}:{settings.PAYMENTS_DB_PORT}/"
        f"{settings.PAYMENTS_DB_NAME}"
    )


if __name__ == "__main__":
    main()
