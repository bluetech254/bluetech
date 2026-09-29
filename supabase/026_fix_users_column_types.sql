-- Migration 026: Widen users table columns that are too short
--
-- verification_code and reset_code were VARCHAR(10) — too short for
-- SHA-256 hashes (64 chars). password was VARCHAR(255) — fine for
-- bcrypt but TEXT is cleaner and avoids future limit surprises.

ALTER TABLE users
  ALTER COLUMN verification_code TYPE TEXT,
  ALTER COLUMN reset_code        TYPE TEXT,
  ALTER COLUMN password          TYPE TEXT;
