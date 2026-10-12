#!/usr/bin/env python3
"""
setup_prod.py — BlueTech cPanel production activation script.

Run this on the cPanel server after every git pull:

    cd /home2/fixitblu/backend
    python3 setup_prod.py

What it does:
  1. Copies .env.production → .env  (prod DB, no Supabase, no M-Pesa)
  2. Verifies the PostgreSQL connection using the prod credentials
  3. Touches tmp/restart.txt to restart Passenger / the app

.env.production lives on the server only — it is NOT in git (gitignored).
It contains: DATABASE_TYPE=postgresql, DB_HOST, DB_NAME, DB_USER, DB_PASSWORD,
             JWT_SECRET, PAYSTACK keys, BLESSEDTEXTS key, AWS keys, CORS_ORIGINS.
"""

import os
import shutil
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE        = os.path.join(BASE_DIR, ".env")
ENV_PROD_FILE   = os.path.join(BASE_DIR, ".env.production")


def section(title: str) -> None:
    print(f"\n{'=' * 60}\n  {title}\n{'=' * 60}")


def ok(label: str, detail: str = "") -> None:
    print(f"  ✓  {label}" + (f"  —  {detail}" if detail else ""))


def fail(label: str, detail: str = "") -> None:
    print(f"  ✗  {label}" + (f"  —  {detail}" if detail else ""))


def load_env_file(path: str) -> dict[str, str]:
    """Parse a .env file into a dict."""
    values: dict[str, str] = {}
    with open(path) as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


# ── Step 1: Check .env.production exists ─────────────────────────────────────

section("1. Check .env.production")

if not os.path.exists(ENV_PROD_FILE):
    fail(".env.production NOT found", ENV_PROD_FILE)
    print("""
  This file lives on the server only (gitignored).
  Create it at /home2/fixitblu/backend/.env.production with:

    DATABASE_TYPE=postgresql
    DB_HOST=217.20.124.84
    DB_PORT=5432
    DB_NAME=fixitblu_prod_db
    DB_USER=fixitblu_prod_user
    DB_PASSWORD=<password>
    JWT_SECRET=<secret>
    PAYSTACK_SECRET_KEY=sk_live_...
    PAYSTACK_PUBLIC_KEY=pk_live_...
    ... (see .env.production.example)
""")
    sys.exit(1)

prod_env = load_env_file(ENV_PROD_FILE)
ok(".env.production found")

# Sanity-check: must be postgresql, must NOT have Supabase or M-Pesa
db_type = prod_env.get("DATABASE_TYPE", "").lower()
if db_type != "postgresql":
    fail(f"DATABASE_TYPE={db_type!r}", "must be 'postgresql' in prod")
    sys.exit(1)
ok("DATABASE_TYPE=postgresql")

if prod_env.get("SUPABASE_URL") or prod_env.get("SUPABASE_SERVICE_KEY"):
    fail("Supabase credentials found in .env.production — remove them")
    sys.exit(1)
ok("No Supabase credentials (correct)")

if prod_env.get("MPESA_CONSUMER_KEY"):
    fail("M-Pesa credentials found in .env.production — remove them")
    sys.exit(1)
ok("No M-Pesa credentials (correct)")

for key in ("DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET"):
    if not prod_env.get(key):
        fail(f"{key} is missing from .env.production")
        sys.exit(1)
ok("All required PostgreSQL credentials present")


# ── Step 2: Copy .env.production → .env ──────────────────────────────────────

section("2. Activate prod environment")

# Back up existing .env if it looks like a dev file
if os.path.exists(ENV_FILE):
    current = load_env_file(ENV_FILE)
    if current.get("DATABASE_TYPE", "").lower() == "supabase":
        backup = ENV_FILE + ".dev.bak"
        shutil.copy2(ENV_FILE, backup)
        ok(".env (dev) backed up", backup)

shutil.copy2(ENV_PROD_FILE, ENV_FILE)
ok(".env.production → .env", "prod credentials are now active")

# Lock down file permissions so other users can't read credentials
try:
    os.chmod(ENV_FILE, 0o600)
    ok(".env permissions set to 600")
except Exception as e:
    fail("Could not chmod .env", str(e))


# ── Step 3: Verify PostgreSQL connection ──────────────────────────────────────

section("3. PostgreSQL connection check")

try:
    import psycopg2
except ImportError:
    fail("psycopg2 not installed", "run: pip install psycopg2-binary")
    sys.exit(1)

try:
    conn = psycopg2.connect(
        host=prod_env["DB_HOST"],
        port=int(prod_env.get("DB_PORT", "5432")),
        dbname=prod_env["DB_NAME"],
        user=prod_env["DB_USER"],
        password=prod_env["DB_PASSWORD"],
        connect_timeout=10,
    )
    cur = conn.cursor()
    cur.execute("SELECT version()")
    pg_version = cur.fetchone()[0].split(",")[0]

    # Check tables exist
    cur.execute("""
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public'
    """)
    table_count = cur.fetchone()[0]

    conn.close()
    ok("Connected to PostgreSQL", pg_version)
    if table_count == 0:
        fail("No tables found", "run: psql < schema.sql  to create the schema first")
    else:
        ok(f"Schema present", f"{table_count} tables in public schema")

except Exception as e:
    fail("PostgreSQL connection failed", str(e))
    print("""
  Possible causes:
    - DB_HOST / DB_PORT is wrong
    - DB_USER or DB_PASSWORD is incorrect
    - PostgreSQL not accepting connections from this host
    - Database doesn't exist yet (create it in cPanel first)
""")
    sys.exit(1)


# ── Step 4: Restart Passenger ─────────────────────────────────────────────────

section("4. Restart app")

tmp_dir = os.path.join(BASE_DIR, "tmp")
os.makedirs(tmp_dir, exist_ok=True)
restart_file = os.path.join(tmp_dir, "restart.txt")

try:
    open(restart_file, "w").close()
    ok("Touched tmp/restart.txt — Passenger will restart on next request")
except Exception as e:
    fail("Could not touch restart.txt", str(e))
    print("   Run manually: touch /home2/fixitblu/backend/tmp/restart.txt")


# ── Done ──────────────────────────────────────────────────────────────────────

print(f"""
{'=' * 60}
  ✓  Production activation complete.

  Active config:
    DATABASE_TYPE : postgresql
    DB_HOST       : {prod_env['DB_HOST']}
    DB_NAME       : {prod_env['DB_NAME']}
    DEBUG         : {prod_env.get('DEBUG', 'false')}
    CORS_ORIGINS  : {prod_env.get('CORS_ORIGINS', '(not set)')}

  Test:
    curl https://api.fixit-bluetechnology.co.ke/health
    curl https://api.fixit-bluetechnology.co.ke/health/db
{'=' * 60}
""")
