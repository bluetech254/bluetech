-- Migration 022: Replace M-Pesa columns with Paystack equivalents
--
-- Orders table:
--   checkout_request_id   → payment_reference  (Paystack transaction reference)
--   mpesa_receipt         → payment_receipt     (Paystack receipt / reference)
--   payment_method enum   → allow 'paystack'    (was 'mpesa')
--
-- Bookings table:
--   commitment_checkout_id       → commitment_payment_reference
--   final_checkout_id            → final_payment_reference
--   (commitment_receipt and final_receipt column names stay the same — already generic)


-- ── Orders ────────────────────────────────────────────────────────────────────

-- Add new columns
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_receipt   TEXT;

-- Copy existing data
UPDATE orders SET payment_reference = checkout_request_id WHERE checkout_request_id IS NOT NULL;
UPDATE orders SET payment_receipt   = mpesa_receipt        WHERE mpesa_receipt IS NOT NULL;

-- Update payment_method values
UPDATE orders SET payment_method = 'paystack' WHERE payment_method = 'mpesa';

-- Drop old columns (safe once data is migrated)
ALTER TABLE orders
  DROP COLUMN IF EXISTS checkout_request_id,
  DROP COLUMN IF EXISTS mpesa_receipt;


-- ── Bookings ──────────────────────────────────────────────────────────────────

-- Add new columns
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS commitment_payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS final_payment_reference      TEXT;

-- Copy existing data
UPDATE bookings
  SET commitment_payment_reference = commitment_checkout_id
  WHERE commitment_checkout_id IS NOT NULL;

UPDATE bookings
  SET final_payment_reference = final_checkout_id
  WHERE final_checkout_id IS NOT NULL;

-- Drop old columns
ALTER TABLE bookings
  DROP COLUMN IF EXISTS commitment_checkout_id,
  DROP COLUMN IF EXISTS final_checkout_id;

-- Also drop old mpesa_receipt column on bookings if it exists
-- (commitment_receipt and final_receipt are kept — they are already generic names)
ALTER TABLE bookings
  DROP COLUMN IF EXISTS mpesa_receipt,
  DROP COLUMN IF EXISTS checkout_request_id;


-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Drop old index on checkout_request_id
DROP INDEX IF EXISTS idx_orders_checkout_request_id;

-- New indexes on payment_reference columns
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference
  ON orders(payment_reference)
  WHERE payment_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_commitment_payment_reference
  ON bookings(commitment_payment_reference)
  WHERE commitment_payment_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_final_payment_reference
  ON bookings(final_payment_reference)
  WHERE final_payment_reference IS NOT NULL;
