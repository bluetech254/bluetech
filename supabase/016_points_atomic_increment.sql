-- Migration 016: Points system hardening
-- 1. Atomic points increment function (eliminates read-then-write race condition)
-- 2. Document points_only as a valid payment_method value

-- Atomic increment/decrement for user points
-- Called by backend _add_points() instead of read→update
CREATE OR REPLACE FUNCTION increment_user_points(uid UUID, delta INTEGER)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE users SET points = points + delta WHERE id = uid;
$$;

-- Ensure points never go negative (guard at DB level)
ALTER TABLE users ADD CONSTRAINT points_non_negative CHECK (points >= 0);

-- Document points_only as valid payment method (no enum constraint, just a comment)
COMMENT ON COLUMN orders.payment_method IS
  'Valid values: mpesa | cash_on_delivery | points_only. points_only sets payment_status=paid immediately.';
