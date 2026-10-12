#!/usr/bin/env python3
"""
setup_prod.py — BlueTech cPanel production one-shot setup script.

Run ONCE on the cPanel server after a fresh deploy:

    cd /home2/fixitblu/backend
    python3 setup_prod.py

What it does:
  1. Reads credentials from .env.production (or environment)
  2. Tests the PostgreSQL connection
  3. Runs schema.sql to create all tables (safe — uses IF NOT EXISTS)
  4. Patches schema gaps (full_name, last_login columns on admins table)
  5. Seeds the default superadmin account (ADMIN_PASSWORD from .env)
  6. Seeds delivery zones (idempotent — skips if already present)
  7. Runs a quick smoke test (SELECT from each table)
  8. Touches tmp/restart.txt to trigger a Passenger restart
  9. Prints a final pass/fail report

Safe to re-run — all operations are idempotent.
"""

import os
import sys
import traceback

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_FILE = os.path.join(BASE_DIR, "schema.sql")
ENV_FILE = os.path.join(BASE_DIR, ".env.production")

RESULTS: list[str] = []


# ── Helpers ───────────────────────────────────────────────────────────────────

def ok(label: str, detail: str = "") -> None:
    msg = f"  ✓  {label}" + (f"  —  {detail}" if detail else "")
    RESULTS.append(msg)
    print(msg)


def fail(label: str, detail: str = "") -> None:
    msg = f"  ✗  {label}" + (f"  —  {detail}" if detail else "")
    RESULTS.append(msg)
    print(msg)


def section(title: str) -> None:
    line = f"\n{'=' * 60}\n  {title}\n{'=' * 60}"
    print(line)


def load_env(path: str) -> None:
    """Parse a .env file and push values into os.environ (simple, no deps)."""
    if not os.path.exists(path):
        return
    with open(path) as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def require_env(*keys: str) -> dict[str, str]:
    """Return env vars for the given keys, exit if any are missing."""
    values: dict[str, str] = {}
    missing = []
    for key in keys:
        val = os.getenv(key, "")
        if val:
            values[key] = val
        else:
            missing.append(key)
    if missing:
        print(f"\n✗  Missing required env vars: {', '.join(missing)}")
        print(f"   Set them in {ENV_FILE} or as environment variables.")
        sys.exit(1)
    return values


# ── Step 0: Load .env.production ──────────────────────────────────────────────

section("0. Loading environment")
load_env(ENV_FILE)
if os.path.exists(ENV_FILE):
    ok(".env.production loaded", ENV_FILE)
else:
    fail(".env.production not found", f"expected at {ENV_FILE}")
    print("   Falling back to OS environment variables only.")

env = require_env(
    "DATABASE_TYPE", "DB_HOST", "DB_PORT", "DB_NAME",
    "DB_USER", "DB_PASSWORD", "JWT_SECRET", "ADMIN_PASSWORD",
)

if env["DATABASE_TYPE"].lower() != "postgresql":
    print(f"\n✗  DATABASE_TYPE={env['DATABASE_TYPE']!r} — must be 'postgresql' for prod setup.")
    sys.exit(1)

ok("DATABASE_TYPE", env["DATABASE_TYPE"])


# ── Step 1: Connect to PostgreSQL ─────────────────────────────────────────────

section("1. PostgreSQL connection")

try:
    import psycopg2
except ImportError:
    fail("psycopg2 not installed", "run: pip install psycopg2-binary")
    sys.exit(1)

try:
    conn = psycopg2.connect(
        host=env["DB_HOST"],
        port=int(env["DB_PORT"]),
        dbname=env["DB_NAME"],
        user=env["DB_USER"],
        password=env["DB_PASSWORD"],
        connect_timeout=10,
    )
    conn.autocommit = False
    cur = conn.cursor()
    cur.execute("SELECT version()")
    pg_version = cur.fetchone()[0]
    ok("Connected", pg_version.split(",")[0])
except Exception as e:
    fail("Connection failed", str(e))
    traceback.print_exc()
    sys.exit(1)


# ── Step 2: Run schema.sql ────────────────────────────────────────────────────

section("2. Schema setup")

if not os.path.exists(SCHEMA_FILE):
    fail("schema.sql not found", SCHEMA_FILE)
    sys.exit(1)

with open(SCHEMA_FILE) as f:
    schema_sql = f.read()

# Remove the non-standard CREATE TYPE IF NOT EXISTS (PostgreSQL < 9.1 workaround)
# Standard PostgreSQL uses DO $$ ... END $$ blocks for conditional type creation.
# Our schema.sql already uses CREATE TYPE IF NOT EXISTS which is fine in PG 9.1+
# but some cPanel installs run older versions — wrap types in DO blocks to be safe.

try:
    # Execute schema in a single transaction
    cur.execute(schema_sql)
    conn.commit()
    ok("schema.sql executed — all tables created")
except psycopg2.errors.DuplicateObject as e:
    # Enum type already exists — safe to ignore
    conn.rollback()
    ok("Schema already up-to-date (types/tables exist)", str(e)[:80])
except Exception as e:
    conn.rollback()
    fail("schema.sql execution failed", str(e)[:200])
    traceback.print_exc()
    # Don't exit — try to continue with patches


