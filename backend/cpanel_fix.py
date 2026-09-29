#!/usr/bin/env python3
"""
cpanel_fix.py — BlueTech cPanel all-in-one fixer.

Upload to /home2/fixitblu/backend/ and run:
    cd /home2/fixitblu/backend && python3 cpanel_fix.py

Fixes:
  1. Installs missing pip packages (pydantic-settings, etc.)
  2. Adds app/ to sys.path in passenger_wsgi.py
  3. Prompts for missing SUPABASE_KEY in .env
  4. Verifies app boots correctly
  5. Restarts Passenger
"""
import sys
import os
import subprocess
import traceback

BASE_DIR = '/home2/fixitblu/backend'
APP_DIR  = os.path.join(BASE_DIR, 'app')

# Add both to path immediately so imports work
for d in (BASE_DIR, APP_DIR):
    if d not in sys.path:
        sys.path.insert(0, d)

os.chdir(BASE_DIR)

SEP = "=" * 60

def ok(msg):   print(f"  ✓  {msg}")
def bad(msg):  print(f"  ✗  {msg}")
def info(msg): print(f"  →  {msg}")

# ─────────────────────────────────────────────────────────────────────────────
# 1. Install missing packages
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  1. Install Missing Packages\n{SEP}")

REQUIRED = [
    "pydantic-settings",
    "pydantic[email]",
    "python-dotenv",
    "slowapi",
    "python-multipart",
    "asgiref",
]

pip = sys.executable.replace('python3', 'pip3').replace('python', 'pip')

for pkg in REQUIRED:
    mod = pkg.split("[")[0].replace("-", "_")
    try:
        __import__(mod)
        ok(f"{pkg} already installed")
    except ImportError:
        info(f"Installing {pkg}...")
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "--user", pkg],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            ok(f"{pkg} installed")
        else:
            bad(f"{pkg} install FAILED:\n{result.stderr[-300:]}")

# Reload sys.path after installs
import importlib
import site
importlib.reload(site)

# ─────────────────────────────────────────────────────────────────────────────
# 2. Fix .env — add missing SUPABASE_KEY
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  2. Check .env\n{SEP}")

env_path = os.path.join(BASE_DIR, '.env')

try:
    from dotenv import load_dotenv, dotenv_values
    load_dotenv(env_path, override=True)
    vals = dotenv_values(env_path)

    missing = []
    for var in ['SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET']:
        v = vals.get(var, '').strip()
        if v:
            ok(f"{var} set ({len(v)} chars)")
        else:
            bad(f"{var} NOT SET")
            missing.append(var)

    if 'SUPABASE_KEY' in missing:
        print("\n  SUPABASE_KEY is the anon/public key from:")
        print("  Supabase Dashboard → Settings → API → anon public")
        key = input("\n  Paste SUPABASE_KEY (or Enter to skip): ").strip()
        if key:
            with open(env_path, 'r') as f:
                content = f.read()
            if 'SUPABASE_KEY=' in content:
                lines = [f'SUPABASE_KEY={key}' if l.startswith('SUPABASE_KEY=') else l
                         for l in content.splitlines()]
                content = '\n'.join(lines) + '\n'
            else:
                content += f'\nSUPABASE_KEY={key}\n'
            with open(env_path, 'w') as f:
                f.write(content)
            os.environ['SUPABASE_KEY'] = key
            ok("SUPABASE_KEY written to .env")
        else:
            bad("SUPABASE_KEY skipped — Supabase public queries will fail")

    # Reload env
    load_dotenv(env_path, override=True)

