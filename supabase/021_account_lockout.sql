-- Migration 021: Add account lockout columns to users table
--
-- Supports: 5 failed login attempts → 15 minute lockout
-- failed_login_attempts: incremented on each failed login, reset on success
-- locked_until: ISO timestamp, NULL means not locked

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL;

-- Index for lockout check (only rows that are currently locked)
CREATE INDEX IF NOT EXISTS idx_users_locked_until
ON users(locked_until)
WHERE locked_until IS NOT NULL;
