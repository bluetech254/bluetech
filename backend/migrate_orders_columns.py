#!/usr/bin/env python3
"""
migrate_orders_columns.py — Add missing columns to the orders table.

Run in the cPanel "Setup Python App" terminal:

    python3 migrate_orders_columns.py

Adds these columns (all safe — uses IF NOT EXISTS, won't touch existing data):
  - points_discount   DECIMAL(12,2)  DEFAULT 0
  - points_redeemed   INTEGER        DEFAULT 0
  - payment_receipt   VARCHAR(255)
  - referrer_id       UUID           (FK → users.id)

Safe to re-run multiple times.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR  = os.path.join(BASE_DIR, "app")
for d in (BASE_DIR, APP_DIR):
    if d not in sys.path:
        sys.path.insert(0, d)
os.chdir(BASE_DIR)

SEP = "=" * 60

def ok(msg):   print(f"  ✓  {msg}")
def fail(msg): print(f"  ✗  {msg}")
def info(msg): print(f"  →  {msg}")

print(f"\n{SEP}\n  Orders Table Migration\n{SEP}")

# ── Load .env ──────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, ".env"))
    ok(".env loaded")
except ImportError:
    info("dotenv not found — reading env vars directly")

# ── Connect ────────────────────────────────────────────────────────────────────
try:
    import psycopg2
except ImportError:
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"], check=True)
    import psycopg2

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_NAME = os.environ.get("DB_NAME", "fixitblu_prod_db")
DB_USER = os.environ.get("DB_USER", "fixitblu_prod_user")
DB_PASS = os.environ.get("DB_PASSWORD", "")

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
        info(f"trying {host!r} ... {str(e)[:60]}")

if not conn:
    fail("Could not connect to database")
    sys.exit(1)

cur = conn.cursor()

# ── Migrations ─────────────────────────────────────────────────────────────────

MIGRATIONS = [
    (
        "orders.points_discount",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_discount DECIMAL(12,2) NOT NULL DEFAULT 0",
    ),
    (
        "orders.points_redeemed",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0",
    ),
    (
        "orders.payment_receipt",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_receipt VARCHAR(255)",
    ),
    (
        "orders.referrer_id",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES users(id) ON DELETE SET NULL",
    ),
]

print(f"\n{SEP}\n  Running {len(MIGRATIONS)} migrations\n{SEP}\n")

success = 0
for label, sql in MIGRATIONS:
    try:
        cur.execute(sql)
        conn.commit()
        ok(label)
        success += 1
    except Exception as e:
        conn.rollback()
        fail(f"{label}  —  {str(e)[:100]}")

cur.close()
conn.close()

# ── Restart Passenger ──────────────────────────────────────────────────────────
tmp_dir      = os.path.join(BASE_DIR, "tmp")
restart_file = os.path.join(tmp_dir, "restart.txt")
os.makedirs(tmp_dir, exist_ok=True)
try:
    open(restart_file, "w").close()
    ok("Touched tmp/restart.txt — Passenger will restart")
except Exception as e:
    info(f"Could not touch restart.txt: {e}")

print(f"""
{SEP}
  Done.  {success}/{len(MIGRATIONS)} migrations applied.

  The app has been restarted automatically.
  Test: curl https://api.fixit-bluetechnology.co.ke/health
{SEP}
""")