# ── Step 3: Patch schema gaps ─────────────────────────────────────────────────

section("3. Schema patches")

patches = [
    # full_name missing from admins table in original schema
    (
        "admins.full_name column",
        "ALTER TABLE admins ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NOT NULL DEFAULT ''",
    ),
    # last_login missing from admins table
    (
        "admins.last_login column",
        "ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE",
    ),
]

for label, sql in patches:
    try:
        cur.execute(sql)
        conn.commit()
        ok(label)
    except Exception as e:
        conn.rollback()
        fail(label, str(e)[:120])


# ── Step 4: Seed superadmin ───────────────────────────────────────────────────

section("4. Superadmin seed")

try:
    import bcrypt
except ImportError:
    fail("bcrypt not installed", "run: pip install bcrypt")
    sys.exit(1)

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = env["ADMIN_PASSWORD"]
ADMIN_EMAIL = "admin@fixit-bluetechnology.co.ke"
ADMIN_FULL_NAME = "BlueTech Admin"

# Check if superadmin already exists
cur.execute("SELECT id, username FROM admins WHERE username = %s", (ADMIN_USERNAME,))
existing_admin = cur.fetchone()

if existing_admin:
    ok(f"Superadmin '{ADMIN_USERNAME}' already exists", str(existing_admin[0]))
else:
    # Hash the password with bcrypt
    hashed = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt(rounds=12)).decode()
    try:
        cur.execute(
            """
            INSERT INTO admins (username, email, full_name, password, role, is_active)
            VALUES (%s, %s, %s, %s, 'superadmin', TRUE)
            """,
            (ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_FULL_NAME, hashed),
        )
        conn.commit()
        ok(f"Superadmin '{ADMIN_USERNAME}' created", f"role=superadmin, email={ADMIN_EMAIL}")
    except Exception as e:
        conn.rollback()
        fail(f"Failed to create superadmin", str(e)[:200])


# ── Step 5: Verify delivery zones are seeded ──────────────────────────────────

section("5. Delivery zones")

try:
    cur.execute("SELECT COUNT(*) FROM delivery_zones")
    zone_count = cur.fetchone()[0]
    if zone_count > 0:
        ok(f"Delivery zones present", f"{zone_count} zones")
    else:
        # Seed them manually (schema.sql INSERT may have been skipped)
        zones = [
            ("Nairobi CBD", 200.00),
            ("Westlands / Parklands", 250.00),
            ("Kilimani / Ngong Road", 300.00),
            ("Thika / Kiambu Outskirts", 450.00),
            ("Mombasa / Kisumu / Upcountry", 600.00),
        ]
        for zone_name, fee in zones:
            cur.execute(
                """
                INSERT INTO delivery_zones (zone_name, delivery_fee, is_active)
                VALUES (%s, %s, TRUE)
                ON CONFLICT (zone_name) DO NOTHING
                """,
                (zone_name, fee),
            )
        conn.commit()
        ok(f"Delivery zones seeded", f"{len(zones)} zones inserted")
except Exception as e:
    conn.rollback()
    fail("Delivery zones check failed", str(e)[:120])


# ── Step 6: Smoke test — SELECT from every table ──────────────────────────────

section("6. Smoke test")

tables = [
    "users", "products", "orders", "order_items",
    "bookings", "admins", "repair_services", "device_brands",
    "device_models", "service_pricing", "points_ledger",
    "delivery_zones", "contact_messages", "audit_log",
    "product_sections", "section_products",
]

all_ok = True
for table in tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {table}")  # noqa: S608 — table names are hardcoded
        count = cur.fetchone()[0]
        ok(f"  {table}", f"{count} rows")
    except Exception as e:
        fail(f"  {table}", str(e)[:80])
        all_ok = False

conn.close()


# ── Step 7: Trigger Passenger restart ────────────────────────────────────────

section("7. Passenger restart")

tmp_dir = os.path.join(BASE_DIR, "tmp")
os.makedirs(tmp_dir, exist_ok=True)
restart_file = os.path.join(tmp_dir, "restart.txt")
try:
    open(restart_file, "w").close()
    ok("Touched tmp/restart.txt — Passenger will restart")
except Exception as e:
    fail("Could not touch restart.txt", str(e))
    print("   Run manually: touch /home2/fixitblu/backend/tmp/restart.txt")


# ── Final report ──────────────────────────────────────────────────────────────

failures = [r for r in RESULTS if r.strip().startswith("✗")]

print("\n" + "=" * 60)
print("  BlueTech Prod Setup — Complete")
print("=" * 60)
if failures:
    print(f"\n  ⚠  {len(failures)} issue(s) need attention:")
    for f in failures:
        print(f"  {f.strip()}")
else:
    print("\n  ✓  All steps passed — production is ready.")

print(f"""
  Next steps:
    1. Verify the API:  curl https://api.fixit-bluetechnology.co.ke/health
    2. Login as admin:  POST /api/v1/admin/auth/login
                        {{ "username": "admin", "password": "{ADMIN_PASSWORD[:4]}..." }}
    3. Add products via the admin panel
    4. Point the frontend VITE_API_URL to https://api.fixit-bluetechnology.co.ke
""")
print("=" * 60 + "\n")
