# BlueTech Session Log — 2026-09-29 / 2026-09-30

## What We Did

### Problem
After migrating backend from Render to cPanel, the app broke with:
- `ModuleNotFoundError: No module named 'pydantic_settings'`
- `pip install --user` failing inside virtualenv
- `input()` crashing in non-interactive SSH sessions
- `SUPABASE_KEY` and `SUPABASE_SERVICE_KEY` missing from `.env` on server
- Frontend showing blank page (no data loading)

---

### Fixes Applied

#### 1. Created `backend/cpanel_patch.py`
A one-shot script that runs on the cPanel server and fixes everything:
- Writes `SUPABASE_KEY` and `SUPABASE_SERVICE_KEY` directly into `.env`
- Installs `pydantic-settings` without `--user` flag (works in virtualenv)
- Rewrites `passenger_wsgi.py` with correct `sys.path` (adds `APP_DIR`)
- Verifies app import (101 routes)
- Pings Supabase (anon + admin queries)
- Simulates `GET /health` → 200
- Touches `tmp/restart.txt` to restart Passenger

**Run on server:**
```bash
cd /home2/fixitblu/backend && python3 cpanel_patch.py
```

**Result:** All 7 steps passed. Backend fully operational.

#### 2. Backend Verification
- `GET /health` → `{"status":"healthy","version":"2.0.0"}`
- 101 routes registered
- Supabase anon + admin queries working
- Passenger running

#### 3. Frontend `.env` (local dev only)
Updated `client/.env`:
```
VITE_API_BASE_URL=https://api.fixit-bluetechnology.co.ke/api/v1
```
Note: This file is gitignored. Production builds get the URL from the GitHub Actions workflow which already has the correct value.

#### 4. Created `backend/test_cors.py`
Tests CORS headers from the frontend origin internally on the server.
```bash
cd /home2/fixitblu/backend && python3 test_cors.py
```
Result: All CORS checks passed.

---

## Production URLs
| Service | URL |
|---------|-----|
| Frontend (client) | https://fixit-bluetechnology.co.ke |
| Backend API | https://api.fixit-bluetechnology.co.ke |
| Admin panel | https://admin.fixit-bluetechnology.co.ke (not tested yet) |
| cPanel | https://fixit-bluetechnology.co.ke:2083 |

---

## Test Results (2026-09-30)

### `test_endpoints.py` — 58/60 passed
```
BASE_URL=https://api.fixit-bluetechnology.co.ke .venv/bin/pytest tests/test_endpoints.py -v
```

### `test_admin_endpoints.py` — 76/79 passed (1 skipped)
```
BASE_URL=https://api.fixit-bluetechnology.co.ke .venv/bin/pytest tests/test_admin_endpoints.py -v
```

---

## Known Failures (Deferred)

### 1. CSV Export Timeout
**Endpoints:**
- `GET /api/v1/admin/export/orders`
- `GET /api/v1/admin/export/bookings`

**Error:** `500 Request Timeout` — cPanel's connection timeout is too short for the export query which fetches all records at once.

**Fix needed:** Optimize the export query (add pagination or streaming) OR increase cPanel's connection timeout in WHM.

---

### 2. Places Autocomplete 503
**Endpoint:** `GET /api/v1/places/autocomplete?input=Nairobi`

**Error:** `503` — No Google Maps API key set in `.env` on the server. The endpoint should return 400/500 cleanly when the key is missing but instead crashes with 503.

**Fix needed:** Either set `GOOGLE_MAPS_API_KEY` in `/home2/fixitblu/backend/.env` OR fix the endpoint to handle missing key gracefully (return 400 instead of 503).

---

### 3. SMS Credits Depleted
OTP/verification SMS credits (TextPie) were exhausted during testing. Client has been notified to top up. Once topped up, re-run auth tests to verify.

---

## Repo Info
| Remote | URL |
|--------|-----|
| bt254 (deployment) | https://github.com/bluetech254/bluetech.git |
| origin (personal) | https://github.com/fagierrands1/bluetech.git |

**Active branches:**
- `main` — development
- `production` — triggers CI/CD deploy

**CI/CD deploys via GitHub Actions on `production` branch push.**

---

## Next Steps (Pending)
1. Fix CSV export timeout
2. Fix Places 503 (add Google Maps key or fix error handling)
3. Test Admin panel (`admin.fixit-bluetechnology.co.ke`) — not done yet
4. Top up SMS credits and re-verify OTP flow
5. Sync `origin` remote (fagierrands1) — 29 commits behind `bt254`
