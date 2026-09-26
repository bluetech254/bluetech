# BlueTech System Audit Report
**Date:** 2026-09-26  
**Auditor:** Kiro AI  
**Scope:** Full system — Backend, Frontend (Client), Admin Panel  
**Dimensions:** Security · Reliability · Scalability · Performance · Developer Experience · UI/UX

---

## EXECUTIVE SUMMARY

BlueTech was built fast. The system works, but it carries a significant number of security vulnerabilities, architectural duplications, and technical debts that must be resolved before the platform can be considered production-ready. The most critical issues are in authentication and payment handling.

**Overall System Rating: 4.5 / 10**

| Dimension           | Backend | Frontend | Admin |
|---------------------|---------|----------|-------|
| Security            | 3/10    | 6/10     | 4/10  |
| Reliability         | 5/10    | 6/10     | 5/10  |
| Scalability         | 5/10    | 6/10     | 5/10  |
| Performance         | 5/10    | 6/10     | 6/10  |
| Developer Experience| 4/10    | 6/10     | 6/10  |
| UI/UX               | N/A     | 7/10     | 7/10  |

---

## SYSTEM ARCHITECTURE OVERVIEW

```
bluetech/
├── backend/
│   ├── main.py          ← LEGACY monolith (still active, no auth on writes)
│   └── app/             ← Modular structure (production-intended)
│       ├── api/         ← Route handlers per domain
│       ├── services/    ← Business logic
│       ├── models/      ← Pydantic schemas
│       ├── utils/       ← auth, mpesa, sms, email, audit
│       └── config.py
├── client/              ← React + Vite SPA (customer-facing)
│   └── src/
│       ├── api/         ← Axios wrappers
│       ├── contexts/    ← AuthContext, CartContext
│       ├── pages/
│       └── components/
├── admin/               ← Next.js admin panel
│   ├── app/(app)/       ← Protected pages
│   ├── lib/api.ts       ← Fetch wrapper + cookie auth
│   └── components/
└── supabase/            ← SQL migrations and RLS policies
```

**Critical architecture problem:** Two backends exist simultaneously — `backend/main.py` (legacy monolith) and `backend/app/` (modular). The legacy file has no auth guards on product writes, duplicate route definitions, and a broken `/api/v1/users/me` endpoint. It is unclear which one is deployed.

---

## DIMENSION 1: SECURITY

### 🔴 CRITICAL — Admin Password Hashing (SHA-256, Not bcrypt)

**File:** `backend/app/utils/auth.py`

```python
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${pwd_hash}"
```

SHA-256 is a general-purpose hashing algorithm — it is fast, which makes it trivial to brute-force with a GPU. Admin passwords MUST use bcrypt, argon2, or scrypt. The client auth in `backend/main.py` correctly uses bcrypt via `passlib`. The admin auth does not. This is a critical regression.

**Rating: 1/10**  
**Fix:** Replace with `passlib[bcrypt]` — already in `requirements.txt`.

---

### 🔴 CRITICAL — M-Pesa Callback Has No Signature Verification

**File:** `backend/app/api/payments.py`

```python
@router.post("/mpesa/callback")
def mpesa_callback(payload: dict):
    # No verification of who sent this request
    stk = payload.get("Body", {}).get("stkCallback", {})
    ...
    supabase.table("orders").update({"payment_status": "paid", ...})
```

Anyone on the internet can POST a fake Safaricom callback to `/api/v1/payments/mpesa/callback` with `ResultCode: 0` and a fake `CheckoutRequestID`, and orders will be marked as paid. Safaricom provides an IP whitelist and the callback URL should only accept traffic from Safaricom's known IP ranges.

**Rating: 1/10**  
**Fix:** Validate the source IP against Safaricom's published IP ranges, or implement HMAC validation if available.

---

### 🔴 CRITICAL — Legacy Backend Has No Auth on Product Writes

**File:** `backend/main.py`

```python
@app.post("/api/v1/products")
def create_product(product: ProductCreate):
    # No auth dependency — anyone can create products
    response = supabase.table("products").insert(product.dict()).execute()
```

