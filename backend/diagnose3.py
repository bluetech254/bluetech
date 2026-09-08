"""
Startup timing diagnostic — finds which imports are slow.
Run via: cPanel -> Setup Python App -> Execute Python Script -> diagnose3.py
"""
import sys
import os
import time

BASE_DIR = '/home2/fixitblu/backend'
sys.path.insert(0, BASE_DIR)
os.chdir(BASE_DIR)

print("=" * 60)
print("STARTUP TIMING DIAGNOSTIC")
print("=" * 60)

def timed(label, fn):
    t = time.time()
    result = fn()
    elapsed = time.time() - t
    print(f"  {elapsed:.3f}s  {label}")
    return result

total_start = time.time()

timed("load dotenv", lambda: __import__('dotenv').load_dotenv(os.path.join(BASE_DIR, '.env')))
timed("import fastapi", lambda: __import__('fastapi'))
timed("import supabase", lambda: __import__('supabase'))
timed("import boto3", lambda: __import__('boto3'))
timed("import passlib", lambda: __import__('passlib'))
timed("import jose", lambda: __import__('jose'))
timed("import slowapi", lambda: __import__('slowapi'))
timed("import a2wsgi", lambda: __import__('a2wsgi'))
timed("import app.config", lambda: __import__('app.config'))
timed("import app.database", lambda: __import__('app.database'))

print("\n  --- Full app import ---")
timed("import app.main (full)", lambda: __import__('app.main'))

total = time.time() - total_start
print(f"\n  TOTAL startup time: {total:.3f}s")
print("\nPassenger typically kills processes that take >30s to start.")
print("If total > 20s that is likely the cause of SIGTERM.")
print("=" * 60)
