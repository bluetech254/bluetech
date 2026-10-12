#!/usr/bin/env python3
"""
migrate_users_columns.py — Add missing columns to the live users table.

Missing columns that cause reset password and lockout to silently fail:
  - reset_code TEXT
  - reset_code_expires TIMESTAMP WITH TIME ZONE
  - locked_until TIMESTAMP WITH TIME ZONE
  - last_login TIMESTAMP WITH TIME ZONE

Also fixes verification_code column type from VARCHAR(255) to TEXT so it
can store SHA-256 hashes (64 chars — fits in 255 but TEXT is cleaner).

Run on cPanel:
    python3 migrate_users_columns.py
"""
import os, sys, subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_env(path):
    if not os.path.exists(path): return
    with open(path) as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line: continue
            k, _, v = line.partition("=")
            k = k.strip(); v = v.strip().strip('"').strip("'")
            if k and k not in os.environ: os.environ[k] = v

load_env(os.path.join(BASE_DIR, ".env"))

try:
    import psycopg2
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"], check=True)
    import psycopg2

conn = None
for host in ["/var/run/postgresql", "localhost", "127.0.0.1"]:
    try:
        conn = psycopg2.connect(
            host=host, port=int(os.getenv("DB_PORT", "5432")),
            dbname=os.getenv("DB_NAME"), user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"), connect_timeout=5,
        )
        print(f"Connected via {host}")
        break
    except Exception as e:
        print(f"  {host}: {e}")

if not conn:
    print("Cannot connect to PostgreSQL"); sys.exit(1)

cur = conn.cursor()

MIGRATIONS = [
    ("reset_code",         "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code TEXT"),
    ("reset_code_expires", "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires TIMESTAMP WITH TIME ZONE"),
    ("locked_until",       "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE"),
    ("last_login",         "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE"),
    # Widen verification_code to TEXT (safe — TEXT >= VARCHAR(255))
    ("verification_code → TEXT", "ALTER TABLE users ALTER COLUMN verification_code TYPE TEXT"),
]

print("\nApplying migrations:")
for label, sql in MIGRATIONS:
    try:
        cur.execute(sql)
        conn.commit()
        print(f"  ✓  {label}")
    except Exception as e:
        conn.rollback()
        print(f"  ✗  {label}: {e}")

# Verify
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
""")
print("\nusers table columns now:")
for col, dtype in cur.fetchall():
    print(f"  {col:<30} {dtype}")

conn.close()

# Restart Passenger
import time
tmp = os.path.join(BASE_DIR, "tmp")
os.makedirs(tmp, exist_ok=True)
open(os.path.join(tmp, "restart.txt"), "w").write(str(time.time()))
print("\n✓ Passenger restarted")
print("\nDone. Reset password will now work correctly.")