`POST /api/v1/products`, `PUT /api/v1/products/{id}`, and `DELETE /api/v1/products/{id}` all lack authentication in the legacy `main.py`. If this file is deployed (or reachable), any anonymous user can create, modify, or deactivate products.

**Rating: 1/10**  
**Fix:** Remove or fully decommission `backend/main.py`. Only deploy `backend/app/`.

---

### 🔴 CRITICAL — Admin Token Stored in JS-Readable Cookie (No httpOnly)

**File:** `admin/app/login/page.tsx`

```javascript
document.cookie = `admin_session=${encodeURIComponent(JSON.stringify(session))}; 
  path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
// httpOnly is NOT set — JS can read this cookie
```

The entire admin session including the JWT token is stored in a cookie readable by JavaScript. Any XSS vulnerability (e.g., a malicious script injected via an unsanitized product description or order note) can steal the admin token and gain full admin access.

**Rating: 2/10**  
**Fix:** Use Next.js server-side auth (middleware + httpOnly cookies). The admin token should never be accessible from `document.cookie`.

---

### 🔴 CRITICAL — JWT Secret Falls Back to Random Value on Restart

**File:** `backend/app/utils/auth.py`

```python
SECRET_KEY = os.getenv("JWT_SECRET", secrets.token_hex(32))
```

If `JWT_SECRET` is not set in the environment, a new random secret is generated on every server start. This invalidates all existing tokens on every restart. Worse, if an attacker can predict or discover the secret (e.g., via error messages in debug mode), all tokens are compromised.

**Rating: 2/10**  
**Fix:** Remove the fallback. Raise an error at startup if `JWT_SECRET` is not set.

---

### 🟠 HIGH — Token Expiry is 30 Days

**File:** `backend/app/utils/auth.py`

```python
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days
```

This applies to BOTH client and admin tokens. A stolen token is valid for a month. There is no token revocation mechanism (no blocklist, no refresh token rotation). Admin tokens especially should expire in hours, not days.

**Rating: 3/10**  
**Fix:** Client: 7 days with refresh tokens. Admin: 8 hours, no refresh (require re-login).

---

### 🟠 HIGH — RLS Policies Expose All User Data

**File:** `supabase/002_rls_policies.sql`

```sql
CREATE POLICY "Anyone can view orders"
ON orders FOR SELECT USING (true);

CREATE POLICY "Anyone can view bookings"
ON bookings FOR SELECT USING (true);

CREATE POLICY "Anyone can view users"
ON users FOR SELECT USING (true);
```

Anyone with access to the Supabase anon key (which is embedded in the frontend build) can read every order, booking, and user record in the entire database. Full names, phone numbers, delivery addresses, and payment receipts are all publicly readable.

**Rating: 1/10**  
**Fix:** RLS policies should restrict reads to the owning user (`auth.uid() = user_id`). Service-role key (backend only) bypasses RLS for admin operations.

---

### 🟠 HIGH — Payment Initiation Has No Auth

**File:** `backend/app/api/payments.py`

```python
@router.post("/mpesa/initiate")
def mpesa_initiate(order_id: str):
    # No auth check — anyone can initiate an STK push to any phone number
```

Anyone who knows an `order_id` can trigger an M-Pesa STK push to the customer's phone. This can be used to spam customers with payment prompts or cause confusion.

**Rating: 3/10**  
**Fix:** Require the authenticated user's token and verify they own the order.

---

### 🟠 HIGH — DEBUG=True in Production Config

**File:** `backend/app/config.py`

```python
DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
```

Debug mode defaults to `True`. In FastAPI/Starlette, this can expose full stack traces in HTTP error responses, potentially leaking internal structure, file paths, and environment details.

**Rating: 3/10**  
**Fix:** Default to `False`. Set `DEBUG=True` only explicitly in development.

---

### 🟡 MEDIUM — Broken `/api/v1/users/me` Token Verification

**File:** `backend/main.py`

```python
@app.get("/api/v1/users/me")
def get_current_user(authorization: Optional[str] = None):
    token = authorization.replace("Bearer ", "")
    user_id = token.replace("token_", "")  # ← strips "token_" prefix, not JWT decode
    response = supabase.table("users").select("*").eq("id", user_id).single().execute()
