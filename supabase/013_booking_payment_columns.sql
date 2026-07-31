-- Migration 013: Add payment columns to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status       VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS mpesa_receipt        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS checkout_request_id  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS user_id              UUID REFERENCES users(id);
