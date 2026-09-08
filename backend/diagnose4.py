"""
Cache clear + passenger_wsgi verification diagnostic.
Run via: cPanel -> Setup Python App -> Execute Python Script -> diagnose4.py
"""
import sys
import os
import shutil

BASE_DIR = '/home2/fixitblu/backend'
print("=" * 60)
print("CACHE CLEAR + WSGI VERIFICATION")
print("=" * 60)

# 1. Show current passenger_wsgi.py content
print("\n[1] Current passenger_wsgi.py content:")
wsgi_path = os.path.join(BASE_DIR, 'passenger_wsgi.py')
with open(wsgi_path) as f:
    content = f.read()
print(content)

# 2. Clear all __pycache__ directories
print("\n[2] Clearing __pycache__ ...")
cleared = 0
for root, dirs, files in os.walk(BASE_DIR):
    for d in dirs:
        if d == '__pycache__':
            path = os.path.join(root, d)
            shutil.rmtree(path)
            print(f"    Removed: {path}")
            cleared += 1
    # Also remove .pyc files
    for f in files:
        if f.endswith('.pyc') or f.endswith('.pyo'):
            path = os.path.join(root, f)
            os.remove(path)
            print(f"    Removed: {path}")
            cleared += 1
print(f"    Total cleared: {cleared} items")

# 3. Check memory available
print("\n[3] Memory info:")
try:
    with open('/proc/meminfo') as f:
        for line in f:
            if any(k in line for k in ['MemTotal', 'MemFree', 'MemAvailable']):
                print(f"    {line.strip()}")
except:
    print("    Could not read /proc/meminfo")

# 4. Check process limits
print("\n[4] Process limits (ulimit):")
import resource
try:
    mem = resource.getrlimit(resource.RLIMIT_AS)
    print(f"    Virtual memory limit: {mem}")
    rss = resource.getrlimit(resource.RLIMIT_RSS)
    print(f"    RSS memory limit: {rss}")
except Exception as e:
    print(f"    {e}")

# 5. Try importing passenger_wsgi directly to see if application callable exists
print("\n[5] Importing passenger_wsgi to verify 'application' callable ...")
sys.path.insert(0, BASE_DIR)
os.chdir(BASE_DIR)
from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, '.env'))
try:
    import importlib.util
    spec = importlib.util.spec_from_file_location("passenger_wsgi", wsgi_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    if hasattr(mod, 'application'):
        print(f"    'application' callable found: {mod.application}")
        print(f"    Type: {type(mod.application)}")
        print("    ✓ Passenger should be able to find it")
    else:
        print("    ✗ 'application' NOT found in module!")
except Exception as e:
    print(f"    ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("DONE — Now restart the Python App in cPanel")
print("=" * 60)