```

This endpoint does not decode the JWT. It takes the token value, removes a `"token_"` prefix, and uses the remainder as a user ID directly. Anyone who knows a user UUID can call this endpoint without a valid token.

**Rating: 1/10**  
**Fix:** This entire endpoint in `main.py` is broken. Use `app/` version only.

---

### 🟡 MEDIUM — Verification Code Stored in Plain Text in Database

**File:** `backend/main.py` & `backend/app/services/auth_service.py`

OTP codes for phone verification and password reset are stored as plain text in the `users` table (`verification_code`, `reset_code` columns). A database breach exposes all active OTP codes.

**Fix:** Hash OTPs before storage and compare hashes on verification.

---

### 🟡 MEDIUM — CORS Allows Broad Origins

**File:** `backend/app/config.py`

CORS includes `http://localhost:3000` and `http://localhost:5173`. In production, localhost origins should be removed.

---

### 🟢 GOOD — Client Login Uses bcrypt

The client auth in `backend/main.py` uses `passlib[bcrypt]` correctly. The app/ auth service also uses proper hashing for clients.

### 🟢 GOOD — Admin Operations Properly Gated

In `backend/app/`, all product writes, order status changes, and booking updates require `Depends(get_current_admin)`. The admin JWT is properly decoded and verified.

### 🟢 GOOD — Generic Error Messages on Login

Admin login returns `"Invalid credentials"` regardless of whether the username or password is wrong — no user enumeration.

---

## DIMENSION 2: RELIABILITY

### 🔴 CRITICAL — Two Parallel Backends

`backend/main.py` and `backend/app/main.py` both define overlapping routes. The legacy file has:
- **Duplicate route definitions** — `/api/v1/repair-services` is defined twice in `main.py`. FastAPI silently uses the first definition.
- **Inconsistent business logic** — payment callback logic differs between the two files.
- **No clear entry point** — `Procfile`, `run.py`, and `passenger_wsgi.py` all exist, but it's not clear which is used in each environment.

**Rating: 3/10**

---

### 🟠 HIGH — No Transaction Handling on Order Creation

**File:** `backend/app/services/order_service.py` / `backend/main.py`

Order creation involves multiple database writes (insert order → insert order_items → update points). If any step fails midway, the database is left in an inconsistent state — e.g., an order exists but has no items.

**Fix:** Wrap multi-step writes in a Supabase RPC function or use a compensating transaction pattern.

---

### 🟠 HIGH — M-Pesa Status Polling Has No Timeout

The frontend polls `/api/v1/payments/mpesa/status/{order_id}` in a loop (see `MpesaWaitingModal.tsx`). There is no maximum poll duration and the backend has no TTL on pending payment states. A payment that fails silently leaves the order stuck at "pending" indefinitely.

---

### 🟡 MEDIUM — Cart State Not Persisted

**File:** `client/src/contexts/CartContext.tsx`

Cart items are stored only in React context (in-memory). Closing or refreshing the tab loses the entire cart. No `localStorage` or `sessionStorage` persistence exists.

---

### 🟡 MEDIUM — No Health Check for M-Pesa Credentials

If `MPESA_CONSUMER_KEY`, `MPESA_PASSKEY`, or `MPESA_CALLBACK_URL` are missing, the first payment attempt will fail at runtime with a generic 502 error. These should be validated at startup.

---

### 🟡 MEDIUM — Missing Error Boundaries in Frontend

Only one `ErrorBoundary` component exists (`client/src/components/common/ErrorBoundary.tsx`) and it's not wrapping individual route segments. A single crashed component can white-screen the entire app.

---

## DIMENSION 3: SCALABILITY

### 🟠 HIGH — Supabase Anon Key Used for All Client Queries

Both the client app and the backend use the Supabase anon key in many paths. The anon key + broken RLS means the database has no meaningful access control at the row level. Scaling user base without fixing RLS first means each new user can see all other users' data.

