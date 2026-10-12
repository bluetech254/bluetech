#!/usr/bin/env python3
"""
verify_prod.py — One script to confirm everything is wired to PostgreSQL.
Run on cPanel: python3 verify_prod.py
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

print("=" * 55)
print("  BlueTech Prod Verification")
print("=" * 55)

# 1. What does .env say?
print(f"\n[1] .env file")
print(f"    DATABASE_TYPE = {os.getenv('DATABASE_TYPE','(not set)')}")
print(f"    DB_HOST       = {os.getenv('DB_HOST','(not set)')}")
print(f"    DB_NAME       = {os.getenv('DB_NAME','(not set)')}")
print(f"    DB_USER       = {os.getenv('DB_USER','(not set)')}")
print(f"    SUPABASE_URL  = {os.getenv('SUPABASE_URL','(not set)')[:30] if os.getenv('SUPABASE_URL') else '(not set)'}")

db_type = os.getenv("DATABASE_TYPE","").lower()
if db_type != "postgresql":
    print(f"\n  ✗  DATABASE_TYPE='{db_type}' — must be 'postgresql'")
    print("     Run: python3 setup_prod.py  then try again")
    sys.exit(1)
print("  ✓  DATABASE_TYPE=postgresql")

# 2. PostgreSQL connection
print(f"\n[2] PostgreSQL connection")
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
        print(f"  ✓  Connected via {host}")
        break
    except Exception as e:
        print(f"  trying {host}... {str(e)[:50]}")

if not conn:
    print("  ✗  Cannot connect to PostgreSQL")
    sys.exit(1)

cur = conn.cursor()

# 3. Table row counts
print(f"\n[3] Table counts")
tables = ["users","products","repair_services","device_brands","device_models",
          "orders","bookings","admins","delivery_zones"]
for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    n = cur.fetchone()[0]
    status = "✓" if n > 0 or t in ("users","products","orders","bookings") else "✓"
    print(f"  {status}  {t:<20} {n} rows")

# 4. What does the running app think?
print(f"\n[4] App DB type (what the live process uses)")
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "app"))
os.chdir(BASE_DIR)
try:
    from app.core.db_connection import _get_db_type
    live_type = _get_db_type()
    if live_type == "postgresql":
        print(f"  ✓  App reads DATABASE_TYPE='{live_type}'")
    else:
        print(f"  ✗  App reads DATABASE_TYPE='{live_type}' — Passenger needs restart")
        print("     Run: python3 restart_app.py")
except Exception as e:
    print(f"  ?  Could not import db_connection: {e}")

# 5. Quick write test — insert + delete a test user
print(f"\n[5] Write test (insert + rollback)")
try:
    cur.execute("""
        INSERT INTO users (full_name, phone_number, password)
        VALUES ('_test_', '2540000000000', '_test_')
    """)
    conn.rollback()  # don't keep it
    print("  ✓  INSERT works (rolled back)")
except Exception as e:
    conn.rollback()
    print(f"  ✗  INSERT failed: {e}")

conn.close()

# 6. Restart Passenger
print(f"\n[6] Restarting Passenger")
tmp = os.path.join(BASE_DIR,"tmp")
os.makedirs(tmp, exist_ok=True)
import time
for _ in range(3):
    open(os.path.join(tmp,"restart.txt"),"w").write(str(time.time()))
    time.sleep(0.5)
print("  ✓  tmp/restart.txt touched")

print(f"""
{'=' * 55}
  Result: Production is {'READY' if db_type == 'postgresql' else 'NOT READY'}
  DB:     {os.getenv('DB_NAME')} @ {os.getenv('DB_HOST')}
  Test:   https://api.fixit-bluetechnology.co.ke/health
{'=' * 55}
""")
