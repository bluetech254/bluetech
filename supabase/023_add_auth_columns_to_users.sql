-- Migration 023: Add missing authentication columns to users table
--
-- These columns are required by the auth service (auth/service.py) but were
-- never included in the original schema (001_schema.sql).
--
-- Column purposes:
--   password           — bcrypt hash of the user's password
--   is_verified        — TRUE once phone (or email) is verified
--   phone_verified     — TRUE once OTP verification is complete
--   email_verified     — TRUE once email link verification is complete
--   verification_code  — SHA-256 hash of the current OTP (never plain text)
--   otp_expires_at     — Expiry timestamp for the current OTP
--   last_login         — Timestamp of most recent successful login

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password           TEXT,
  ADD COLUMN IF NOT EXISTS is_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_code  TEXT,
  ADD COLUMN IF NOT EXISTS otp_expires_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login         TIMESTAMPTZ;

-- Index for fast verified-user lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_verified
ON users(phone_number, phone_verified);
