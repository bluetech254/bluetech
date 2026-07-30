-- Migration 011: Referral & Points System
-- Points rules:
--   Earn:   10% of order subtotal (rounded down) on delivery
--   Refer:  50 points when referred user places first order
--   Redeem: 1 point = KES 1, minimum 1000 points, delivery fee still charged

-- Add referral_code + points to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by   UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS points        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT TRUE;

-- Generate referral codes for existing users
UPDATE users SET referral_code = UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)) WHERE referral_code IS NULL;

-- Add points columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS user_id         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS referrer_id     UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_discount DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Points ledger — full audit trail
CREATE TABLE IF NOT EXISTS points_ledger (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points      INTEGER NOT NULL,                        -- positive = earn, negative = redeem
    type        VARCHAR(30) NOT NULL,                    -- 'order_earn' | 'referral_earn' | 'redemption' | 'admin_award'
    description TEXT,
    order_id    UUID REFERENCES orders(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
