#!/usr/bin/env python3
"""
migrate_prod.py — Comprehensive production PostgreSQL migration.

Applies every column and table addition that was rolled out incrementally
via Supabase migrations (010 → 027) but may be missing from the live
cPanel PostgreSQL database.

Safe to run multiple times — every statement uses IF NOT EXISTS or
checks information_schema before altering.

Run on the cPanel server:
    python3 migrate_prod.py

What it covers (in order):
  orders      — points_discount, points_redeemed, payment_receipt,
                payment_reference, referrer_id
                (drops old checkout_request_id / mpesa_receipt if present)
  bookings    — payment_status, user_id, commitment_fee,
                commitment_payment_status, commitment_receipt,
                commitment_payment_reference, final_payment_status,
                final_receipt, final_payment_reference, internal_notes
                (drops old commitment_checkout_id / final_checkout_id,
                 mpesa_receipt, checkout_request_id if present)
  users       — referral_code, referred_by, points, is_active,
                failed_login_attempts, locked_until, last_login,
                password, is_verified, phone_verified, email_verified,
                verification_code, otp_expires_at, reset_code,
                reset_code_expires  (+ widens text columns to TEXT)
  products    — low_stock_threshold, is_featured, is_new, is_bestseller,
                is_flash_sale, is_discounted, is_clearance, is_weekly_deal,
                is_new_arrival, is_best_seller, is_trending,
                is_editors_choice, is_back_in_stock, is_refurbished,
                is_pre_order, is_coming_soon
  admins      — account_locked, lockout_expires_at, failed_login_attempts,
                full_name, email
  points_ledger table (created if missing)
  admin_audit_log table (created if missing)
  product_sections / section_products tables (created if missing)
  contact_messages table (created if missing)
  device_brands / device_models / service_pricing tables (created if missing)
  indexes     — all missing indexes
"""

import os
import sys
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Load .env ──────────────────────────────────────────────────────────────────
def _load_env(path):
    if not os.path.exists(path):
        return
    with open(path) as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v

_load_env(os.path.join(BASE_DIR, ".env"))

# ── psycopg2 ──────────────────────────────────────────────────────────────────
try:
    import psycopg2
except ImportError:
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"], check=True)
    import psycopg2

SEP = "=" * 62

def ok(msg):   print(f"  ✓  {msg}")
def fail(msg): print(f"  ✗  {msg}")
def info(msg): print(f"  →  {msg}")
def section(title): print(f"\n{SEP}\n  {title}\n{SEP}\n")

# ── Connect ────────────────────────────────────────────────────────────────────
section("Connecting to PostgreSQL")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "")
DB_USER = os.getenv("DB_USER", "")
DB_PASS = os.getenv("DB_PASSWORD", "")

conn = None
for host in [DB_HOST, "/var/run/postgresql", "localhost", "127.0.0.1"]:
    try:
        conn = psycopg2.connect(
            host=host, port=DB_PORT,
            dbname=DB_NAME, user=DB_USER, password=DB_PASS,
            connect_timeout=10,
        )
        ok(f"Connected  host={host!r}  db={DB_NAME!r}")
        break
    except Exception as e:
        info(f"trying {host!r} … {str(e)[:70]}")

if not conn:
    fail("Could not connect to database — check DB_HOST / DB_NAME / DB_USER / DB_PASSWORD in .env")
    sys.exit(1)

cur = conn.cursor()

# ── Helper ─────────────────────────────────────────────────────────────────────
total_ok   = 0
total_fail = 0

def run(label, sql):
    global total_ok, total_fail
    try:
        cur.execute(sql)
        conn.commit()
        ok(label)
        total_ok += 1
    except Exception as e:
        conn.rollback()
        msg = str(e).strip().split("\n")[0][:90]
        # "already exists" errors are harmless — don't count as failures
        if "already exists" in msg.lower() or "duplicate" in msg.lower():
            ok(f"{label}  (already exists — skipped)")
            total_ok += 1
        else:
            fail(f"{label}  →  {msg}")
            total_fail += 1

# ══════════════════════════════════════════════════════════════════════════════
# 1. ORDERS TABLE
# ══════════════════════════════════════════════════════════════════════════════
section("1. orders table")

