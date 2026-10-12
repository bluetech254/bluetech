#!/usr/bin/env python3
"""
diagnose_prod.py — Run on cPanel to see the exact startup error.
"""
import sys
import os
import traceback

BASE_DIR = '/home2/fixitblu/backend'
APP_DIR  = os.path.join(BASE_DIR, 'app')

sys.path.insert(0, BASE_DIR)
sys.path.insert(0, APP_DIR)
os.chdir(BASE_DIR)

print("=" * 60)
print("  BlueTech Prod Diagnostics")
print("=" * 60)

# 1. Python version
print(f"\n[1] Python: {sys.version}")

# 2. Load .env
print("\n[2] Loading .env ...")
try:
    from dotenv import load_dotenv
    result = load_dotenv(os.path.join(BASE_DIR, '.env'))
    print(f"    .env loaded: {result}")
    print(f"    DATABASE_TYPE = {os.getenv('DATABASE_TYPE', '(not set)')}")
    print(f"    DB_HOST       = {os.getenv('DB_HOST', '(not set)')}")
    print(f"    DB_NAME       = {os.getenv('DB_NAME', '(not set)')}")
except Exception as e:
    print(f"    ERROR: {e}")

# 3. Try importing each core module individually
print("\n[3] Importing core modules ...")
modules = [
    "app.core.config",
    "app.core.db_connection",
    "app.core.db",
    "app.core.startup",
    "app.core.security",
]
for mod in modules:
    try:
        __import__(mod)
        print(f"    ✓ {mod}")
    except Exception as e:
        print(f"    ✗ {mod}")
        print(f"      {traceback.format_exc()}")

# 4. Try importing the full app
print("\n[4] Importing app.main ...")
try:
    from app.main import app
    routes = [r for r in app.routes if hasattr(r, 'path')]
    print(f"    ✓ app loaded — {len(routes)} routes")
except Exception as e:
    print(f"    ✗ FAILED:")
    print(traceback.format_exc())

# 5. Check installed packages
print("\n[5] Key packages:")
for pkg in ['fastapi', 'uvicorn', 'psycopg2', 'pydantic', 'bcrypt', 'dotenv', 'slowapi']:
    try:
        m = __import__(pkg)
        print(f"    ✓ {pkg} {getattr(m, '__version__', '')}")
    except ImportError:
        print(f"    ✗ {pkg} — NOT INSTALLED")

print("\n" + "=" * 60)
