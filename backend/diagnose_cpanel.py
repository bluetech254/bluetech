#!/usr/bin/env python3
"""
diagnose_cpanel.py — BlueTech cPanel diagnostic script.

Upload to /home2/fixitblu/backend/ and run:
    python3 diagnose_cpanel.py

Checks every layer that could cause a 500 error on cPanel/Passenger.
"""
import sys
import os
import traceback

BASE_DIR = '/home2/fixitblu/backend'
RESULTS = []

def ok(label, detail=''):
    RESULTS.append(f"  ✓  {label}" + (f" — {detail}" if detail else ''))

def fail(label, detail=''):
    RESULTS.append(f"  ✗  {label}" + (f" — {detail}" if detail else ''))

def section(title):
    RESULTS.append(f"\n{'='*60}")
    RESULTS.append(f"  {title}")
    RESULTS.append('='*60)

# ── 1. Python version ─────────────────────────────────────────────────────────
section("1. Python Version")
v = sys.version
ok("Python version", v)
if sys.version_info < (3, 10):
    fail("Python < 3.10 — FastAPI requires 3.10+", v)
else:
    ok("Python version OK (>=3.10)")

# ── 2. Working directory & sys.path ──────────────────────────────────────────
section("2. Paths")
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
ok("BASE_DIR", BASE_DIR)
ok("BASE_DIR exists", str(os.path.isdir(BASE_DIR)))
ok("sys.path[0]", sys.path[0])

# ── 3. .env file ─────────────────────────────────────────────────────────────
section("3. .env File")
env_path = os.path.join(BASE_DIR, '.env')
if os.path.exists(env_path):
    ok(".env found", env_path)
    try:
        from dotenv import load_dotenv
        load_dotenv(env_path)
        ok("dotenv loaded")
        # Check critical env vars (values redacted)
        critical = [
            'SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_KEY',
            'JWT_SECRET', 'DATABASE_URL',
        ]
        for var in critical:
            val = os.environ.get(var, '')
            if val:
                ok(f"  {var}", f"set ({len(val)} chars)")
            else:
                fail(f"  {var}", "NOT SET")
    except ImportError:
        fail("python-dotenv not installed")
else:
    fail(".env NOT found", env_path)

# ── 4. Required packages ──────────────────────────────────────────────────────
section("4. Required Packages")
packages = [
    ('fastapi', 'fastapi'),
    ('uvicorn', 'uvicorn'),
    ('pydantic', 'pydantic'),
    ('supabase', 'supabase'),
    ('jose', 'python-jose'),
    ('bcrypt', 'bcrypt'),
    ('asyncio', 'asyncio (stdlib)'),
    ('dotenv', 'python-dotenv'),
    ('slowapi', 'slowapi'),
    ('httpx', 'httpx'),
]
for mod, label in packages:
    try:
        m = __import__(mod)
        ver = getattr(m, '__version__', 'unknown')
        ok(label, ver)
    except ImportError as e:
        fail(label, f"MISSING — {e}")

# ── 5. App import ─────────────────────────────────────────────────────────────
section("5. App Import")
try:
    os.chdir(BASE_DIR)
    from app.main import app
    ok("app.main imported")
    ok("FastAPI app", str(type(app)))
    # Count routes
    routes = [r for r in app.routes if hasattr(r, 'path')]
    ok("Routes registered", str(len(routes)))
except Exception as e:
    fail("app.main import FAILED")
    RESULTS.append(traceback.format_exc())

# ── 6. Supabase connection ────────────────────────────────────────────────────
section("6. Supabase Connection")
try:
    from app.core.database import supabase, supabase_admin
    ok("supabase client created")
    # Quick ping — fetch 1 product
    r = supabase.table("products").select("id").limit(1).execute()
    if r.data:
        ok("supabase query OK", f"got {len(r.data)} row(s)")
    else:
        fail("supabase query returned empty", "check RLS policies")
    # Admin client
    r2 = supabase_admin.table("admins").select("id").limit(1).execute()
    if r2.data:
        ok("supabase_admin query OK")
    else:
        fail("supabase_admin query empty", "check service key")
except Exception as e:
    fail("Supabase connection FAILED", str(e)[:200])
    RESULTS.append(traceback.format_exc())

# ── 7. passenger_wsgi.py ─────────────────────────────────────────────────────
section("7. passenger_wsgi.py")
wsgi_path = os.path.join(BASE_DIR, 'passenger_wsgi.py')
if os.path.exists(wsgi_path):
    ok("passenger_wsgi.py found")
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("passenger_wsgi", wsgi_path)
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        if hasattr(mod, 'application'):
            ok("application object found", str(type(mod.application)))
        else:
            fail("'application' not defined in passenger_wsgi.py")
    except Exception as e:
        fail("passenger_wsgi.py import FAILED")
        RESULTS.append(traceback.format_exc())
else:
    fail("passenger_wsgi.py NOT found", wsgi_path)

# ── 8. Simulate a request ─────────────────────────────────────────────────────
section("8. Simulate GET /health")
try:
    import asyncio

    async def simulate():
        scope = {
            'type': 'http', 'asgi': {'version': '3.0'},
            'http_version': '1.1', 'method': 'GET',
            'headers': [], 'path': '/health',
            'query_string': b'', 'root_path': '',
            'scheme': 'https',
            'server': ('localhost', 443),
        }
        resp = {}
        body_parts = []

        async def receive():
            return {'type': 'http.request', 'body': b'', 'more_body': False}

        async def send(msg):
            if msg['type'] == 'http.response.start':
                resp['status'] = msg['status']
            elif msg['type'] == 'http.response.body':
                body_parts.append(msg.get('body', b''))

        await app(scope, receive, send)
        return resp.get('status'), b''.join(body_parts)

    status, body = asyncio.run(simulate())
    if status == 200:
        ok("GET /health", f"status={status} body={body.decode()[:100]}")
    else:
        fail("GET /health", f"status={status} body={body.decode()[:200]}")
except Exception as e:
    fail("Simulate request FAILED", str(e)[:200])
    RESULTS.append(traceback.format_exc())

# ── Print results ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  BlueTech cPanel Diagnostic Report")
print("="*60)
for line in RESULTS:
    print(line)
print("\n" + "="*60 + "\n")
