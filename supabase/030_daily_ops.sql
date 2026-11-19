-- Migration 030: Daily Ops & EOD Reporting module
--
-- Creates the four tables that back the unified "Daily Ops" workspace:
--   daily_reports    - one record per business day (cash drawer + lock state)
--   daily_leads      - leads inquiry tracker, grouped by channel
--   daily_logistics  - pickup / delivery movements, grouped by zone
--   daily_expenses   - shift expenses, feed the cash drawer equation
--
-- Column names mirror exactly what backend/app/daily/service.py reads and
-- writes. This file is idempotent (CREATE ... IF NOT EXISTS) so it is safe to
-- re-run on an environment that already has the tables.
--
-- Notes on conventions (matches the live production Postgres in bluetech-db):
--   * No Row Level Security. Production accesses these tables only through the
--     backend, which connects as the database superuser (bypasses RLS), so RLS
--     is not enabled — consistent with the `admins` table in prod. (The dev
--     Supabase project's RLS/service_role pattern is intentionally NOT used here
--     to keep the schema identical across environments.)
--   * id defaults to gen_random_uuid() (built-in, Postgres 13+).
--   * child tables cascade on parent daily_reports deletion; the admin/zone/
--     invoice FKs use the default NO ACTION (RESTRICT) — matching prod.
--   * daily_leads.invoice_id and daily_logistics.invoice_id reference orders(id)
--     — the EOD aggregation treats invoice_id as an orders.id link, and prod
--     enforces it as a real foreign key.
--
-- FK targets (all already exist in prod):
--   daily_reports.closed_by        -> admins(id)
--   daily_expenses.recorded_by      -> admins(id)
--   daily_logistics.zone_id        -> delivery_zones(id)
--   daily_leads.invoice_id         -> orders(id)
--   daily_logistics.invoice_id     -> orders(id)
--   child tables.daily_report_id   -> daily_reports(id) ON DELETE CASCADE

-- ── daily_reports ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_reports (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date   DATE NOT NULL UNIQUE,
    opening_cash  NUMERIC(12,2) NOT NULL DEFAULT 0,
    counted_cash  NUMERIC(12,2) NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'open',   -- open | closed
    closed_by     UUID REFERENCES admins(id),
    closed_at     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── daily_leads ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_leads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    channel         TEXT NOT NULL,                   -- call | whatsapp | walk_in
    source          TEXT,                            -- google | website | instagram | unknown | NULL
    status          TEXT NOT NULL DEFAULT 'pending', -- pending | closed | no_go | scheduled
    customer_name   TEXT,
    phone           TEXT,
    invoice_id      UUID REFERENCES orders(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_leads_report ON daily_leads (daily_report_id);
CREATE INDEX IF NOT EXISTS idx_daily_leads_status ON daily_leads (status);

-- ── daily_logistics ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_logistics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    movement_type   TEXT NOT NULL,                   -- pickup | delivery
    fulfillment_by  TEXT NOT NULL,                   -- us | not_us
    driver_id       UUID,                            -- future named-driver assignment (not in UI yet)
    zone_id         UUID REFERENCES delivery_zones(id),
    zone_name       TEXT NOT NULL,                   -- denormalised snapshot of zone name at entry time
    quantity        INT NOT NULL DEFAULT 1,
    invoice_id      UUID REFERENCES orders(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_logistics_report ON daily_logistics (daily_report_id);

-- ── daily_expenses ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    vendor          TEXT NOT NULL,
    reason          TEXT NOT NULL,
    bill_ref        TEXT,
    payment_method  TEXT NOT NULL,                   -- cash | card | transfer
    amount          NUMERIC(12,2) NOT NULL,
    recorded_by     UUID REFERENCES admins(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_expenses_report ON daily_expenses (daily_report_id);
