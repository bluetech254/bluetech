#!/usr/bin/env python3
"""
cpanel_fix.py — BlueTech cPanel one-shot fixer.

Run on the cPanel server:
    cd /home2/fixitblu/backend && python3 cpanel_fix.py

What it does:
  1. Overwrites passenger_wsgi.py with the fixed version
     (adds app/ to sys.path so flat imports like `from admin_auth.router`
      resolve correctly)
  2. Checks .env for SUPABASE_KEY and prompts to add it if missing
  3. Verifies the app imports correctly after the fix
  4. Touches tmp/restart.txt to trigger a Passenger restart
"""
import sys
import os
import textwrap

BASE_DIR = '/home2/fixitblu/backend'
APP_DIR  = os.path.join(BASE_DIR, 'app')

# ── 1. Write fixed passenger_wsgi.py ─────────────────────────────────────────

PASSENGER_WSGI = textwrap.dedent('''\
    import sys
    import os
    import asyncio

    BASE_DIR = '/home2/fixitblu/backend'
    APP_DIR  = os.path.join(BASE_DIR, 'app')

    for d in (BASE_DIR, APP_DIR):
        if d not in sys.path:
            sys.path.insert(0, d)

    os.chdir(BASE_DIR)

    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, '.env'))

    from app.main import app


    class ASGIToWSGI:
        def __init__(self, asgi_app):
            self.asgi_app = asgi_app

        def __call__(self, environ, start_response):
            scope = {
                \'type\': \'http\',
                \'asgi\': {\'version\': \'3.0\'},
                \'http_version\': environ.get(\'SERVER_PROTOCOL\', \'HTTP/1.1\').split(\'/\')[-1],
                \'method\': environ[\'REQUEST_METHOD\'].upper(),
                \'headers\': [
                    (k[5:].lower().replace(\'_\', \'-\').encode(), v.encode())
                    for k, v in environ.items()
                    if k.startswith(\'HTTP_\')
                ] + [
                    (b\'content-type\',   environ.get(\'CONTENT_TYPE\', \'\').encode()),
                    (b\'content-length\', environ.get(\'CONTENT_LENGTH\', \'0\').encode()),
                ],
                \'path\':         environ.get(\'PATH_INFO\', \'/\'),
                \'query_string\': environ.get(\'QUERY_STRING\', \'\').encode(),
                \'root_path\':    environ.get(\'SCRIPT_NAME\', \'\'),
                \'scheme\':       environ.get(\'wsgi.url_scheme\', \'https\'),
                \'server\': (
                    environ.get(\'SERVER_NAME\', \'localhost\'),
                    int(environ.get(\'SERVER_PORT\', 443)),
                ),
            }

            try:
                content_length = int(environ.get(\'CONTENT_LENGTH\') or 0)
            except (ValueError, TypeError):
                content_length = 0
            if content_length < 0:
                content_length = 0

            body = environ.get(\'wsgi.input\', None)
            request_body = body.read(content_length) if (body and content_length > 0) else b\'\'

            response_started = []
            response_body    = []

            async def run():
                async def receive():
                    return {\'type\': \'http.request\', \'body\': request_body, \'more_body\': False}

                async def send(message):
                    if message[\'type\'] == \'http.response.start\':
                        response_started.append((message[\'status\'], message.get(\'headers\', [])))
                    elif message[\'type\'] == \'http.response.body\':
                        response_body.append(message.get(\'body\', b\'\'))

                await self.asgi_app(scope, receive, send)

            loop = asyncio.new_event_loop()
            try:
                loop.run_until_complete(run())
            finally:
                loop.close()

            if response_started:
                status_code, headers = response_started[0]
                phrases = {200:\'OK\',201:\'Created\',204:\'No Content\',400:\'Bad Request\',
                           401:\'Unauthorized\',403:\'Forbidden\',404:\'Not Found\',
                           405:\'Method Not Allowed\',422:\'Unprocessable Entity\',
                           429:\'Too Many Requests\',500:\'Internal Server Error\'}
                status_str   = f"{status_code} {phrases.get(status_code, \'Unknown\')}"
                wsgi_headers = [(k.decode(), v.decode()) for k, v in headers]
                start_response(status_str, wsgi_headers)
            else:
                start_response(\'500 Internal Server Error\', [(\'Content-Type\', \'text/plain\')])

            return response_body


    application = ASGIToWSGI(app)
''')

