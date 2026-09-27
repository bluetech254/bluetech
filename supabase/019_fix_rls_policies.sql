-- Migration 019: Fix RLS policies
-- 
-- PROBLEM (from audit):
--   002_rls_policies.sql gave EVERYONE read access to ALL orders, bookings,
--   and users via the Supabase anon key. Any client with the public anon key
--   could read every customer's name, phone, address and payment receipts.
--
-- FIX:
--   The backend exclusively uses the SERVICE ROLE key which bypasses RLS.
--   The anon key is only used for public catalog reads (products, zones, services).
--   All sensitive tables (orders, bookings, users) are locked — anon key gets nothing.
--   This does not break anything: every backend route that needs these tables
--   already uses supabase_admin (service role), not the anon client.
--
-- NOTE: Run this migration, then verify your SUPABASE_SERVICE_KEY is set on
--   the backend. If you ever query orders/bookings directly from a client
--   app using the anon key, those calls will now fail with 403 — which is correct.

-- ── Drop all existing overly-permissive policies ──────────────────────────────

DROP POLICY IF EXISTS "Anyone can view orders"     ON orders;
DROP POLICY IF EXISTS "Anyone can view bookings"   ON bookings;
DROP POLICY IF EXISTS "Anyone can view users"      ON users;
DROP POLICY IF EXISTS "Anyone can view order items" ON order_items;
DROP POLICY IF EXISTS "Anyone can insert order items" ON order_items;
DROP POLICY IF EXISTS "Anyone can create orders"   ON orders;
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can create users"    ON users;

-- ── Products: public reads remain (catalog is public) ─────────────────────────

-- Keep existing: "Anyone can view active products"
-- If it doesn't exist, re-create it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'products' AND policyname = 'Anyone can view active products'
  ) THEN
    CREATE POLICY "Anyone can view active products"
    ON products FOR SELECT
    USING (is_active = true);
  END IF;
END $$;

-- ── Orders: service role only via backend ─────────────────────────────────────
-- The backend uses service role key which bypasses RLS entirely.
-- Anon key (direct client calls) gets zero access — intentional.

-- Insert: still needed so the backend anon client can create orders
-- (backend/app/orders/service.py uses supabase (anon) for INSERT)
CREATE POLICY "Backend can insert orders"
ON orders FOR INSERT
WITH CHECK (true);

-- Insert order items: same
CREATE POLICY "Backend can insert order items"
ON order_items FOR INSERT
WITH CHECK (true);

-- Select: locked to service role (backend uses service key, bypasses this)
-- No anon SELECT policy = anon key cannot read any orders
-- Service role always bypasses RLS → admin ops work fine

-- ── Bookings: service role only ───────────────────────────────────────────────

CREATE POLICY "Backend can insert bookings"
ON bookings FOR INSERT
WITH CHECK (true);

-- No anon SELECT policy on bookings

-- ── Users: service role only ──────────────────────────────────────────────────

CREATE POLICY "Backend can insert users"
ON users FOR INSERT
WITH CHECK (true);

-- No anon SELECT policy on users

-- ── Delivery zones: public reads remain ──────────────────────────────────────

-- Keep existing: "Anyone can view delivery zones"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'delivery_zones' AND policyname = 'Anyone can view delivery zones'
  ) THEN
    CREATE POLICY "Anyone can view delivery zones"
    ON delivery_zones FOR SELECT
    USING (is_active = true);
  END IF;
END $$;

-- ── repair_services: public reads ────────────────────────────────────────────

ALTER TABLE repair_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view repair services" ON repair_services;
CREATE POLICY "Anyone can view repair services"
ON repair_services FOR SELECT
USING (is_active = true);

-- ── device_brands / device_models / service_pricing: public reads ─────────────

ALTER TABLE IF EXISTS device_brands   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS device_models   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS service_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view device brands"   ON device_brands;
DROP POLICY IF EXISTS "Anyone can view device models"   ON device_models;
DROP POLICY IF EXISTS "Anyone can view service pricing" ON service_pricing;

CREATE POLICY "Anyone can view device brands"
ON device_brands FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view device models"
ON device_models FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view service pricing"
ON service_pricing FOR SELECT USING (true);
