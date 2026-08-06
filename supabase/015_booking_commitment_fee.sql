-- Migration 015: Commitment fee tracking for repair bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS commitment_fee              NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS commitment_payment_status   VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS commitment_checkout_id      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS commitment_receipt          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS final_payment_status        VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS final_checkout_id           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS final_receipt               VARCHAR(50);