print("\n" + "="*60)
print("  BlueTech cPanel Fixer")
print("="*60)

wsgi_path = os.path.join(BASE_DIR, 'passenger_wsgi.py')
with open(wsgi_path, 'w') as f:
    f.write(PASSENGER_WSGI)
print(f"\n✓  passenger_wsgi.py written to {wsgi_path}")

# ── 2. Check .env for SUPABASE_KEY ────────────────────────────────────────────

env_path = os.path.join(BASE_DIR, '.env')
with open(env_path, 'r') as f:
    env_content = f.read()

if 'SUPABASE_KEY=' not in env_content or 'SUPABASE_KEY=\n' in env_content or 'SUPABASE_KEY= ' in env_content:
    print("\n✗  SUPABASE_KEY is missing from .env")
    print("   This is the Supabase anon/public key (starts with 'eyJ...')")
    print("   Get it from: Supabase Dashboard → Settings → API → anon/public key")
    key = input("\n   Paste SUPABASE_KEY here (or press Enter to skip): ").strip()
    if key:
        if 'SUPABASE_KEY=' in env_content:
            # Replace empty value
            lines = env_content.splitlines()
            lines = [f'SUPABASE_KEY={key}' if l.startswith('SUPABASE_KEY=') else l for l in lines]
            env_content = '\n'.join(lines) + '\n'
        else:
            env_content += f'\nSUPABASE_KEY={key}\n'
        with open(env_path, 'w') as f:
            f.write(env_content)
        print("✓  SUPABASE_KEY written to .env")
    else:
        print("⚠  Skipped — app will fail on Supabase queries without this key")
else:
    print("✓  SUPABASE_KEY present in .env")

# ── 3. Verify app imports ─────────────────────────────────────────────────────

print("\n--- Verifying app import ---")
for d in (BASE_DIR, APP_DIR):
    if d not in sys.path:
        sys.path.insert(0, d)
os.chdir(BASE_DIR)

from dotenv import load_dotenv
load_dotenv(env_path)

try:
    from app.main import app
    routes = [r for r in app.routes if hasattr(r, 'path')]
    print(f"✓  app.main imported OK — {len(routes)} routes registered")
except Exception as e:
    print(f"✗  app.main import FAILED: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)

# ── 4. Quick Supabase ping ────────────────────────────────────────────────────

print("\n--- Supabase ping ---")
try:
    from app.core.database import supabase
    r = supabase.table("products").select("id").limit(1).execute()
    print(f"✓  Supabase query OK — got {len(r.data)} row(s)")
except Exception as e:
    print(f"✗  Supabase query FAILED: {e}")

# ── 5. Simulate GET /health ───────────────────────────────────────────────────

print("\n--- Simulating GET /health ---")
try:
    import asyncio

    async def simulate():
        scope = {
            'type': 'http', 'asgi': {'version': '3.0'},
            'http_version': '1.1', 'method': 'GET',
            'headers': [], 'path': '/health',
            'query_string': b'', 'root_path': '',
            'scheme': 'https', 'server': ('localhost', 443),
        }
        resp = {}; body_parts = []

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
        print(f"✓  GET /health → {status} {body.decode()[:80]}")
    else:
        print(f"✗  GET /health → {status} {body.decode()[:200]}")
except Exception as e:
    print(f"✗  Simulate FAILED: {e}")
    import traceback; traceback.print_exc()

# ── 6. Restart Passenger ──────────────────────────────────────────────────────

print("\n--- Restarting Passenger ---")
tmp_dir = os.path.join(BASE_DIR, 'tmp')
os.makedirs(tmp_dir, exist_ok=True)
restart_file = os.path.join(tmp_dir, 'restart.txt')
try:
    open(restart_file, 'w').close()
    print(f"✓  Touched {restart_file} — Passenger will restart")
except Exception as e:
    print(f"⚠  Could not touch restart.txt: {e}")
    print("   Run manually: touch /home2/fixitblu/backend/tmp/restart.txt")

print("\n" + "="*60)
print("  Done. Test: curl https://api.fixit-bluetechnology.co.ke/health")
print("="*60 + "\n")
