#!/usr/bin/env python3
"""
cpanel_fix.py — BlueTech cPanel all-in-one fixer.

Usage:
    python3 cpanel_fix.py SUPABASE_KEY=eyJ...your_anon_key...

The SUPABASE_KEY argument is required if it's missing from .env.
Get it from: Supabase Dashboard -> Settings -> API -> anon public key
"""
import sys
import os
import subprocess
import traceback

# Accept SUPABASE_KEY as command-line arg (non-interactive)
# Usage: python3 cpanel_fix.py SUPABASE_KEY=eyJ...
CLI_SUPABASE_KEY = ''
for arg in sys.argv[1:]:
    if arg.startswith('SUPABASE_KEY='):
        CLI_SUPABASE_KEY = arg.split('=', 1)[1].strip()

BASE_DIR = '/home2/fixitblu/backend'
APP_DIR  = os.path.join(BASE_DIR, 'app')

for d in (BASE_DIR, APP_DIR):
    if d not in sys.path:
        sys.path.insert(0, d)

os.chdir(BASE_DIR)

SEP = "=" * 60
def ok(msg):   print(f"  OK  {msg}")
def bad(msg):  print(f"  XX  {msg}")
def info(msg): print(f"  >>  {msg}")

# ─────────────────────────────────────────────────────────────────────────────
# 1. Install missing packages (no --user, works in virtualenv)
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  1. Install Missing Packages\n{SEP}")

REQUIRED = [
    "pydantic-settings",
    "python-dotenv",
    "python-multipart",
]

for pkg in REQUIRED:
    mod = pkg.replace("-", "_")
    try:
        __import__(mod)
        ok(f"{pkg} already installed")
    except ImportError:
        info(f"Installing {pkg} ...")
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", pkg],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            ok(f"{pkg} installed")
        else:
            bad(f"{pkg} FAILED:\n{result.stderr[-400:]}")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Fix .env — write SUPABASE_KEY if provided
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  2. Check/Fix .env\n{SEP}")

env_path = os.path.join(BASE_DIR, '.env')

with open(env_path, 'r') as f:
    env_content = f.read()

# Check current state
def env_has(key):
    for line in env_content.splitlines():
        if line.startswith(f'{key}=') and len(line.split('=', 1)[1].strip()) > 10:
            return True
    return False

for var in ['SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET']:
    if env_has(var):
        ok(f"{var} present")
    else:
        bad(f"{var} missing or empty")

# Write SUPABASE_KEY if provided via CLI
if CLI_SUPABASE_KEY:
    if env_has('SUPABASE_KEY'):
        ok("SUPABASE_KEY already set — skipping CLI value")
    else:
        if 'SUPABASE_KEY=' in env_content:
            lines = [f'SUPABASE_KEY={CLI_SUPABASE_KEY}' if l.startswith('SUPABASE_KEY=') else l
                     for l in env_content.splitlines()]
            env_content = '\n'.join(lines) + '\n'
        else:
            env_content += f'\nSUPABASE_KEY={CLI_SUPABASE_KEY}\n'
        with open(env_path, 'w') as f:
            f.write(env_content)
        os.environ['SUPABASE_KEY'] = CLI_SUPABASE_KEY
        ok(f"SUPABASE_KEY written to .env ({len(CLI_SUPABASE_KEY)} chars)")
elif not env_has('SUPABASE_KEY'):
    bad("SUPABASE_KEY not in .env and not provided as argument")
    print(f"\n  Re-run with:")
    print(f"  python3 cpanel_fix.py SUPABASE_KEY=eyJ...your_key_here...")
    print(f"\n  Get it from: Supabase Dashboard -> Settings -> API -> anon public key\n")

# Load env
try:
    from dotenv import load_dotenv
    load_dotenv(env_path, override=True)
    ok(".env loaded")