except Exception as e:
    bad(f".env check failed: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Write fixed passenger_wsgi.py
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  3. Write passenger_wsgi.py\n{SEP}")

WSGI_CONTENT = r"""import sys
import os
import asyncio

BASE_DIR = '/home2/fixitblu/backend'
APP_DIR  = os.path.join(BASE_DIR, 'app')

# backend/app/ must be on sys.path so flat imports resolve:
#   from admin_auth.router import ...
#   from core.config import settings
for d in (BASE_DIR, APP_DIR):
    if d not in sys.path:
        sys.path.insert(0, d)

os.chdir(BASE_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, '.env'))

from app.main import app


class ASGIToWSGI:
    """Minimal ASGI-to-WSGI bridge for Passenger/LiteSpeed."""

    def __init__(self, asgi_app):
        self.asgi_app = asgi_app

    def __call__(self, environ, start_response):
        scope = {
            'type': 'http',
            'asgi': {'version': '3.0'},
            'http_version': environ.get('SERVER_PROTOCOL', 'HTTP/1.1').split('/')[-1],
            'method': environ['REQUEST_METHOD'].upper(),
            'headers': [
                (k[5:].lower().replace('_', '-').encode(), v.encode())
                for k, v in environ.items()
                if k.startswith('HTTP_')
            ] + [
                (b'content-type',   environ.get('CONTENT_TYPE', '').encode()),
                (b'content-length', environ.get('CONTENT_LENGTH', '0').encode()),
            ],
            'path':         environ.get('PATH_INFO', '/'),
            'query_string': environ.get('QUERY_STRING', '').encode(),
            'root_path':    environ.get('SCRIPT_NAME', ''),
            'scheme':       environ.get('wsgi.url_scheme', 'https'),
            'server': (
                environ.get('SERVER_NAME', 'localhost'),
                int(environ.get('SERVER_PORT', 443)),
            ),
        }

        try:
            content_length = int(environ.get('CONTENT_LENGTH') or 0)
        except (ValueError, TypeError):
            content_length = 0
        if content_length < 0:
            content_length = 0

        body = environ.get('wsgi.input', None)
        request_body = body.read(content_length) if (body and content_length > 0) else b''

        response_started = []
        response_body    = []

        async def run():
            async def receive():
                return {'type': 'http.request', 'body': request_body, 'more_body': False}

            async def send(message):
                if message['type'] == 'http.response.start':
                    response_started.append((message['status'], message.get('headers', [])))
                elif message['type'] == 'http.response.body':
                    response_body.append(message.get('body', b''))

            await self.asgi_app(scope, receive, send)

        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(run())
        finally:
            loop.close()

        if response_started:
            status_code, headers = response_started[0]
            phrases = {
                200:'OK', 201:'Created', 204:'No Content',
                400:'Bad Request', 401:'Unauthorized', 403:'Forbidden',
                404:'Not Found', 405:'Method Not Allowed',
                422:'Unprocessable Entity', 429:'Too Many Requests',
                500:'Internal Server Error',
            }
            start_response(
                f"{status_code} {phrases.get(status_code, 'Unknown')}",
                [(k.decode(), v.decode()) for k, v in headers],
            )
        else:
            start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])

        return response_body


application = ASGIToWSGI(app)
"""

wsgi_path = os.path.join(BASE_DIR, 'passenger_wsgi.py')
with open(wsgi_path, 'w') as f:
    f.write(WSGI_CONTENT)
ok(f"passenger_wsgi.py written")

# ─────────────────────────────────────────────────────────────────────────────
# 4. Verify app import
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  4. Verify App Import\n{SEP}")

try:
    # Force reimport after sys.path fix
    if 'app.main' in sys.modules:
        del sys.modules['app.main']

    from app.main import app
    routes = [r for r in app.routes if hasattr(r, 'path')]
    ok(f"app.main imported — {len(routes)} routes")
except Exception as e:
    bad(f"app.main import FAILED: {e}")
    traceback.print_exc()
    print("\n  Cannot continue — fix the import error above first.")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# 5. Supabase ping
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  5. Supabase Ping\n{SEP}")

try:
    from app.core.database import supabase, supabase_admin
    r = supabase.table("products").select("id").limit(1).execute()
    ok(f"supabase anon query — {len(r.data)} row(s)")
    r2 = supabase_admin.table("admins").select("id").limit(1).execute()
    ok(f"supabase admin query — {len(r2.data)} row(s)")
except Exception as e:
    bad(f"Supabase ping FAILED: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# 6. Simulate GET /health
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  6. Simulate GET /health\n{SEP}")

try:
    import asyncio

    async def simulate_health():
        scope = {
            'type': 'http', 'asgi': {'version': '3.0'},
            'http_version': '1.1', 'method': 'GET',
            'headers': [], 'path': '/health',
            'query_string': b'', 'root_path': '',
            'scheme': 'https', 'server': ('localhost', 443),
        }
        resp = {}; parts = []

        async def receive():
            return {'type': 'http.request', 'body': b'', 'more_body': False}

        async def send(msg):
            if msg['type'] == 'http.response.start':
                resp['status'] = msg['status']
            elif msg['type'] == 'http.response.body':
                parts.append(msg.get('body', b''))

        await app(scope, receive, send)
        return resp.get('status'), b''.join(parts)

    status, body = asyncio.run(simulate_health())
    if status == 200:
        ok(f"GET /health → {status}  {body.decode()[:100]}")
    else:
        bad(f"GET /health → {status}  {body.decode()[:200]}")
except Exception as e:
    bad(f"Simulate FAILED: {e}")
    traceback.print_exc()

# ─────────────────────────────────────────────────────────────────────────────
# 7. Restart Passenger
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  7. Restart Passenger\n{SEP}")

tmp_dir = os.path.join(BASE_DIR, 'tmp')
os.makedirs(tmp_dir, exist_ok=True)
restart = os.path.join(tmp_dir, 'restart.txt')
try:
    open(restart, 'w').close()
    ok(f"Touched {restart}")
except Exception as e:
    bad(f"Could not touch restart.txt: {e}")

print(f"\n{SEP}")
print("  All done!")
print(f"  Test: curl https://api.fixit-bluetechnology.co.ke/health")
print(f"{SEP}\n")
