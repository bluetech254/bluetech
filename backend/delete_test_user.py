#!/usr/bin/env python3
"""
delete_test_user.py — Delete test user from prod DB.
Run on cPanel: python3 delete_test_user.py
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
    subprocess.run([sys.executable,"-m","pip","install","psycopg2-binary","-q"],check=True)
    import psycopg2

conn = None
for host in ["/var/run/postgresql","localhost","127.0.0.1"]:
    try:
        conn = psycopg2.connect(
            host=host, port=int(os.getenv("DB_PORT","5432")),
            dbname=os.getenv("DB_NAME"), user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"), connect_timeout=5,
        )
        break
    except Exception:
        continue

if not conn:
    print("Cannot connect"); sys.exit(1)

cur = conn.cursor()

# Show all users first
cur.execute("SELECT id, full_name, phone_number, email, created_at FROM users ORDER BY created_at")
users = cur.fetchall()

print(f"\nCurrent users ({len(users)}):")
for u in users:
    print(f"  id={u[0]}")
    print(f"  name={u[1]}  phone={u[2]}  email={u[3]}")
    print(f"  created={u[4]}")
    print()

if not users:
    print("No users to delete.")
    conn.close()
    sys.exit(0)

# Delete all users
cur.execute("DELETE FROM users")
deleted = cur.rowcount
conn.commit()
conn.close()

print(f"Deleted {deleted} user(s). DB is clean.")
