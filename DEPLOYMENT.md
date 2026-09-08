# BlueTech cPanel Deployment — 8 September 2026

## Overview

Full migration of the BlueTech platform from Render/Vercel to cPanel shared hosting at `fixit-bluetechnology.co.ke`. All three application components — backend API, frontend client, and admin panel — are now live on the client's own server.

---

## 1. Backend API

**URL:** https://api.fixit-bluetechnology.co.ke  
**Stack:** FastAPI (Python), Passenger WSGI, Python 3.x  
**Location on server:** `~/backend/`

### What was done

- Configured `passenger_wsgi.py` as the WSGI entry point for cPanel's Passenger server.
- Replaced `a2wsgi` with a custom `ASGIToWSGI` bridge using `asyncio` and `asgiref` for reliable ASGI→WSGI translation under Passenger.
- Added `asgiref==3.8.1` to `requirements.txt`.
- Fixed a `SystemError: Negative size passed to PyBytes_FromStringAndSize` crash caused by Passenger passing a negative `CONTENT_LENGTH` for POST requests — guarded the body read with an explicit length check.
- Updated `CORS_ORIGINS` in `app/config.py` to include all production domains:
  - `https://fixit-bluetechnology.co.ke`
  - `https://www.fixit-bluetechnology.co.ke`
  - `https://admin.fixit-bluetechnology.co.ke`

### Deployment method

- GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) — not used for backend; deployed via `git push` to `production` branch and cPanel Git deployment.
- cPanel → Setup Python App → Run Pip Install → Restart.

---

## 2. Frontend Client

**URL:** https://fixit-bluetechnology.co.ke  
**Stack:** React + Vite, static files  
**Location on server:** `~/public_html/`

### What was done

- Updated `.env.production` to point `VITE_API_BASE_URL` to the new backend URL.
- Created GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`) that:
  1. Installs npm dependencies.
  2. Builds the Vite app with production env vars.
  3. Injects an `.htaccess` file for React Router (prevents 404 on page refresh).
  4. FTP deploys `client/dist/` to `~/public_html/` via `SamKirkland/FTP-Deploy-Action`.
- Tested deployment — initially targeted `~/frontend/` but moved to `~/public_html/` after discovering the main domain document root could not be changed via cPanel UI.

### Secrets required (GitHub → Settings → Secrets)

| Secret | Value |
|---|---|
| `FTP_SERVER` | cPanel FTP hostname |
| `FTP_USERNAME` | cPanel FTP username |
| `FTP_PASSWORD` | cPanel FTP password |

---

## 3. Admin Panel

**URL:** https://admin.fixit-bluetechnology.co.ke  
**Stack:** Next.js 14, static export  
**Location on server:** `~/Admin/`

### What was done

#### Architecture change — Node.js → Static Export

The admin was originally a Next.js app with server-side features:
- A Passenger Node.js app was attempted first but failed due to CloudLinux's Node.js Selector requiring `node_modules` to be a symlink managed by its own virtualenv — conflicting with Next.js standalone bundled modules.
- No SSH or terminal access was available to resolve this manually.
- **Decision:** Convert admin to a fully static Next.js export — viable because the app had no `getServerSideProps` or server components.

#### Changes made

| File | Change |
|---|---|
| `admin/next.config.js` | Changed `output` from `standalone` to `export`; added `images.unoptimized: true` |
| `admin/lib/api.ts` | Changed `BASE` from `""` to `https://api.fixit-bluetechnology.co.ke`; replaced all `/api/proxy/` paths with `/api/v1/` |
| `admin/app/(app)/layout.tsx` | Rewrote from server component (used `cookies()` from `next/headers`) to client component with `useEffect` auth guard that redirects to `/login` if session is missing or expired |
| `admin/app/login/page.tsx` | Rewrote to call backend directly instead of `/api/auth`; switched from `httpOnly` cookie to JS-readable cookie (required for static/client-side auth) |
| `admin/app/api/` | Deleted entirely — all server-side API routes removed (proxy route + auth routes) |
| `admin/middleware.ts` | Deleted — middleware does not run in static export; replaced by client-side auth guard in layout |

#### Deployment method

GitHub Actions workflow (`.github/workflows/deploy-admin.yml`):
1. Installs npm dependencies.
2. Runs `next build` → outputs to `admin/out/`.
3. Injects `.htaccess` for client-side routing.
4. FTP deploys `admin/out/` to `~/Admin/`.

cPanel subdomain `admin.fixit-bluetechnology.co.ke` has document root set to `~/Admin/`.

---

## GitHub Branches

| Branch | Purpose |
|---|---|
| `main` | Source of truth — kept in sync with production |
| `production` | Triggers all GitHub Actions deploy workflows on push |

---

## GitHub Actions Workflows

| Workflow | Trigger | Deploys |
|---|---|---|
| `deploy-frontend.yml` | Push to `production` | `client/dist/` → `~/public_html/` |
| `deploy-admin.yml` | Push to `production` | `admin/out/` → `~/Admin/` |

---

## Known Issues / Notes

- The backend `passenger_wsgi.py` uses a custom ASGI→WSGI bridge. If the backend crashes, check `~/backend/stderr.log` in cPanel File Manager for Python tracebacks.
- The admin session cookie is not `httpOnly` (required for static/client-side auth). This is acceptable for an internal admin panel on HTTPS but worth noting.
- No SSH access is currently enabled on the cPanel account — all server changes must go through File Manager, cPanel UI, or git push.
