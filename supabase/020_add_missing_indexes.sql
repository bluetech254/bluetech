-- Migration 020: Add missing database indexes
--
-- PROBLEM (from audit):
--   The initial schema (001) only indexed phone_number and status columns.
--   Foreign key columns (user_id, referrer_id, order_id) have NO indexes.
--   As data grows, queries like "get user's orders" do full table scans.
--   Admin dashboard loads ALL orders/bookings — no pagination indexes either.
--
-- All statements use IF NOT EXISTS so this migration is safe to re-run.

-- ── orders table ──────────────────────────────────────────────────────────────

-- "Get all orders for a user" — used by orders page, admin customer history
CREATE INDEX IF NOT EXISTS idx_orders_user_id
ON orders(user_id);

-- "Get orders where referrer gets bonus" — used on delivery
CREATE INDEX IF NOT EXISTS idx_orders_referrer_id
ON orders(referrer_id)
WHERE referrer_id IS NOT NULL;

-- "Get paid orders" — used in dashboard revenue calc
CREATE INDEX IF NOT EXISTS idx_orders_payment_status
ON orders(payment_status);

-- "M-Pesa callback lookup" — called on every Safaricom callback
CREATE INDEX IF NOT EXISTS idx_orders_checkout_request_id
ON orders(checkout_request_id)
WHERE checkout_request_id IS NOT NULL;

-- Composite: status + created_at — used by admin order list with status filter
CREATE INDEX IF NOT EXISTS idx_orders_status_created
ON orders(status, created_at DESC);

-- ── bookings table ────────────────────────────────────────────────────────────

-- "Get all bookings for a user"
CREATE INDEX IF NOT EXISTS idx_bookings_user_id
ON bookings(user_id);

-- "M-Pesa commitment callback lookup"
CREATE INDEX IF NOT EXISTS idx_bookings_commitment_checkout_id
ON bookings(commitment_checkout_id)
WHERE commitment_checkout_id IS NOT NULL;

-- "M-Pesa final payment callback lookup"
CREATE INDEX IF NOT EXISTS idx_bookings_final_checkout_id
ON bookings(final_checkout_id)
WHERE final_checkout_id IS NOT NULL;

-- Composite: status + created_at — admin repair queue filter
CREATE INDEX IF NOT EXISTS idx_bookings_status_created
ON bookings(status, created_at DESC);

-- ── order_items table ─────────────────────────────────────────────────────────

-- idx_order_items_order already exists from 001_schema.sql
-- Add product_id index for "orders containing product X" queries (stock impact)
CREATE INDEX IF NOT EXISTS idx_order_items_product_id
ON order_items(product_id);

-- ── points_ledger table ───────────────────────────────────────────────────────

-- idx_points_ledger_user already exists from 011_referral_points.sql
-- Add order_id index for "points earned from order X"
CREATE INDEX IF NOT EXISTS idx_points_ledger_order_id
ON points_ledger(order_id)
WHERE order_id IS NOT NULL;

-- ── users table ───────────────────────────────────────────────────────────────

-- "Find user by referral code" — used at signup and checkout
-- idx_users_referral_code already exists from 011_referral_points.sql

-- "Find users referred by X" — referral leaderboard
CREATE INDEX IF NOT EXISTS idx_users_referred_by
ON users(referred_by)
WHERE referred_by IS NOT NULL;

-- "Find user by email" — used at login
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email)
WHERE email IS NOT NULL;

-- ── admin_audit_log table ─────────────────────────────────────────────────────

-- idx_audit_admin and idx_audit_created already exist from 012_admin_audit_stock.sql
-- Add action index for filtering by action type
CREATE INDEX IF NOT EXISTS idx_audit_action
ON admin_audit_log(action);

-- ── products table ────────────────────────────────────────────────────────────

-- idx_products_active already exists from 001_schema.sql
-- Category + active — used by "shop by category"
CREATE INDEX IF NOT EXISTS idx_products_category_active
ON products(category, is_active)
WHERE is_active = true;

-- Low stock alert: stock_quantity vs threshold
CREATE INDEX IF NOT EXISTS idx_products_stock
ON products(stock_quantity, low_stock_threshold)
WHERE is_active = true;
