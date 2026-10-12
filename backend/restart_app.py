#!/usr/bin/env python3
"""
restart_app.py — Force Passenger to restart the app.
Run this on cPanel after any deployment.
"""
import os
import time

BASE_DIR = '/home2/fixitblu/backend'
tmp_dir  = os.path.join(BASE_DIR, 'tmp')
os.makedirs(tmp_dir, exist_ok=True)

restart_file = os.path.join(tmp_dir, 'restart.txt')

# Touch it twice with a pause to ensure Passenger notices the mtime change
for i in range(3):
    with open(restart_file, 'w') as f:
        f.write(str(time.time()))
    time.sleep(1)

print(f"✓ Touched {restart_file} x3 — Passenger will restart on next request")
print("  Wait 5 seconds then test: https://api.fixit-bluetechnology.co.ke/health")