---

### 🟠 HIGH — No Pagination on Any List Endpoint

All list endpoints (`/api/v1/orders`, `/api/v1/products`, `/api/v1/bookings`) return the full result set with no limit or offset. As data grows, these endpoints will become slow and eventually time out.

**Fix:** Add `limit` and `offset` query params (or cursor-based pagination) to all list endpoints.

---

### 🟡 MEDIUM — No Caching Layer

Product catalog, delivery zones, and repair services are all static-ish data fetched on every request with no caching. These are good candidates for Redis or even a simple in-memory TTL cache.

---

### 🟡 MEDIUM — Rate Limiting Only on Auth Endpoints

`slowapi` is used only on register and login endpoints in `main.py`. The modular `app/` router does not consistently apply rate limiting to sensitive operations like OTP resend or payment initiation.

---

### 🟡 MEDIUM — No Background Job Queue

SMS sending, M-Pesa initiation, and points calculation all happen synchronously inside the HTTP request. A slow SMS provider or Safaricom API timeout will directly increase response latency for the user.

**Fix:** Use a task queue (e.g., Celery + Redis, or Supabase Edge Functions) for async side effects.

---

## DIMENSION 4: PERFORMANCE

### 🟠 HIGH — N+1 Query Risk on Order Creation

When creating an order, the backend fetches each product individually in a loop in some code paths. The `main.py` version uses `.in_()` correctly, but service layer implementations should be audited.

---

### 🟠 HIGH — No Database Indexes on Foreign Keys

The initial schema creates indexes on `phone_number` and `status`, but not on `user_id` foreign keys in `orders` and `bookings`. As order volume grows, "get user's orders" queries will perform full table scans.

---

### 🟡 MEDIUM — Product Images Are External URLs Only

Product images are stored as URLs. There's no CDN, image optimization, or lazy loading strategy defined in the frontend. Large images will slow down the shop page.

---

### 🟡 MEDIUM — Admin Panel Fetches All Data on Every Page Load

Admin pages fetch entire datasets (all orders, all bookings) with no pagination, search debouncing, or virtualized lists. With 10k+ records this will noticeably degrade the admin panel.

---

### 🟢 GOOD — Axios Interceptors Configured Properly

The client's `axios.ts` correctly adds auth headers, handles 401 responses, and has a 30-second timeout. No re-fetch storms were observed in the code.

---

## DIMENSION 5: DEVELOPER EXPERIENCE

### 🔴 CRITICAL — Two Entry Points, Unclear Which is Deployed

`backend/` has `Procfile`, `run.py`, `passenger_wsgi.py`, `fly.toml`, and `railway.json`. Each points to different entry points. A developer joining the project cannot quickly determine what actually runs in production.

**Fix:** Delete `main.py` (legacy), keep only `app/main.py`. Update all deployment configs to point to `app.main:app`.

---

### 🟠 HIGH — No `.env` Validation at Startup

Missing environment variables cause runtime failures, not startup failures. The app starts successfully even without `JWT_SECRET`, `MPESA_CONSUMER_KEY`, or `SUPABASE_SERVICE_KEY`, then crashes on first use.

**Fix:** Use `pydantic-settings` `BaseSettings` with required fields — it validates all env vars at import time.

---

### 🟠 HIGH — No Test Suite

There are zero test files in the entire repository (no `tests/`, no `__tests__/`, no `*.test.ts`, no `*.spec.py`). Every change is a leap of faith.

---

### 🟡 MEDIUM — Diagnose Scripts Left in Repo

`backend/diagnose.py`, `diagnose2.py`, `diagnose3.py`, `diagnose4.py` are committed to the repo. These are debugging artifacts that should not be in production code.

---

### 🟡 MEDIUM — `DEBUG=True` Defaults Expose Internal Errors

Already covered under Security, but worth noting as a DX problem too — developers pushing to production accidentally get debug mode on.

---

### 🟡 MEDIUM — No Shared Type Definitions Between Backend and Frontend