run("orders.points_discount",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_discount DECIMAL(12,2) NOT NULL DEFAULT 0")

run("orders.points_redeemed",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0")

run("orders.referrer_id",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES users(id) ON DELETE SET NULL")

# Paystack migration (022): rename mpesa columns → generic names
run("orders.payment_reference (new)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference TEXT")

run("orders.payment_receipt (new)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_receipt TEXT")

# Copy old mpesa data if columns still exist, then drop them
run("orders: copy checkout_request_id → payment_reference",
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='orders' AND column_name='checkout_request_id'
        ) THEN
            UPDATE orders SET payment_reference = checkout_request_id
            WHERE checkout_request_id IS NOT NULL AND payment_reference IS NULL;
        END IF;
    END $$
    """)

run("orders: copy mpesa_receipt → payment_receipt",
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='orders' AND column_name='mpesa_receipt'
        ) THEN
            UPDATE orders SET payment_receipt = mpesa_receipt
            WHERE mpesa_receipt IS NOT NULL AND payment_receipt IS NULL;
        END IF;
    END $$
    """)

run("orders: drop checkout_request_id (old mpesa column)",
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='orders' AND column_name='checkout_request_id'
        ) THEN
            ALTER TABLE orders DROP COLUMN checkout_request_id;
        END IF;
    END $$
    """)

run("orders: drop mpesa_receipt (old mpesa column)",
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='orders' AND column_name='mpesa_receipt'
        ) THEN
            ALTER TABLE orders DROP COLUMN mpesa_receipt;
        END IF;
    END $$
    """)

run("orders: update payment_method mpesa → paystack",
    "UPDATE orders SET payment_method = 'paystack' WHERE payment_method = 'mpesa'")

# payment_status enum — prod may have started as VARCHAR or old enum
# Ensure the payment_status type includes 'pending' and 'failed' and 'refunded'
run("payment_status enum: add 'pending' value",
    """
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
            BEGIN
                ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'pending';
            EXCEPTION WHEN others THEN NULL; END;
            BEGIN
                ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'failed';
            EXCEPTION WHEN others THEN NULL; END;
            BEGIN
                ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'refunded';
            EXCEPTION WHEN others THEN NULL; END;
        END IF;
    END $$
    """)

# ══════════════════════════════════════════════════════════════════════════════
# 2. BOOKINGS TABLE
# ══════════════════════════════════════════════════════════════════════════════
section("2. bookings table")

run("bookings.payment_status",
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'")

run("bookings.user_id",
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL")

run("bookings.commitment_fee",
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commitment_fee NUMERIC(10,2)")

run("bookings.commitment_payment_status",
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commitment_payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'")

run("bookings.commitment_receipt",
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commitment_receipt VARCHAR(100)")

run("bookings.commitment_payment_reference",
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commitment_payment_reference TEXT")

run("bookings.final_payment_status",
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'")

run("bookings.final_receipt",
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_receipt VARCHAR(100)")

run("bookings.final_payment_reference",
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_payment_reference TEXT")

run("bookings.internal_notes",
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS internal_notes TEXT")

# Copy and drop old mpesa columns on bookings
run("bookings: copy commitment_checkout_id → commitment_payment_reference",
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='bookings' AND column_name='commitment_checkout_id'
        ) THEN
            UPDATE bookings SET commitment_payment_reference = commitment_checkout_id
            WHERE commitment_checkout_id IS NOT NULL AND commitment_payment_reference IS NULL;
            ALTER TABLE bookings DROP COLUMN commitment_checkout_id;
        END IF;
    END $$
    """)

run("bookings: copy final_checkout_id → final_payment_reference",
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='bookings' AND column_name='final_checkout_id'
        ) THEN
            UPDATE bookings SET final_payment_reference = final_checkout_id
            WHERE final_checkout_id IS NOT NULL AND final_payment_reference IS NULL;
            ALTER TABLE bookings DROP COLUMN final_checkout_id;
        END IF;
    END $$
    """)

run("bookings: drop mpesa_receipt",
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='bookings' AND column_name='mpesa_receipt'
        ) THEN
            ALTER TABLE bookings DROP COLUMN mpesa_receipt;
        END IF;
    END $$
    """)

run("bookings: drop checkout_request_id",
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='bookings' AND column_name='checkout_request_id'
        ) THEN
            ALTER TABLE bookings DROP COLUMN checkout_request_id;
        END IF;
    END $$
    """)

# ══════════════════════════════════════════════════════════════════════════════
# 3. USERS TABLE
# ══════════════════════════════════════════════════════════════════════════════
section("3. users table")

run("users.referral_code",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE")

run("users.referred_by",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id) ON DELETE SET NULL")

run("users.points",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0")

run("users.is_active",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE")

run("users.failed_login_attempts",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0")

run("users.locked_until",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL")

run("users.last_login",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ")

run("users.password",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT")

run("users.is_verified",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE")

run("users.phone_verified",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE")

run("users.email_verified",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE")

run("users.verification_code",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code TEXT")

run("users.otp_expires_at",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ")

run("users.reset_code",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code TEXT")

run("users.reset_code_expires",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires TIMESTAMPTZ")

# Widen text columns that may have been created as VARCHAR
run("users: widen verification_code → TEXT",
    "ALTER TABLE users ALTER COLUMN verification_code TYPE TEXT")

run("users: widen reset_code → TEXT",
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='users' AND column_name='reset_code'
        ) THEN
            ALTER TABLE users ALTER COLUMN reset_code TYPE TEXT;
        END IF;
    END $$
    """)

run("users: widen password → TEXT",
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='users' AND column_name='password'
        ) THEN
            ALTER TABLE users ALTER COLUMN password TYPE TEXT;
        END IF;
    END $$
    """)

# Backfill referral codes for users who don't have one
run("users: backfill missing referral_codes",
    """
    UPDATE users
    SET referral_code = UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
    WHERE referral_code IS NULL
    """)

# ══════════════════════════════════════════════════════════════════════════════
# 4. PRODUCTS TABLE
# ══════════════════════════════════════════════════════════════════════════════
section("4. products table")

run("products.low_stock_threshold",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5")

run("products.is_featured",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE")

run("products.is_new",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT FALSE")

run("products.is_bestseller",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN NOT NULL DEFAULT FALSE")

run("products.category",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100)")

# Deal flags (add_product_flags.sql)
for col in [
    "is_flash_sale", "is_discounted", "is_clearance", "is_weekly_deal",
    "is_new_arrival", "is_best_seller", "is_trending", "is_editors_choice",
    "is_back_in_stock", "is_refurbished", "is_pre_order", "is_coming_soon",
]:
    run(f"products.{col}",
        f"ALTER TABLE products ADD COLUMN IF NOT EXISTS {col} BOOLEAN NOT NULL DEFAULT FALSE")

# ══════════════════════════════════════════════════════════════════════════════
# 5. ADMINS TABLE
# ══════════════════════════════════════════════════════════════════════════════
section("5. admins table")

run("admins.full_name",
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NOT NULL DEFAULT ''")

run("admins.email",
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS email VARCHAR(255)")

run("admins.account_locked",
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS account_locked BOOLEAN NOT NULL DEFAULT FALSE")

run("admins.lockout_expires_at",
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS lockout_expires_at TIMESTAMPTZ")

run("admins.failed_login_attempts",
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0")

# Ensure admin_role enum has superadmin
run("admin_role enum: ensure superadmin value",
    """
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
            BEGIN
                ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'superadmin';
            EXCEPTION WHEN others THEN NULL; END;
        END IF;
    END $$
    """)

# ══════════════════════════════════════════════════════════════════════════════
# 6. POINTS LEDGER TABLE
# ══════════════════════════════════════════════════════════════════════════════
section("6. points_ledger table")

run("create points_ledger",
    """
    CREATE TABLE IF NOT EXISTS points_ledger (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        points      INTEGER NOT NULL,
        type        VARCHAR(50) NOT NULL,
        description TEXT,
        order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
    )
    """)

# Add order_id if table existed without it
run("points_ledger.order_id",
    "ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL")

# ══════════════════════════════════════════════════════════════════════════════
# 7. ADMIN AUDIT LOG TABLE
# ══════════════════════════════════════════════════════════════════════════════
section("7. admin_audit_log table")

run("create admin_audit_log",
    """
    CREATE TABLE IF NOT EXISTS admin_audit_log (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id    UUID,
        admin_name  VARCHAR(100),
        action      VARCHAR(100) NOT NULL,
        target      VARCHAR(100),
        detail      JSONB,
        created_at  TIMESTAMPTZ DEFAULT NOW()
    )
    """)

# ══════════════════════════════════════════════════════════════════════════════
# 8. PRODUCT SECTIONS
# ══════════════════════════════════════════════════════════════════════════════
section("8. product_sections / section_products tables")

run("create product_sections",
    """
    CREATE TABLE IF NOT EXISTS product_sections (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(100) UNIQUE NOT NULL,
        display_order INTEGER,
        is_active     BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
    """)

run("create section_products",
    """
    CREATE TABLE IF NOT EXISTS section_products (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        section_id    UUID NOT NULL REFERENCES product_sections(id) ON DELETE CASCADE,
        product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        display_order INTEGER,
        created_at    TIMESTAMPTZ DEFAULT NOW()
    )
    """)

# ══════════════════════════════════════════════════════════════════════════════
# 9. CONTACT MESSAGES
# ══════════════════════════════════════════════════════════════════════════════
section("9. contact_messages table")

run("create contact_messages",
    """
    CREATE TABLE IF NOT EXISTS contact_messages (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) NOT NULL,
        phone      VARCHAR(20),
        subject    VARCHAR(255) NOT NULL,
        message    TEXT NOT NULL,
        is_read    BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """)

# ══════════════════════════════════════════════════════════════════════════════
# 10. DEVICE BRANDS / MODELS / SERVICE PRICING
# ══════════════════════════════════════════════════════════════════════════════
section("10. device_brands / device_models / service_pricing tables")

run("create device_brands",
    """
    CREATE TABLE IF NOT EXISTS device_brands (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(100) NOT NULL,
        device_type VARCHAR(50) NOT NULL,
        country     VARCHAR(100),
        is_popular  BOOLEAN DEFAULT FALSE,
        logo_url    VARCHAR(512),
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
    """)

run("create device_models",
    """
    CREATE TABLE IF NOT EXISTS device_models (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_id     UUID NOT NULL REFERENCES device_brands(id) ON DELETE CASCADE,
        name         VARCHAR(100) NOT NULL,
        device_type  VARCHAR(50) NOT NULL,
        release_year INTEGER,
        is_active    BOOLEAN DEFAULT TRUE,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
    """)

run("create service_pricing",
    """
    CREATE TABLE IF NOT EXISTS service_pricing (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id      UUID NOT NULL REFERENCES repair_services(id) ON DELETE CASCADE,
        device_model_id UUID NOT NULL REFERENCES device_models(id) ON DELETE CASCADE,
        price           DECIMAL(12,2) NOT NULL,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
    """)

# ══════════════════════════════════════════════════════════════════════════════
# 11. INDEXES
# ══════════════════════════════════════════════════════════════════════════════
section("11. indexes")

indexes = [
    ("idx_users_referral_code",       "CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)"),
    ("idx_users_referred_by",         "CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by)"),
    ("idx_users_locked_until",        "CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL"),
    ("idx_users_phone_verified",      "CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_number, phone_verified)"),
    ("idx_orders_payment_status",     "CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)"),
    ("idx_orders_user_id",            "CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)"),
    ("idx_orders_created_at",         "CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)"),
    ("idx_orders_payment_reference",  "CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders(payment_reference) WHERE payment_reference IS NOT NULL"),
    ("idx_bookings_user_id",          "CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)"),
    ("idx_bookings_created_at",       "CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at)"),
    ("idx_bookings_commitment_ref",   "CREATE INDEX IF NOT EXISTS idx_bookings_commitment_payment_reference ON bookings(commitment_payment_reference) WHERE commitment_payment_reference IS NOT NULL"),
    ("idx_bookings_final_ref",        "CREATE INDEX IF NOT EXISTS idx_bookings_final_payment_reference ON bookings(final_payment_reference) WHERE final_payment_reference IS NOT NULL"),
    ("idx_points_ledger_user",        "CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id)"),
    ("idx_points_ledger_created_at",  "CREATE INDEX IF NOT EXISTS idx_points_ledger_created_at ON points_ledger(created_at)"),
    ("idx_audit_admin",               "CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id)"),
    ("idx_audit_created",             "CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC)"),
    ("idx_products_featured",         "CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured)"),
    ("idx_products_category",         "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)"),
    ("idx_section_products_section",  "CREATE INDEX IF NOT EXISTS idx_section_products_section ON section_products(section_id)"),
    ("idx_section_products_product",  "CREATE INDEX IF NOT EXISTS idx_section_products_product ON section_products(product_id)"),
    ("idx_brands_active",             "CREATE INDEX IF NOT EXISTS idx_brands_active ON device_brands(is_active)"),
    ("idx_brands_device_type",        "CREATE INDEX IF NOT EXISTS idx_brands_device_type ON device_brands(device_type)"),
    ("idx_models_brand",              "CREATE INDEX IF NOT EXISTS idx_models_brand ON device_models(brand_id)"),
    ("idx_models_active",             "CREATE INDEX IF NOT EXISTS idx_models_active ON device_models(is_active)"),
    ("idx_service_pricing_service",   "CREATE INDEX IF NOT EXISTS idx_service_pricing_service ON service_pricing(service_id)"),
    ("idx_service_pricing_model",     "CREATE INDEX IF NOT EXISTS idx_service_pricing_device_model ON service_pricing(device_model_id)"),
]

for label, sql in indexes:
    run(label, sql)

# ══════════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
cur.close()
conn.close()

section(f"Done  —  {total_ok} succeeded  |  {total_fail} failed")

if total_fail > 0:
    print("  Review the ✗ items above and fix manually if needed.")
else:
    print("  All migrations applied successfully.")

# Touch Passenger restart file
tmp_dir = os.path.join(BASE_DIR, "tmp")
os.makedirs(tmp_dir, exist_ok=True)
restart_file = os.path.join(tmp_dir, "restart.txt")
try:
    with open(restart_file, "w") as f:
        f.write(str(time.time()))
    ok("Touched tmp/restart.txt — Passenger will restart the app")
except Exception as e:
    info(f"Could not touch restart.txt: {e}")

print(f"""
{SEP}
  Next steps:
    1. Verify app is responding:
       curl https://api.fixit-bluetechnology.co.ke/health
    2. Test order creation from the frontend
    3. Test payment flow (Paystack)
{SEP}
""")
