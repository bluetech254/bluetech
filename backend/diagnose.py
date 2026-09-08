"""
Diagnostic script for cPanel Python App deployment.
Run via: cPanel -> Setup Python App -> Execute Python Script -> diagnose.py
"""
import sys
import os

print("=" * 60)
print("BLUETECH BACKEND DIAGNOSTICS")
print("=" * 60)

# 1. Python version
print(f"\n[1] Python version: {sys.version}")
print(f"[1] Python executable: {sys.executable}")

# 2. Working directory and sys.path
print(f"\n[2] Working directory: {os.getcwd()}")
print(f"[2] Script location: {os.path.dirname(os.path.abspath(__file__))}")
print(f"[2] sys.path: {sys.path[:5]}")

# 3. Check .env file exists and is readable
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
print(f"\n[3] Looking for .env at: {env_path}")
print(f"[3] .env exists: {os.path.exists(env_path)}")
if os.path.exists(env_path):
    print(f"[3] .env size: {os.path.getsize(env_path)} bytes")
    # Print keys only (not values) for security
    with open(env_path) as f:
        keys = [line.split('=')[0].strip() for line in f if '=' in line and not line.startswith('#')]
    print(f"[3] .env keys found: {keys}")

# 4. Load dotenv
print("\n[4] Loading .env ...")
try:
    from dotenv import load_dotenv
    load_dotenv(env_path)
    print("[4] dotenv loaded OK")
except ImportError as e:
    print(f"[4] ERROR: {e}")

# 5. Check critical env vars are set
print("\n[5] Checking environment variables:")
keys_to_check = [
    'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY',
    'JWT_SECRET', 'ADMIN_PASSWORD', 'DEBUG', 'CORS_ORIGINS',
    'API_HOST', 'API_PORT'
]
for key in keys_to_check:
    val = os.getenv(key)
    if val:
        # Show only first 20 chars for secrets
        preview = val[:20] + '...' if len(val) > 20 else val
        print(f"[5]   {key} = {preview}  ✓")
    else:
        print(f"[5]   {key} = NOT SET  ✗")

# 6. Check required packages are installed
print("\n[6] Checking installed packages:")
packages = ['fastapi', 'uvicorn', 'supabase', 'dotenv', 'a2wsgi', 'passlib', 'jose', 'boto3', 'slowapi']
for pkg in packages:
    try:
        __import__(pkg)
        print(f"[6]   {pkg}  ✓")
    except ImportError:
        print(f"[6]   {pkg}  ✗ NOT INSTALLED")

# 7. Try importing the app
print("\n[7] Attempting to import app ...")
sys.path.insert(0, script_dir)
try:
    from app.config import settings
    print(f"[7] config imported OK")
    print(f"[7]   SUPABASE_URL = {settings.SUPABASE_URL[:30]}...")
    print(f"[7]   SUPABASE_ANON_KEY set: {bool(settings.SUPABASE_ANON_KEY)}")
    print(f"[7]   SUPABASE_SERVICE_KEY set: {bool(settings.SUPABASE_SERVICE_KEY)}")
except Exception as e:
    print(f"[7] ERROR importing config: {e}")

try:
    from app.main import app
    print(f"[7] app imported OK — routes: {len(app.routes)}")
except Exception as e:
    print(f"[7] ERROR importing app.main: {e}")
    import traceback
    traceback.print_exc()

# 8. Try a2wsgi bridge
print("\n[8] Checking a2wsgi bridge ...")
try:
    from a2wsgi import ASGIMiddleware
    application = ASGIMiddleware(app)
    print("[8] ASGIMiddleware wrapping OK ✓")
except Exception as e:
    print(f"[8] ERROR: {e}")

print("\n" + "=" * 60)
print("DIAGNOSTICS COMPLETE")
print("=" * 60)
