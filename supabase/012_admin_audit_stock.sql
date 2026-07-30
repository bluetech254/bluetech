-- Migration 012: Admin audit log + stock alerts
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id   UUID,
    admin_name VARCHAR(100),
    action     VARCHAR(100) NOT NULL,   -- e.g. 'order.status_update'
    target     VARCHAR(100),            -- e.g. 'order:uuid'
    detail     JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);

-- Stock threshold column on products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;