except Exception as e:
    bad(f".env load failed: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Write fixed passenger_wsgi.py
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  3. Write passenger_wsgi.py\n{SEP}")

wsgi_lines = [
    "import sys",
    "import os",
    "import asyncio",
    "",
    "BASE_DIR = '/home2/fixitblu/backend'",
    "APP_DIR  = os.path.join(BASE_DIR, 'app')",
    "",
    "for d in (BASE_DIR, APP_DIR):",
    "    if d not in sys.path:",
    "        sys.path.insert(0, d)",
    "",
    "os.chdir(BASE_DIR)",
    "",
    "from dotenv import load_dotenv",
    "load_dotenv(os.path.join(BASE_DIR, '.env'))",
    "",
    "from app.main import app",
    "",
    "",
    "class ASGIToWSGI:",
    "    def __init__(self, asgi_app):",
    "        self.asgi_app = asgi_app",
    "",
    "    def __call__(self, environ, start_response):",
    "        scope = {",
    "            'type': 'http',",
    "            'asgi': {'version': '3.0'},",
    "            'http_version': environ.get('SERVER_PROTOCOL', 'HTTP/1.1').split('/')[-1],",
    "            'method': environ['REQUEST_METHOD'].upper(),",
    "            'headers': [",
    "                (k[5:].lower().replace('_', '-').encode(), v.encode())",
    "                for k, v in environ.items()",
    "                if k.startswith('HTTP_')",
    "            ] + [",
    "                (b'content-type',   environ.get('CONTENT_TYPE', '').encode()),",
    "                (b'content-length', environ.get('CONTENT_LENGTH', '0').encode()),",
    "            ],",
    "            'path':         environ.get('PATH_INFO', '/'),",
    "            'query_string': environ.get('QUERY_STRING', '').encode(),",
    "            'root_path':    environ.get('SCRIPT_NAME', ''),",
    "            'scheme':       environ.get('wsgi.url_scheme', 'https'),",
    "            'server': (",
    "                environ.get('SERVER_NAME', 'localhost'),",
    "                int(environ.get('SERVER_PORT', 443)),",
    "            ),",
    "        }",
    "        try:",
    "            content_length = int(environ.get('CONTENT_LENGTH') or 0)",
    "        except (ValueError, TypeError):",
    "            content_length = 0",
    "        if content_length < 0:",
    "            content_length = 0",
    "        body = environ.get('wsgi.input', None)",
    "        request_body = body.read(content_length) if (body and content_length > 0) else b''",
    "        response_started = []",
    "        response_body    = []",
    "",
    "        async def run():",
    "            async def receive():",
    "                return {'type': 'http.request', 'body': request_body, 'more_body': False}",
    "            async def send(message):",
    "                if message['type'] == 'http.response.start':",
    "                    response_started.append((message['status'], message.get('headers', [])))",
    "                elif message['type'] == 'http.response.body':",
    "                    response_body.append(message.get('body', b''))",
    "            await self.asgi_app(scope, receive, send)",
    "",
    "        loop = asyncio.new_event_loop()",
    "        try:",
    "            loop.run_until_complete(run())",
    "        finally:",
    "            loop.close()",
    "",
    "        if response_started:",
    "            status_code, headers = response_started[0]",
    "            phrases = {200:'OK',201:'Created',204:'No Content',",
    "                       400:'Bad Request',401:'Unauthorized',403:'Forbidden',",
    "                       404:'Not Found',405:'Method Not Allowed',",
    "                       422:'Unprocessable Entity',429:'Too Many Requests',",
    "                       500:'Internal Server Error'}",
    "            start_response(",
    "                f\"{status_code} {phrases.get(status_code, 'Unknown')}\",",
    "                [(k.decode(), v.decode()) for k, v in headers],",
    "            )",
    "        else:",
    "            start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])",
    "        return response_body",
    "",
    "",
    "application = ASGIToWSGI(app)",
    "",
]

wsgi_path = os.path.join(BASE_DIR, 'passenger_wsgi.py')
with open(wsgi_path, 'w') as f:
    f.write('\n'.join(wsgi_lines))
ok(f"passenger_wsgi.py written")

# ─────────────────────────────────────────────────────────────────────────────
# 4. Verify app import
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  4. Verify App Import\n{SEP}")

# Clear any cached failed imports
for key in list(sys.modules.keys()):
    if key.startswith('app') or key in ('admin_auth','core','auth','orders',
                                         'bookings','products','devices'):
        del sys.modules[key]

try:
    from app.main import app
    routes = [r for r in app.routes if hasattr(r, 'path')]
    ok(f"app.main imported — {len(routes)} routes registered")
except Exception as e:
    bad(f"app.main FAILED: {e}")
    traceback.print_exc()
    print("\n  Fix the error above then re-run.")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# 5. Supabase ping
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  5. Supabase Ping\n{SEP}")

try:
    from app.core.database import supabase, supabase_admin
    r = supabase.table("products").select("id").limit(1).execute()
    ok(f"anon query OK — {len(r.data)} row(s)")
    r2 = supabase_admin.table("admins").select("id").limit(1).execute()
    ok(f"admin query OK — {len(r2.data)} row(s)")
except Exception as e:
    bad(f"Supabase FAILED: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# 6. Simulate GET /health
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  6. Simulate GET /health\n{SEP}")

try:
    import asyncio

    async def sim():
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

    status, body = asyncio.run(sim())
    if status == 200:
        ok(f"GET /health -> {status}  {body.decode()[:100]}")
    else:
        bad(f"GET /health -> {status}  {body.decode()[:200]}")
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
    bad(f"restart.txt: {e}")

print(f"\n{SEP}")
print("  Done!")
print(f"  Test: curl https://api.fixit-bluetechnology.co.ke/health")
print(f"{SEP}\n")
