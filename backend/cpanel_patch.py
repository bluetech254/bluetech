#!/usr/bin/env python3
"""
cpanel_patch.py — Patches .env and installs pydantic-settings on cPanel.

Run:  cd /home2/fixitblu/backend && python3 cpanel_patch.py
"""
import sys, os, subprocess, traceback

BASE_DIR = '/home2/fixitblu/backend'
APP_DIR  = os.path.join(BASE_DIR, 'app')

for d in (BASE_DIR, APP_DIR):
    if d not in sys.path:
        sys.path.insert(0, d)
os.chdir(BASE_DIR)

SEP = "=" * 60
ok  = lambda m: print(f"  OK  {m}")
bad = lambda m: print(f"  XX  {m}")
inf = lambda m: print(f"  >>  {m}")

# ── 1. Patch .env ─────────────────────────────────────────────────────────────
print(f"\n{SEP}\n  1. Patch .env\n{SEP}")

SUPABASE_KEY         = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWVidnBlc2JrYmhvbGlkbHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjM4MjcsImV4cCI6MjA5ODI5OTgyN30.AngVW8RLlK6b8MeWHWYz0z2Pi0qVB65bsXjwA1pcdgc"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWVidnBlc2JrYmhvbGlkbHJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjcyMzgyNywiZXhwIjoyMDk4Mjk5ODI3fQ.B9u-wElfqgPDlstwTVR18CSKf2vVa3EKbrgFHcO_aPI"

env_path = os.path.join(BASE_DIR, '.env')
with open(env_path, 'r') as f:
    lines = f.readlines()

patched = {}
new_lines = []
for line in lines:
    if line.startswith('SUPABASE_KEY='):
        new_lines.append(f'SUPABASE_KEY={SUPABASE_KEY}\n')
        patched['SUPABASE_KEY'] = True
    elif line.startswith('SUPABASE_SERVICE_KEY='):
        new_lines.append(f'SUPABASE_SERVICE_KEY={SUPABASE_SERVICE_KEY}\n')
        patched['SUPABASE_SERVICE_KEY'] = True
    else:
        new_lines.append(line)

if 'SUPABASE_KEY' not in patched:
    new_lines.append(f'SUPABASE_KEY={SUPABASE_KEY}\n')
if 'SUPABASE_SERVICE_KEY' not in patched:
    new_lines.append(f'SUPABASE_SERVICE_KEY={SUPABASE_SERVICE_KEY}\n')

with open(env_path, 'w') as f:
    f.writelines(new_lines)

ok("SUPABASE_KEY written")
ok("SUPABASE_SERVICE_KEY written")

# ── 2. Install pydantic-settings ──────────────────────────────────────────────
print(f"\n{SEP}\n  2. Install pydantic-settings\n{SEP}")

try:
    import pydantic_settings
    ok(f"pydantic-settings already installed ({pydantic_settings.__version__})")
except ImportError:
    inf("Installing pydantic-settings ...")
    r = subprocess.run(
        [sys.executable, "-m", "pip", "install", "pydantic-settings"],
        capture_output=True, text=True
    )
    if r.returncode == 0:
        ok("pydantic-settings installed")
    else:
        bad(f"pip install failed:\n{r.stderr[-500:]}")
        sys.exit(1)

# ── 3. Write fixed passenger_wsgi.py ─────────────────────────────────────────
print(f"\n{SEP}\n  3. Write passenger_wsgi.py\n{SEP}")