API response shapes are duplicated between Python Pydantic models and TypeScript `types/index.ts`. Schema changes require manual updates in two places with no safety net.

**Fix:** Consider auto-generating TypeScript types from OpenAPI schema (`openapi-typescript` tool).

---

### 🟢 GOOD — OpenAPI Docs Are Well-Structured

`backend/app/main.py` sets up Swagger UI and ReDoc with proper tag metadata, descriptions, and group separations. This is genuinely useful.

### 🟢 GOOD — Modular API Structure

The `app/api/` pattern with separate files per domain, services layer, and models layer is clean and the right direction.

---

## DIMENSION 6: UI/UX

### Frontend (Client)

**Rating: 7/10**

**Good:**
- Mobile-first responsive design with bottom tab bar navigation
- Cart drawer pattern is standard and expected
- Search modal with keyboard support
- Order tracking by phone number (no login required) — smart for this market
- Points/loyalty card UI is well implemented
- Toast notifications for key actions

**Issues:**
- Cart is lost on tab close — users lose their shopping context
- No skeleton loaders on product grid — blank flash before content loads
- No empty state illustration for zero-results search
- Checkout page is 26KB — likely doing too much in one component
- No offline/poor connectivity handling (no PWA, no retry logic)
- `BookRepairPage.tsx` is 28KB — a single giant component

---

### Admin Panel

**Rating: 7/10**

**Good:**
- Clean dark-mode dashboard with clear navigation
- Bulk order status update is useful
- CSV export functionality present
- Audit log for admin actions
- Analytics and revenue pages

**Issues:**
- Login page hardcodes the API URL (`const API = "https://api.fixit-bluetechnology.co.ke"`) — should use env var
- No loading skeleton on dashboard stats — numbers pop in suddenly
- No confirmation modal before destructive actions (deactivate product, cancel order)
- Admin session cookie is readable by JS (covered in Security)
- No idle timeout — admin stays logged in indefinitely until 8h cookie expires

---

## DEEP DIVE: TOKEN STORAGE & AUTH FLOWS

### Client Token Flow

```
Login → POST /api/v1/auth/login
      ← { access_token, user, expires_in }
         ↓
sessionStorage.setItem('bluetech_token', token)
sessionStorage.setItem('bluetech_user', JSON.stringify(user))
sessionStorage.setItem('bluetech_token_expiry', String(Date.now() + expires_in * 1000))
         ↓
axios interceptor reads from sessionStorage on every request
Authorization: Bearer <token>
```

**Storage: sessionStorage** ✅ Better than localStorage (not persisted across tabs), but token is still accessible from JS. True security requires httpOnly cookies.

**Expiry check:** Done client-side only — the backend also enforces JWT expiry. Client-side check is a UX improvement, not a security control.

**Token loss:** Closing the browser tab logs the user out. This is intentional by the dev but hurts UX on mobile where tab closing is common.

---

### Admin Token Flow

```
Login → POST /api/v1/admin/auth/login
      ← { access_token, admin }
         ↓
document.cookie = `admin_session=JSON({...admin, token}); SameSite=Lax; Secure`
         ↓
lib/api.ts reads cookie via document.cookie on every fetch call
Authorization: Bearer <token from cookie>
```

**Storage: Non-httpOnly cookie** ❌ JavaScript-readable. XSS = admin takeover.

**Why it was done this way:** Next.js static/client-side routing requires JS to read the cookie for auth checks. The correct fix is using Next.js middleware with httpOnly cookies and server-side session validation.

---

### Admin Password Hashing Comparison

| Component | Algorithm | Crackable? |
|-----------|-----------|------------|
| Client auth (`main.py`) | bcrypt via passlib | No — slow by design |
| Client auth (`app/auth_service.py`) | SHA-256 + salt | YES — GPU-crackable in hours |
| Admin auth (`app/utils/auth.py`) | SHA-256 + salt | YES — GPU-crackable in hours |

Both the app-level client auth service AND the admin auth use SHA-256. Only the legacy `main.py` client auth uses bcrypt correctly.

---

### JWT Token Details

