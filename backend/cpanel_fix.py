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

WSGI_CONTENT = (
    "import sys\n"
    "import os\n"
    "import asyncio\n"
    "\n"
    "BASE_DIR = '/home2/fixitblu/backend'\n"
    "APP_DIR  = os.path.join(BASE_DIR, 'app')\n"
    "\n"
    "for d in (BASE_DIR, APP_DIR):\n"
    "    if d not in sys.path:\n"
    "        sys.path.insert(0, d)\n"
    "\n"
    "os.chdir(BASE_DIR)\n"
    "\n"
    "from dotenv import load_dotenv\n"
    "load_dotenv(os.path.join(BASE_DIR, '.env'))\n"
    "\n"
    "from app.main import app\n"
    "\n"
    "\n"
    "class ASGIToWSGI:\n"
    "    def __init__(self, asgi_app):\n"
    "        self.asgi_app = asgi_app\n"
    "\n"
    "    def __call__(self, environ, start_response):\n"
    "        scope = {\n"
    "            'type': 'http',\n"
    "            'asgi': {'version': '3.0'},\n"
    "            'http_version': environ.get('SERVER_PROTOCOL', 'HTTP/1.1').split('/')[-1],\n"
    "            'method': environ['REQUEST_METHOD'].upper(),\n"
    "            'headers': [\n"
    "                (k[5:].lower().replace('_', '-').encode(), v.encode())\n"
    "                for k, v in environ.items()\n"
    "                if k.startswith('HTTP_')\n"
    "            ] + [\n"
    "                (b'content-type',   environ.get('CONTENT_TYPE', '').encode()),\n"
    "                (b'content-length', environ.get('CONTENT_LENGTH', '0').encode()),\n"
    "            ],\n"
    "            'path':         environ.get('PATH_INFO', '/'),\n"
    "            'query_string': environ.get('QUERY_STRING', '').encode(),\n"
    "            'root_path':    environ.get('SCRIPT_NAME', ''),\n"
    "            'scheme':       environ.get('wsgi.url_scheme', 'https'),\n"
    "            'server': (\n"
    "                environ.get('SERVER_NAME', 'localhost'),\n"
    "                int(environ.get('SERVER_PORT', 443)),\n"
    "            ),\n"
    "        }\n"
    "        try:\n"
    "            content_length = int(environ.get('CONTENT_LENGTH') or 0)\n"
    "        except (ValueError, TypeError):\n"
    "            content_length = 0\n"
    "        if content_length < 0:\n"
    "            content_length = 0\n"
    "        body = environ.get('wsgi.input', None)\n"
    "        request_body = body.read(content_length) if (body and content_length > 0) else b''\n"
    "        response_started = []\n"
    "        response_body    = []\n"
    "\n"
    "        async def run():\n"
    "            async def receive():\n"
    "                return {'type': 'http.request', 'body': request_body, 'more_body': False}\n"
    "            async def send(message):\n"
    "                if message['type'] == 'http.response.start':\n"
    "                    response_started.append((message['status'], message.get('headers', [])))\n"
    "                elif message['type'] == 'http.response.body':\n"
    "                    response_body.append(message.get('body', b''))\n"
    "            await self.asgi_app(scope, receive, send)\n"
    "\n"
    "        loop = asyncio.new_event_loop()\n"
    "        try:\n"
    "            loop.run_until_complete(run())\n"
    "        finally:\n"
    "            loop.close()\n"
    "\n"
    "        if response_started:\n"
    "            status_code, headers = response_started[0]\n"
    "            phrases = {200:'OK',201:'Created',204:'No Content',\n"
    "                       400:'Bad Request',401:'Unauthorized',403:'Forbidden',\n"
    "                       404:'Not Found',405:'Method Not Allowed',\n"
    "                       422:'Unprocessable Entity',429:'Too Many Requests',\n"
    "                       500:'Internal Server Error'}\n"
    "            start_response(\n"
    "                f\"{status_code} {phrases.get(status_code, 'Unknown')}\",\n"
    "                [(k.decode(), v.decode()) for k, v in headers],\n"
    "            )\n"
    "        else:\n"
    "            start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])\n"
    "        return response_body\n"
    "\n"
    "\n"
    "application = ASGIToWSGI(app)\n"
)

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