wsgi = '\n'.join([
    "import sys, os, asyncio",
    "BASE_DIR = '/home2/fixitblu/backend'",
    "APP_DIR  = os.path.join(BASE_DIR, 'app')",
    "for d in (BASE_DIR, APP_DIR):",
    "    if d not in sys.path:",
    "        sys.path.insert(0, d)",
    "os.chdir(BASE_DIR)",
    "from dotenv import load_dotenv",
    "load_dotenv(os.path.join(BASE_DIR, '.env'))",
    "from app.main import app",
    "",
    "class ASGIToWSGI:",
    "    def __init__(self, asgi_app): self.asgi_app = asgi_app",
    "    def __call__(self, environ, start_response):",
    "        scope = {",
    "            'type':'http','asgi':{'version':'3.0'},",
    "            'http_version':environ.get('SERVER_PROTOCOL','HTTP/1.1').split('/')[-1],",
    "            'method':environ['REQUEST_METHOD'].upper(),",
    "            'headers':[(k[5:].lower().replace('_','-').encode(),v.encode())",
    "                       for k,v in environ.items() if k.startswith('HTTP_')]",
    "                      +[(b'content-type',environ.get('CONTENT_TYPE','').encode()),",
    "                        (b'content-length',environ.get('CONTENT_LENGTH','0').encode())],",
    "            'path':environ.get('PATH_INFO','/'),",
    "            'query_string':environ.get('QUERY_STRING','').encode(),",
    "            'root_path':environ.get('SCRIPT_NAME',''),",
    "            'scheme':environ.get('wsgi.url_scheme','https'),",
    "            'server':(environ.get('SERVER_NAME','localhost'),int(environ.get('SERVER_PORT',443))),",
    "        }",
    "        try: cl = int(environ.get('CONTENT_LENGTH') or 0)",
    "        except: cl = 0",
    "        if cl < 0: cl = 0",
    "        b = environ.get('wsgi.input',None)",
    "        req_body = b.read(cl) if (b and cl>0) else b''",
    "        rs=[]; rb=[]",
    "        async def run():",
    "            async def receive(): return {'type':'http.request','body':req_body,'more_body':False}",
    "            async def send(m):",
    "                if m['type']=='http.response.start': rs.append((m['status'],m.get('headers',[])))",
    "                elif m['type']=='http.response.body': rb.append(m.get('body',b''))",
    "            await self.asgi_app(scope,receive,send)",
    "        loop=asyncio.new_event_loop()",
    "        try: loop.run_until_complete(run())",
    "        finally: loop.close()",
    "        if rs:",
    "            sc,hd=rs[0]",
    "            p={200:'OK',201:'Created',204:'No Content',400:'Bad Request',",
    "               401:'Unauthorized',403:'Forbidden',404:'Not Found',",
    "               405:'Method Not Allowed',422:'Unprocessable Entity',",
    "               429:'Too Many Requests',500:'Internal Server Error'}",
    "            start_response(f'{sc} {p.get(sc,\"Unknown\")}',[(k.decode(),v.decode()) for k,v in hd])",
    "        else: start_response('500 Internal Server Error',[('Content-Type','text/plain')])",
    "        return rb",
    "",
    "application = ASGIToWSGI(app)",
    "",
])

with open(os.path.join(BASE_DIR, 'passenger_wsgi.py'), 'w') as f:
    f.write(wsgi)
ok("passenger_wsgi.py written")

# ── 4. Load env and verify app import ────────────────────────────────────────
print(f"\n{SEP}\n  4. Verify App Import\n{SEP}")

from dotenv import load_dotenv
load_dotenv(env_path, override=True)

for key in list(sys.modules.keys()):
    if any(key.startswith(x) for x in ('app','admin_auth','core','auth','orders',
                                        'bookings','products','devices','payments')):
        del sys.modules[key]
try:
    from app.main import app
    routes = [r for r in app.routes if hasattr(r, 'path')]
    ok(f"app imported — {len(routes)} routes")
except Exception as e:
    bad(f"Import FAILED: {e}")
    traceback.print_exc()
    sys.exit(1)

# ── 5. Supabase ping ──────────────────────────────────────────────────────────
print(f"\n{SEP}\n  5. Supabase Ping\n{SEP}")
try:
    from app.core.database import supabase, supabase_admin
    r = supabase.table("products").select("id").limit(1).execute()
    ok(f"anon query — {len(r.data)} row(s)")
    r2 = supabase_admin.table("admins").select("id").limit(1).execute()
    ok(f"admin query — {len(r2.data)} row(s)")
except Exception as e:
    bad(f"Supabase: {e}")

# ── 6. Simulate /health ───────────────────────────────────────────────────────
print(f"\n{SEP}\n  6. Simulate GET /health\n{SEP}")
try:
    import asyncio
    async def sim():
        scope={'type':'http','asgi':{'version':'3.0'},'http_version':'1.1',
               'method':'GET','headers':[],'path':'/health','query_string':b'',
               'root_path':'','scheme':'https','server':('localhost',443)}
        resp={}; parts=[]
        async def receive(): return {'type':'http.request','body':b'','more_body':False}
        async def send(m):
            if m['type']=='http.response.start': resp['status']=m['status']
            elif m['type']=='http.response.body': parts.append(m.get('body',b''))
        await app(scope,receive,send)
        return resp.get('status'),b''.join(parts)
    status,body = asyncio.run(sim())
    (ok if status==200 else bad)(f"GET /health -> {status}  {body.decode()[:100]}")
except Exception as e:
    bad(f"Simulate: {e}"); traceback.print_exc()

# ── 7. Restart Passenger ──────────────────────────────────────────────────────
print(f"\n{SEP}\n  7. Restart Passenger\n{SEP}")
tmp = os.path.join(BASE_DIR,'tmp')
os.makedirs(tmp, exist_ok=True)
try:
    open(os.path.join(tmp,'restart.txt'),'w').close()
    ok("Passenger restart triggered")
except Exception as e:
    bad(str(e))

print(f"\n{SEP}")
print("  DONE — test: curl https://api.fixit-bluetechnology.co.ke/health")
print(f"{SEP}\n")
