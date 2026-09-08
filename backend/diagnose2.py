"""
Deep diagnostic — simulates exactly what Passenger does when loading passenger_wsgi.py
and making a real HTTP request to the app.
Run via: cPanel -> Setup Python App -> Execute Python Script -> diagnose2.py
"""
import sys
import os
import traceback

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

print("=" * 60)
print("DEEP DIAGNOSTIC - PASSENGER SIMULATION")
print("=" * 60)
print(f"BASE_DIR: {BASE_DIR}")
print(f"CWD: {os.getcwd()}")

# Step 1: Load .env
print("\n[1] Loading .env ...")
from dotenv import load_dotenv
loaded = load_dotenv(os.path.join(BASE_DIR, '.env'))
print(f"    load_dotenv returned: {loaded}")
print(f"    SUPABASE_ANON_KEY set: {bool(os.getenv('SUPABASE_ANON_KEY'))}")
print(f"    SUPABASE_SERVICE_KEY set: {bool(os.getenv('SUPABASE_SERVICE_KEY'))}")

# Step 2: Import config and check values
print("\n[2] Importing config ...")
try:
    from app.config import settings
    print(f"    SUPABASE_URL: {settings.SUPABASE_URL}")
    print(f"    SUPABASE_ANON_KEY: {'SET (len=' + str(len(settings.SUPABASE_ANON_KEY)) + ')' if settings.SUPABASE_ANON_KEY else 'EMPTY'}")
    print(f"    SUPABASE_SERVICE_KEY: {'SET (len=' + str(len(settings.SUPABASE_SERVICE_KEY)) + ')' if settings.SUPABASE_SERVICE_KEY else 'EMPTY'}")
    print(f"    DEBUG: {settings.DEBUG}")
    print(f"    CORS_ORIGINS: {settings.CORS_ORIGINS}")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()

# Step 3: Test database connection
print("\n[3] Testing Supabase connection ...")
try:
    from supabase import create_client
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    print("    Supabase anon client created OK")
    # Try a simple query
    result = client.table('products').select('id').limit(1).execute()
    print(f"    Test query OK — got {len(result.data)} row(s)")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()

# Step 4: Import full app
print("\n[4] Importing app.main ...")
try:
    from app.main import app
    print(f"    app imported OK — {len(app.routes)} routes")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()
    sys.exit(1)

# Step 5: Wrap with a2wsgi
print("\n[5] Wrapping with ASGIMiddleware ...")
try:
    from a2wsgi import ASGIMiddleware
    application = ASGIMiddleware(app)
    print("    ASGIMiddleware OK")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()
    sys.exit(1)

# Step 6: Simulate a real WSGI request to GET /
print("\n[6] Simulating GET / request ...")
try:
    import io
    environ = {
        'REQUEST_METHOD': 'GET',
        'PATH_INFO': '/',
        'SERVER_NAME': 'localhost',
        'SERVER_PORT': '8000',
        'HTTP_HOST': 'api.fixit-bluetechnology.co.ke',
        'wsgi.input': io.BytesIO(b''),
        'wsgi.errors': sys.stderr,
        'wsgi.multithread': False,
        'wsgi.multiprocess': False,
        'wsgi.run_once': False,
        'wsgi.url_scheme': 'https',
    }
    response_started = []
    def start_response(status, headers, exc_info=None):
        response_started.append((status, headers))

    body = b''.join(application(environ, start_response))
    if response_started:
        print(f"    Response status: {response_started[0][0]}")
        print(f"    Response body: {body[:300]}")
    else:
        print("    No response received")
except Exception as e:
    print(f"    ERROR during request: {e}")
    traceback.print_exc()

# Step 7: Simulate GET /api/v1/products
print("\n[7] Simulating GET /api/v1/products ...")
try:
    environ['PATH_INFO'] = '/api/v1/products'
    response_started2 = []
    def start_response2(status, headers, exc_info=None):
        response_started2.append((status, headers))

    body2 = b''.join(application(environ, start_response2))
    if response_started2:
        print(f"    Response status: {response_started2[0][0]}")
        print(f"    Response body: {body2[:300]}")
    else:
        print("    No response received")
except Exception as e:
    print(f"    ERROR: {e}")
    traceback.print_exc()

# Step 8: Check for common cPanel issues
print("\n[8] Checking cPanel environment issues ...")
print(f"    HOME: {os.getenv('HOME')}")
print(f"    USER: {os.getenv('USER')}")
print(f"    PASSENGER_APP_ROOT: {os.getenv('PASSENGER_APP_ROOT', 'not set')}")
print(f"    PYTHONPATH: {os.getenv('PYTHONPATH', 'not set')}")

# Check if there's a tmp dir writable (needed by some libs)
tmp_writable = os.access('/tmp', os.W_OK)
print(f"    /tmp writable: {tmp_writable}")

print("\n" + "=" * 60)
print("DEEP DIAGNOSTIC COMPLETE")
print("=" * 60)
