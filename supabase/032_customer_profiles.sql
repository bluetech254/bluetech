-- Migration 032: Customer 360 / CRM (Phase 3)
--
-- A unified customer identity keyed by NORMALIZED phone (2547XXXXXXXX),
-- auto-populated by AFTER INSERT triggers on the tables that capture
-- customer data: orders, bookings, contact_messages, daily_leads.
--
-- The website already creates those rows (orders/bookings via the backend
-- API, contact_messages via the contact form), so every website customer is
-- logged automatically with no app-code changes. Aggregates (orders count,
-- spend, etc.) are computed at read time by the admin API, not stored.
--
-- Idempotent. No RLS (backend connects as DB superuser).

CREATE TABLE IF NOT EXISTS customer_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       TEXT NOT NULL UNIQUE,          -- normalized: 2547XXXXXXXX
    email       TEXT,
    full_name   TEXT,
    first_seen  TIMESTAMPTZ,
    last_seen   TIMESTAMPTZ,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone ON customer_profiles (phone);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_name  ON customer_profiles (full_name);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON customer_profiles (email);

-- ── Phone normalization (Kenya -> 2547XXXXXXXX) ───────────────────────────────
CREATE OR REPLACE FUNCTION normalize_phone(raw text) RETURNS text AS $$
DECLARE
  d text;
BEGIN
  IF raw IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(raw, '[^0-9]', '', 'g');
  IF d = '' THEN RETURN NULL; END IF;
  IF d LIKE '254%' THEN d := substring(d FROM 4); END IF;   -- strip 254
  IF d LIKE '0%'   THEN d := substring(d FROM 2); END IF;    -- strip leading 0
  IF length(d) = 10 AND d LIKE '0%' THEN d := substring(d FROM 2); END IF;
  IF length(d) <> 9 THEN RETURN NULL; END IF;               -- must be 9 digits (7xxxxxxxx)
  RETURN '254' || d;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── Upsert a customer profile from a phone/email/name ────────────────────────
CREATE OR REPLACE FUNCTION upsert_customer_profile(p_phone text, p_email text, p_name text)
RETURNS void AS $$
DECLARE
  norm text;
BEGIN
  norm := normalize_phone(p_phone);
  IF norm IS NULL THEN RETURN; END IF;

  INSERT INTO customer_profiles (phone, email, full_name, first_seen, last_seen)
  VALUES (norm, p_email, p_name, now(), now())
  ON CONFLICT (phone) DO UPDATE
    SET last_seen  = now(),
        updated_at = now(),
        full_name  = COALESCE(NULLIF(customer_profiles.full_name, ''), EXCLUDED.full_name),
        email      = COALESCE(NULLIF(customer_profiles.email, ''), EXCLUDED.email);
END;
$$ LANGUAGE plpgsql;

-- ── Per-table AFTER INSERT triggers ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_customer_from_order() RETURNS trigger AS $$
BEGIN
  PERFORM upsert_customer_profile(NEW.phone_number, NEW.email, NEW.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS customer_from_order ON orders;
CREATE TRIGGER customer_from_order AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_customer_from_order();

CREATE OR REPLACE FUNCTION trg_customer_from_booking() RETURNS trigger AS $$
BEGIN
  PERFORM upsert_customer_profile(NEW.phone_number, NULL, NEW.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS customer_from_booking ON bookings;
CREATE TRIGGER customer_from_booking AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION trg_customer_from_booking();

CREATE OR REPLACE FUNCTION trg_customer_from_contact() RETURNS trigger AS $$
BEGIN
  PERFORM upsert_customer_profile(NEW.phone, NEW.email, NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS customer_from_contact ON contact_messages;
CREATE TRIGGER customer_from_contact AFTER INSERT ON contact_messages
  FOR EACH ROW EXECUTE FUNCTION trg_customer_from_contact();

CREATE OR REPLACE FUNCTION trg_customer_from_lead() RETURNS trigger AS $$
BEGIN
  PERFORM upsert_customer_profile(NEW.phone, NULL, NEW.customer_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS customer_from_lead ON daily_leads;
CREATE TRIGGER customer_from_lead AFTER INSERT ON daily_leads
  FOR EACH ROW EXECUTE FUNCTION trg_customer_from_lead();