| Property | Value | Assessment |
|----------|-------|------------|
| Algorithm | HS256 | Acceptable |
| Secret source | `JWT_SECRET` env var | ✅ |
| Secret fallback | `secrets.token_hex(32)` on restart | ❌ Invalidates all tokens on restart |
| Expiry | 30 days | ❌ Too long — no revocation |
| Revocation | None | ❌ No blocklist |
| Client token claims | `{ user_id, exp }` | ✅ |
| Admin token claims | `{ admin_id, username, role, exp }` | ✅ Role included |
| Two backend secrets | `main.py` uses `os.getenv("JWT_SECRET")`, `app/utils/auth.py` also uses `JWT_SECRET` | ⚠️ Same secret but different code paths |

---

### M-Pesa Payment Security

| Check | Status |
|-------|--------|
| STK Push initiated by authenticated user | ❌ No auth on `/mpesa/initiate` |
| Callback URL restricted to Safaricom IPs | ❌ Open to anyone |
| Callback HMAC/signature verification | ❌ Not implemented |
| CheckoutRequestID uniqueness enforced | ✅ Matched before marking paid |
| Idempotent callback handling | ✅ Already-paid check exists |
| Booking final payment requires admin auth | ✅ `Depends(get_current_admin)` |
| Amount tamper protection | ✅ Amount comes from DB, not client |

---

## PRIORITY REMEDIATION PLAN

### P0 — Fix Immediately (Production Blockers)

1. **Admin password hashing** — Replace SHA-256 with bcrypt in `app/utils/auth.py`
2. **M-Pesa callback verification** — Add Safaricom IP whitelist or signature check
3. **Legacy `main.py`** — Remove or disable. It has no auth on product writes and broken user endpoints
4. **RLS policies** — Restrict orders/bookings/users reads to owning user or service role

### P1 — Fix Before Next Release

5. **Admin cookie** — Migrate to httpOnly cookie via Next.js middleware
6. **JWT secret fallback** — Remove fallback, crash at startup if unset
7. **Payment initiation auth** — Require authenticated user to initiate their own payment
8. **Token expiry** — Client: 7 days + refresh. Admin: 8 hours, no refresh

### P2 — Fix This Sprint

9. **Pagination** — Add `limit`/`offset` to all list endpoints
10. **Cart persistence** — Persist cart to localStorage with expiry
11. **Env validation** — Use `pydantic-settings` BaseSettings with required fields
12. **Remove diagnose scripts** — Delete `diagnose*.py` from repo
13. **Rate limiting** — Apply to OTP resend and payment initiation
14. **Missing indexes** — Add `user_id` indexes on orders and bookings tables

### P3 — Technical Debt

15. **Write tests** — At minimum: auth flows, payment callback, order creation
16. **Background jobs** — Move SMS and M-Pesa calls off the request thread
17. **Shared types** — Generate TypeScript from OpenAPI schema
18. **Error boundaries** — Wrap route segments in ErrorBoundary
19. **OTP hashing** — Hash verification codes before storage
20. **Debug flag** — Default DEBUG to False in config

---

## SYSTEM ISOLATION READINESS

The current structure is partially modular but has critical cross-contamination:

| Component | Current State | Isolation Ready? |
|-----------|--------------|-----------------|
| backend/app/api/ | One file per domain ✅ | Yes — needs cleanup |
| backend/app/services/ | One file per domain ✅ | Yes |
| backend/app/models/ | One file per domain ✅ | Yes |
| backend/main.py | Monolith ❌ | Must be deleted first |
| client/src/api/ | One file per domain ✅ | Yes |
| client/src/contexts/ | Mixed (auth + cart) | Separable |
| admin/lib/api.ts | Single giant file | Needs splitting |
| admin/app/(app)/ | One file per page ✅ | Yes |

**Recommendation:** The backend `app/` structure is already close to the isolated pattern you want. The main action is deleting `backend/main.py` so there is only one backend, then ensuring each `app/api/` file only imports from its own `service` and `model`. No horizontal imports between domains.

---

*End of Audit Report*
