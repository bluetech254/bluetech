#!/usr/bin/env python3
"""
patch_cors.py — Patch CORS_ORIGINS and FRONTEND_URL in the live .env.
Run on cPanel: python3 patch_cors.py
"""
import os, time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(BASE_DIR, ".env")

CORRECT_CORS    = "https://fixit-bluetechnology.co.ke,https://admin.fixit-bluetechnology.co.ke"
CORRECT_FRONTEND = "https://fixit-bluetechnology.co.ke"

if not os.path.exists(ENV_FILE):
    print(f"ERROR: {ENV_FILE} not found"); exit(1)

with open(ENV_FILE) as f:
    lines = f.readlines()

updated = []
changed = []
for line in lines:
    if line.startswith("CORS_ORIGINS="):
        old = line.strip()
        line = f"CORS_ORIGINS={CORRECT_CORS}\n"
        changed.append(f"  {old}\n  → CORS_ORIGINS={CORRECT_CORS}")
    elif line.startswith("FRONTEND_URL="):
        old = line.strip()
        line = f"FRONTEND_URL={CORRECT_FRONTEND}\n"
        changed.append(f"  {old}\n  → FRONTEND_URL={CORRECT_FRONTEND}")
    updated.append(line)

with open(ENV_FILE, "w") as f:
    f.writelines(updated)

print("Patched .env:")
for c in changed:
    print(c)

# Restart Passenger
tmp = os.path.join(BASE_DIR, "tmp")
os.makedirs(tmp, exist_ok=True)
open(os.path.join(tmp, "restart.txt"), "w").write(str(time.time()))
print("\n✓ Passenger restarted (tmp/restart.txt touched)")
print("\nDone. CORS now allows:")
print(f"  {CORRECT_CORS}")
