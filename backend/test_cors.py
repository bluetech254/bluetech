#!/usr/bin/env python3
"""
test_cors.py — Run this on the cPanel server to test if the backend
is correctly returning CORS headers to the frontend origin.

Run: cd /home2/fixitblu/backend && python3 test_cors.py
"""
import sys
import os

# Add app to path so we can import directly
BASE_DIR = '/home2/fixitblu/backend'
APP_DIR  = os.path.join(BASE_DIR, 'app')
for d in (BASE_DIR, APP_DIR):
    if d not in sys.path:
        sys.path.insert(0, d)
os.chdir(BASE_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, '.env'))

import asyncio
import json

SEP = "=" * 60
ok  = lambda m: print(f"  OK  {m}")
bad = lambda m: print(f"  XX  {m}")
inf = lambda m: print(f"  >>  {m}")

FRONTEND_ORIGIN = "https://fixit-bluetechnology.co.ke"

TESTS = [
    ("GET",     "/api/v1/products?limit=1",       "Products"),
    ("GET",     "/api/v1/repair-services?limit=1","Repair Services"),
    ("GET",     "/api/v1/delivery-zones",          "Delivery Zones"),
    ("OPTIONS", "/api/v1/products",                "Preflight OPTIONS"),
]

async def run_test(app, method, path, label):
    scope = {
        'type':         'http',
        'asgi':         {'version': '3.0'},
        'http_version': '1.1',
        'method':       method.upper(),
        'headers':      [
            (b'origin', FRONTEND_ORIGIN.encode()),
            (b'access-control-request-method', b'GET'),
            (b'access-control-request-headers', b'content-type,authorization'),
        ],
        'path':         path.split('?')[0],
        'query_string': (path.split('?')[1].encode() if '?' in path else b''),
        'root_path':    '',
        'scheme':       'https',
        'server':       ('localhost', 443),
    }

    resp_headers = {}
    status_code  = None
    body_parts   = []

    async def receive():
        return {'type': 'http.request', 'body': b'', 'more_body': False}

    async def send(message):
        nonlocal status_code
        if message['type'] == 'http.response.start':
            status_code = message['status']
            for k, v in message.get('headers', []):
                resp_headers[k.decode().lower()] = v.decode()
        elif message['type'] == 'http.response.body':
            body_parts.append(message.get('body', b''))

    await app(scope, receive, send)

    body = b''.join(body_parts)

    acao = resp_headers.get('access-control-allow-origin', 'MISSING')
    acam = resp_headers.get('access-control-allow-methods', 'MISSING')
    acah = resp_headers.get('access-control-allow-headers', 'MISSING')

    print(f"\n{SEP}\n  {label} [{method} {path.split('?')[0]}]\n{SEP}")
    print(f"  Status : {status_code}")
    print(f"  ACAO   : {acao}")
    print(f"  ACAM   : {acam}")

    if acao == FRONTEND_ORIGIN or acao == '*':
        ok(f"CORS header present — browser will accept this")
    else:
        bad(f"CORS header missing or wrong — browser will BLOCK this")
        bad(f"  Got: '{acao}'")
        bad(f"  Expected: '{FRONTEND_ORIGIN}' or '*'")

    # Try to parse body as JSON
    if body and status_code not in (204,):
        try:
            data = json.loads(body)
            if isinstance(data, list):
                ok(f"Response: {len(data)} items")
            elif isinstance(data, dict):
                ok(f"Response keys: {list(data.keys())[:5]}")
        except Exception:
            inf(f"Response (non-JSON, {len(body)} bytes): {body[:80]}")

    return acao in (FRONTEND_ORIGIN, '*')


async def main():
    # Clear cached modules
    for key in list(sys.modules.keys()):
        if any(key.startswith(x) for x in ('app', 'core', 'auth', 'orders',
                                            'bookings', 'products', 'devices')):
            del sys.modules[key]

    from app.main import app

    print(f"\n{'=' * 60}")
    print(f"  CORS Test — Origin: {FRONTEND_ORIGIN}")
    print(f"{'=' * 60}")

    results = []
    for method, path, label in TESTS:
        passed = await run_test(app, method, path, label)
        results.append((label, passed))

    print(f"\n{SEP}\n  SUMMARY\n{SEP}")
    all_pass = True
    for label, passed in results:
        if passed:
            ok(label)
        else:
            bad(label)
            all_pass = False

    print()
    if all_pass:
        print("  CORS is configured correctly — frontend should work.")
    else:
        print("  CORS is broken — frontend will be blocked.")
        print("  Check app/core/config.py CORS_ORIGINS setting.")
    print(f"{SEP}\n")


asyncio.run(main())
