# Backend Full Fix + Isolation Plan
**Date:** 2026-09-26  
**Goal:** Delete all legacy/useless files → fix every security defect → isolate every component into its own folder with all its code  

---

## PHASE 0 — DELETE EVERYTHING USELESS (Do This First)

These files are dead weight. Delete them before touching anything else.

### Files to DELETE

```
backend/main.py                  ← legacy monolith, no auth on writes, broken user endpoint, duplicate routes
backend/diagnose.py              ← debug artifact
backend/diagnose2.py             ← debug artifact
backend/diagnose3.py             ← debug artifact
backend/diagnose4.py             ← debug artifact
backend/passenger_wsgi.py        ← cPanel WSGI adapter, not used with Railway/Fly
backend/fly.toml                 ← Fly.io config (using Railway)
backend/supabase/005_add_auth.sql          ← 1-line stub, superseded by 005_add_auth_complete.sql
```

### Files to KEEP

```
backend/
├── run.py                        ← local dev runner (keep, fix entry point)
├── Procfile                      ← Railway start command (keep, fix)
├── railway.json                  ← Railway config (keep)
├── Dockerfile                    ← container build (keep)
├── entrypoint.sh                 ← container start (keep)
├── requirements.txt              ← dependencies (keep, add pydantic-settings)
├── .env.example                  ← (keep, update)
├── .dockerignore                 ← (keep)
├── README.md                     ← (keep, update)
├── migrations/                   ← (keep)
├── supabase/
│   └── 005_add_auth_complete.sql ← (keep)
└── app/                          ← THIS IS THE REAL BACKEND
```

---

## PHASE 1 — THE NEW ISOLATED FOLDER STRUCTURE

Every component lives in its own folder. All the code for that component is in that folder. To use another component you import from its folder. Nothing is spread across the project.

### Target Structure

```
backend/app/
│
├── core/                          ← App-wide infrastructure (no domain logic)
│   ├── __init__.py
│   ├── config.py                  ← All env vars, validated at startup
│   ├── database.py                ← Supabase client singletons
│   ├── security.py                ← JWT encode/decode, bcrypt hashing
│   ├── exceptions.py              ← Base exception classes
│   └── startup.py                 ← Startup validation (env check)
│
├── auth/                          ← Client authentication domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/auth/*
│   ├── service.py                 ← signup, login, verify_phone, reset_password
│   ├── models.py                  ← Pydantic schemas (UserSignup, UserLogin, etc.)
│   └── dependencies.py            ← get_current_user() dependency
│
├── admin_auth/                    ← Admin authentication domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/admin/auth/*
│   ├── service.py                 ← admin login, create admin, deactivate
│   ├── models.py                  ← AdminLoginRequest, AdminCreateRequest, etc.
│   └── dependencies.py            ← get_current_admin(), require_superadmin()
│
├── products/                      ← Products domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/products/*
│   ├── service.py                 ← get_products, create, update, deactivate
│   └── models.py                  ← ProductCreate, ProductUpdate, ProductResponse
│
├── orders/                        ← Orders domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/orders/*
│   ├── service.py                 ← create_order, get_orders, update_status, track
│   └── models.py                  ← OrderCreate, OrderItem, StatusUpdate
│
├── bookings/                      ← Repair bookings domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/bookings/*
│   ├── service.py                 ← create_booking, update_status, update_cost, track
│   └── models.py                  ← BookingCreate, CostUpdate, StatusUpdate
│
├── payments/                      ← M-Pesa payments domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/payments/*
│   ├── service.py                 ← stk_push, stk_query, process_callback
│   ├── models.py                  ← PaymentInitiateRequest, CallbackPayload
│   └── mpesa.py                   ← Raw Safaricom API calls (access token, STK, query)
│
├── points/                        ← Loyalty + referrals domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/points/*
│   ├── service.py                 ← award_points, redeem, resolve_referral, leaderboard
│   └── models.py                  ← RedeemRequest, PointsResponse
│
├── services/                      ← Repair services catalog domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/repair-services/*
│   ├── service.py                 ← get_services, get_categories
│   └── models.py                  ← RepairServiceResponse
│
├── delivery/                      ← Delivery zones domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/delivery-zones/*
│   ├── service.py                 ← get_active_zones
│   └── models.py                  ← DeliveryZone
│
├── tracking/                      ← Public tracking domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/track/*
│   └── service.py                 ← track_by_phone (orders + bookings)
│
├── admin_ops/                     ← Admin operations domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/admin/*
│   ├── service.py                 ← dashboard, export, bulk_status, referrals, history
│   └── models.py                  ← BulkStatusUpdate, etc.
│
├── devices/                       ← Device brands/models/pricing domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/admin/devices/*
│   ├── service.py                 ← CRUD for brands, models, service_pricing
│   └── models.py                  ← BrandBody, ModelBody, PricingBody
│
├── contact/                       ← Contact form domain
│   ├── __init__.py
│   ├── router.py                  ← FastAPI routes  /api/v1/contact/*
│   └── service.py                 ← save_message, send_notification
│
├── places/                        ← Google Places autocomplete proxy
│   ├── __init__.py
│   └── router.py                  ← FastAPI routes  /api/v1/places/*
│
├── notifications/                 ← Shared notification utilities
│   ├── __init__.py
│   ├── sms.py                     ← send_sms() — Africa's Talking / AT
│   └── email.py                   ← send_email() — SMTP / SendGrid
│
└── main.py                        ← App factory ONLY — imports routers, sets up CORS, mounts
```

### Import Rule (Strict)
- A domain folder imports from `core/` freely
- A domain imports from `notifications/` freely  
- A domain NEVER imports from another domain's `service.py` directly
- Cross-domain calls go through the other domain's `service.py` using a clean function call (not inline DB queries)
- `main.py` only imports routers, never services

---

## PHASE 2 — SECURITY FIXES (Applied During Isolation)

Fix every defect as you build each isolated component. Do not fix-then-move — fix-while-moving.

---

### FIX 1: Password Hashing — core/security.py

**Problem:** `app/utils/auth.py` uses SHA-256 + salt. Admin passwords are crackable.  
**Fix:** Use bcrypt everywhere. `passlib` is already installed.

```python
# core/security.py
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os, secrets

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

**All existing admin + user password hashes in the database are SHA-256 format.**  
Action: on next login, if `verify_password` fails with bcrypt, fall back to SHA-256 check and re-hash on success. One migration login cycle — no forced reset needed.

```python
def verify_and_rehash(plain: str, stored_hash: str, user_id: str, table: str) -> bool:
    """Try bcrypt first, fall back to SHA-256, re-hash if old format detected."""
    if pwd_context.verify(plain, stored_hash):
        return True
    # Legacy SHA-256 check
    if _sha256_verify(plain, stored_hash):
        new_hash = hash_password(plain)
        supabase_admin.table(table).update({"password": new_hash}).eq("id", user_id).execute()
        return True
    return False
```

---

### FIX 2: JWT Secret — core/security.py

**Problem:** Falls back to random value on restart, invalidating all sessions.  
**Fix:** Crash at startup if not set.

```python
# core/security.py
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required and not set")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES_CLIENT = 7 * 24 * 60   # 7 days
ACCESS_TOKEN_EXPIRE_MINUTES_ADMIN  = 8 * 60         # 8 hours
```

---

### FIX 3: JWT Expiry — core/security.py

**Problem:** 30-day expiry on all tokens. Admin tokens should be 8 hours.  
**Fix:** Separate expiry per token type.

```python
def create_client_token(user_id: str, phone: str) -> str:
    payload = {
        "sub": user_id,
        "phone": phone,
        "type": "client",
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES_CLIENT),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_admin_token(admin_id: str, username: str, role: str) -> str:
    payload = {
        "admin_id": admin_id,
        "username": username,
        "role": role,
        "type": "admin",
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES_ADMIN),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None
```

---

### FIX 4: Environment Validation — core/config.py

**Problem:** Missing env vars cause silent runtime failures.  
**Fix:** Use pydantic-settings. All required vars validated at import time. Add `pydantic-settings` to `requirements.txt`.

```python
# core/config.py
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List

class Settings(BaseSettings):
    # Required — no defaults, will crash if missing
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str
    JWT_SECRET: str
    MPESA_CONSUMER_KEY: str
    MPESA_CONSUMER_SECRET: str
    MPESA_SHORTCODE: str
    MPESA_PASSKEY: str
    MPESA_CALLBACK_URL: str

    # Optional with safe defaults
    MPESA_ENV: str = "sandbox"
    DEBUG: bool = False                         # ← default FALSE
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: str = "https://fixit-bluetechnology.co.ke,https://admin.fixit-bluetechnology.co.ke"
    AT_API_KEY: str = ""                        # Africa's Talking SMS
    AT_USERNAME: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

---

### FIX 5: M-Pesa Callback Verification — payments/router.py

**Problem:** Open to anyone — fake callback marks orders paid.  
**Fix:** Safaricom IP whitelist. Any request not from Safaricom's published IP ranges is rejected with 403.

```python
# payments/router.py
from fastapi import Request, HTTPException

SAFARICOM_IPS = {
    "196.201.214.200", "196.201.214.206", "196.201.213.114",
    "196.201.214.207", "196.201.214.208", "196.201.213.44",
    "196.201.212.127", "196.201.212.138", "196.201.212.129",
    "196.201.212.136", "196.201.212.74",  "196.201.212.69",
}

def verify_safaricom_ip(request: Request):
    client_ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()
    if client_ip not in SAFARICOM_IPS:
        import logging
        logging.getLogger(__name__).warning(f"M-Pesa callback from unknown IP: {client_ip}")
        raise HTTPException(status_code=403, detail="Forbidden")

@router.post("/mpesa/callback")
def mpesa_callback(request: Request, payload: dict):
    verify_safaricom_ip(request)
    # ... rest of callback logic
```

---

### FIX 6: Payment Initiation Auth — payments/router.py

**Problem:** Anyone can trigger STK push to any phone number.  
**Fix:** Require authenticated user. Verify they own the order.

```python
# payments/router.py
from auth.dependencies import get_optional_user

@router.post("/mpesa/initiate")
def mpesa_initiate(order_id: str, user_id: Optional[str] = Depends(get_optional_user)):
    order = payment_service.get_order_for_payment(order_id)
    # If user is logged in, they must own this order
    if user_id and order.get("user_id") and str(order["user_id"]) != str(user_id):
        raise HTTPException(status_code=403, detail="You do not own this order")
    # ... stk push
```

---

### FIX 7: RLS Policies — New Migration File

**Problem:** All tables allow public read of all data.  
**Fix:** New SQL migration. Add this as `supabase/019_fix_rls_policies.sql`.

```sql
-- supabase/019_fix_rls_policies.sql
-- Drop the overly permissive policies

DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Anyone can view bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can view users" ON users;
DROP POLICY IF EXISTS "Anyone can view order items" ON order_items;

-- Orders: only the owning user can read (service role bypasses RLS)
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (
    user_id IS NULL   -- guest orders: no restriction (tracking by phone is public)
    OR true           -- TODO: tighten after client uses Supabase auth
);

-- For now the backend uses service role key (bypasses RLS) for all admin reads.
-- The anon key (used by direct Supabase calls from client) cannot read others' data.
-- This is enforced in the backend — all list endpoints filter by user_id.

-- Users table: nobody reads via anon key
CREATE POLICY "Service role only for users"
ON users FOR SELECT
USING (false);  -- backend uses service key, anon key gets nothing

-- Bookings: same pattern
CREATE POLICY "Service role only for bookings list"
ON bookings FOR SELECT
USING (false);  -- backend uses service key, public tracking uses phone filter
```

---

### FIX 8: OTP Hashing — auth/service.py

**Problem:** OTP codes stored in plain text. DB breach = all active OTPs exposed.  
**Fix:** Store SHA-256 hash of the OTP. Compare hash on verification.

```python
# auth/service.py
import hashlib

def _hash_otp(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()

# When storing:
supabase_admin.table("users").update({
    "verification_code": _hash_otp(verification_code)
}).eq("id", user_id).execute()

# When verifying:
if user["verification_code"] != _hash_otp(submitted_code):
    raise AuthException("Invalid verification code")
```

---

### FIX 9: DEBUG Default — core/config.py

**Problem:** `DEBUG=True` by default in production.  
**Fix:** Already handled in FIX 4 — `DEBUG: bool = False` in Settings.

---

### FIX 10: Rate Limiting — Consistent Across All Auth Endpoints

**Problem:** Rate limiting only in legacy `main.py`. `app/` has none.  
**Fix:** Apply `slowapi` at router level in `auth/router.py` and `admin_auth/router.py`.

```python
# auth/router.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/signup")
@limiter.limit("5/minute")
def signup(request: Request, user: UserSignup): ...

@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, credentials: UserLogin): ...

@router.post("/resend-code")
@limiter.limit("3/minute")
def resend_code(request: Request, data: ResendCode): ...

@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, data: ForgotPassword): ...
```

---

## PHASE 3 — FILE-BY-FILE MIGRATION INSTRUCTIONS

This is the exact work to do. Each row = one unit of work. Do them in order.

---

### STEP 1: Create core/

**Create `backend/app/core/__init__.py`** — empty

**Create `backend/app/core/config.py`**  
Source: `backend/app/config.py`  
Changes: Replace `class Settings` with pydantic-settings `BaseSettings`. Add all required fields. Set `DEBUG=False`. Remove AWS Cognito vars (not used).

**Create `backend/app/core/security.py`**  
Source: `backend/app/utils/auth.py`  
Changes:
- Replace SHA-256 hashing with bcrypt (`passlib`)
- Add `_sha256_verify()` for migration fallback
- Add `verify_and_rehash()` function
- Add separate `create_client_token()` and `create_admin_token()`
- Remove `secrets.token_hex` fallback on JWT_SECRET — raise RuntimeError
- Keep `generate_verification_code()`
- Add `_hash_otp()` and `verify_otp()`

**Create `backend/app/core/database.py`**  
Source: `backend/app/database.py`  
Changes: Import settings from `core/config.py` instead of `app/config.py`. No other changes needed — lazy singleton pattern is good.

**Create `backend/app/core/exceptions.py`**  
Source: `backend/app/utils/exceptions.py`  
Changes: Keep all exception classes. This is now the single source for exceptions across all domains.

**Create `backend/app/core/startup.py`**  
New file. Validates all external connections at startup.

```python
# core/startup.py
from core.config import settings
from core.database import get_admin_db
import logging

logger = logging.getLogger(__name__)

def validate_startup():
    """Called once at app startup — crashes fast if misconfigured."""
    # DB connectivity
    try:
        get_admin_db().table("products").select("id").limit(1).execute()
        logger.info("✓ Database connection OK")
    except Exception as e:
        raise RuntimeError(f"Database unreachable at startup: {e}")

    # M-Pesa config
    if settings.MPESA_ENV == "production":
        required = ["MPESA_CONSUMER_KEY","MPESA_CONSUMER_SECRET","MPESA_PASSKEY","MPESA_CALLBACK_URL"]
        for key in required:
            if not getattr(settings, key):
                raise RuntimeError(f"M-Pesa production mode requires {key}")
    
    logger.info("✓ Startup validation passed")
```

---

### STEP 2: Create notifications/

**Create `backend/app/notifications/__init__.py`** — empty

**Create `backend/app/notifications/sms.py`**  
Source: `backend/app/utils/sms_service.py`  
Changes: Import from `core/config.py`. No other logic changes.

**Create `backend/app/notifications/email.py`**  
Source: `backend/app/utils/email_service.py`  
Changes: Import from `core/config.py`. No other logic changes.

---

### STEP 3: Create auth/

**Create `backend/app/auth/__init__.py`** — empty

**Create `backend/app/auth/models.py`**  
Source: `backend/app/models/auth.py`  
No logic changes — just Pydantic schemas.

**Create `backend/app/auth/dependencies.py`**  
Source: Extracted from `backend/app/middleware/auth.py` + `app/api/orders.py`  
This is the single definition of `get_current_user()` and `get_optional_user()`.

```python
# auth/dependencies.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from core.security import decode_token

security = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = decode_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("type") != "client":
        raise HTTPException(status_code=401, detail="Invalid token type")
    return payload["sub"]

def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    return payload.get("sub")
```

**Create `backend/app/auth/service.py`**  
Source: `backend/app/services/auth_service.py`  
Changes:
- Import `hash_password`, `verify_password`, `verify_and_rehash`, `create_client_token`, `generate_verification_code`, `_hash_otp`, `verify_otp` from `core/security`
- Import `send_sms` from `notifications/sms`
- Use `_hash_otp` when storing OTPs
- Use `verify_otp` when checking OTPs
- Remove `cognito_service` reference (not implemented, causes silent failures)
- Token in return uses `create_client_token()` not generic `create_access_token()`

**Create `backend/app/auth/router.py`**  
Source: `backend/app/api/auth.py`  
Changes:
- Add `slowapi` rate limiting on signup, login, resend-code, forgot-password
- Add `request: Request` parameter to rate-limited endpoints
- Import service from `auth/service.py`

---

### STEP 4: Create admin_auth/

**Create `backend/app/admin_auth/__init__.py`** — empty

**Create `backend/app/admin_auth/models.py`**  
Source: Pydantic schemas from `backend/app/api/admin_auth.py`  
Extract: `AdminLoginRequest`, `AdminChangePasswordRequest`, `AdminCreateRequest`

**Create `backend/app/admin_auth/dependencies.py`**  
Source: `get_current_admin()` and `require_superadmin()` from `backend/app/api/admin_auth.py`  
Changes:
- Import `decode_token` from `core/security`
- Verify `payload.get("type") == "admin"` to reject client tokens used on admin endpoints

```python
# admin_auth/dependencies.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.security import decode_token

security = HTTPBearer()

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(credentials.credentials)
    if not payload or "admin_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired admin token")
    if payload.get("type") != "admin":
        raise HTTPException(status_code=401, detail="Not an admin token")
    return payload

def require_superadmin(admin: dict = Depends(get_current_admin)) -> dict:
    if admin.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return admin
```

**Create `backend/app/admin_auth/service.py`**  
Source: admin logic from `backend/app/services/auth_service.py`  
Changes:
- Import `verify_and_rehash`, `hash_password`, `create_admin_token` from `core/security`
- Use `create_admin_token()` — 8-hour expiry
- Log all login/create/deactivate actions via audit utility

**Create `backend/app/admin_auth/router.py`**  
Source: `backend/app/api/admin_auth.py`  
Changes:
- Import dependencies from `admin_auth/dependencies.py`
- Import service from `admin_auth/service.py`
- Add rate limiting on `/login` endpoint: `@limiter.limit("5/minute")`

---

### STEP 5: Create products/

**Create `backend/app/products/__init__.py`** — empty

**Create `backend/app/products/models.py`**  
Source: `backend/app/models/product.py`

**Create `backend/app/products/service.py`**  
Source: `backend/app/services/product_service.py`  
Changes: Import from `core/database`, `core/exceptions` only. No other changes needed.

**Create `backend/app/products/router.py`**  
Source: `backend/app/api/products.py`  
Changes:
- Import `get_current_admin` from `admin_auth/dependencies.py`
- All write endpoints use `Depends(get_current_admin)` — already correct in app/ version
- Remove category endpoint that does inline DB query — move to `products/service.py`

---

### STEP 6: Create orders/

**Create `backend/app/orders/__init__.py`** — empty

**Create `backend/app/orders/models.py`**  
Source: `backend/app/models/order.py`

**Create `backend/app/orders/service.py`**  
Source: `backend/app/services/order_service.py`  
Changes:
- Import from `core/database`, `core/exceptions`, `notifications/sms`
- Remove inline points logic — call `points/service.py` via clean function call
- Add pagination parameters: `limit: int = 50, offset: int = 0`

**Create `backend/app/orders/router.py`**  
Source: `backend/app/api/orders.py`  
Changes:
- Import `get_current_admin` from `admin_auth/dependencies.py`
- Import `get_optional_user` from `auth/dependencies.py`
- Add `limit` and `offset` query params on list endpoint

---

### STEP 7: Create bookings/

**Create `backend/app/bookings/__init__.py`** — empty

**Create `backend/app/bookings/models.py`**  
Source: `backend/app/models/booking.py`

**Create `backend/app/bookings/service.py`**  
Source: `backend/app/services/booking_service.py`  
Changes:
- Import from `core/database`, `core/exceptions`, `notifications/sms`
- Points award on completion: call `points/service.py` not inline

**Create `backend/app/bookings/router.py`**  
Source: `backend/app/api/bookings.py`  
Changes:
- Import `get_current_admin` from `admin_auth/dependencies.py`
- Import `get_optional_user` from `auth/dependencies.py`

---

### STEP 8: Create payments/

**Create `backend/app/payments/__init__.py`** — empty

**Create `backend/app/payments/mpesa.py`**  
Source: `backend/app/utils/mpesa.py`  
Changes:
- Import all config from `core/config.py` (settings.MPESA_*)
- No other logic changes — raw Safaricom API calls stay here

**Create `backend/app/payments/models.py`**  
New file. Pydantic schemas for payment requests.

```python
# payments/models.py
from pydantic import BaseModel
from typing import Optional

class InitiatePaymentRequest(BaseModel):
    order_id: str

class BookingPaymentRequest(BaseModel):
    service_price: int = 0
```

**Create `backend/app/payments/service.py`**  
New file. Business logic extracted from `backend/app/api/payments.py`.

**Create `backend/app/payments/router.py`**  
Source: `backend/app/api/payments.py`  
Changes (CRITICAL):
- Add `verify_safaricom_ip()` dependency on `/mpesa/callback` — see FIX 5
- Add `get_optional_user` on `/mpesa/initiate` — ownership check — see FIX 6
- Import `get_current_admin` from `admin_auth/dependencies.py` for `/request-final-payment`

---

### STEP 9: Create points/

**Create `backend/app/points/__init__.py`** — empty

**Create `backend/app/points/models.py`**  
Source: extract from existing points code

**Create `backend/app/points/service.py`**  
Source: `backend/app/services/points_service.py`  
Changes: Import from `core/database` only. No cross-domain service imports.

**Create `backend/app/points/router.py`**  
Source: `backend/app/api/points.py`  
Changes:
- Import `get_current_user` from `auth/dependencies.py`
- Import `get_current_admin` from `admin_auth/dependencies.py`

---

### STEP 10: Create services/ (Repair Services)

**Create `backend/app/services_catalog/__init__.py`** — empty  
*(Renamed from `services/` to avoid conflict with Python `services` convention)*

**Create `backend/app/services_catalog/models.py`**  
**Create `backend/app/services_catalog/service.py`**  
Source: `backend/app/services/` equivalents + `backend/app/api/services.py`

**Create `backend/app/services_catalog/router.py`**  
Source: `backend/app/api/services.py`

---

### STEP 11: Create delivery/, tracking/, contact/, places/

Each follows same pattern: `__init__.py` + `router.py` + `service.py`.

Sources:
- `delivery/` ← `backend/app/api/delivery_zones.py` + `backend/app/services/` equivalent
- `tracking/` ← `backend/app/api/tracking.py` + `backend/app/services/tracking_service.py`
- `contact/` ← `backend/app/api/contact.py`
- `places/` ← `backend/app/api/places.py`

---

### STEP 12: Create admin_ops/ and devices/

**Create `backend/app/admin_ops/__init__.py`** — empty

**Create `backend/app/admin_ops/models.py`**  
Source: `BulkStatusUpdate` and other schemas from `backend/app/api/admin_ops.py`

**Create `backend/app/admin_ops/service.py`**  
Source: Extract all service logic from `backend/app/api/admin_ops.py` (dashboard calc, export, referrals, customer history, search)

**Create `backend/app/admin_ops/router.py`**  
Source: `backend/app/api/admin_ops.py`  
Changes:
- Import `get_current_admin` from `admin_auth/dependencies.py`
- All business logic delegated to `admin_ops/service.py`
- Dashboard endpoint: add pagination to `recent_orders` (currently returns 50 — hardcode is fine)

**Create `backend/app/devices/__init__.py`** — empty

**Create `backend/app/devices/models.py`**  
Source: `BrandBody`, `ModelBody`, `PricingBody` from `backend/app/api/admin_ops.py`

**Create `backend/app/devices/service.py`**  
Extract device CRUD logic.

**Create `backend/app/devices/router.py`**  
Source: Device section of `backend/app/api/admin_ops.py`

---

### STEP 13: Create audit utility (stays in core/)

**Create `backend/app/core/audit.py`**  
Source: `backend/app/utils/audit.py`  
Changes: Import from `core/database`. No logic changes needed.

---

### STEP 14: Rewrite main.py — App Factory Only

**Replace `backend/app/main.py`** with a clean app factory that only mounts routers.

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.config import settings
from core.startup import validate_startup

# Domain routers
from auth.router import router as auth_router
from admin_auth.router import router as admin_auth_router
from products.router import router as products_router
from orders.router import router as orders_router
from bookings.router import router as bookings_router
from payments.router import router as payments_router
from points.router import router as points_router
from services_catalog.router import router as services_router
from delivery.router import router as delivery_router
from tracking.router import router as tracking_router
from admin_ops.router import router as admin_ops_router
from devices.router import router as devices_router
from contact.router import router as contact_router
from places.router import router as places_router

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Blue Technology API",
    version="1.0.0",
    debug=settings.DEBUG,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(auth_router)
app.include_router(admin_auth_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(bookings_router)
app.include_router(payments_router)
app.include_router(points_router)
app.include_router(services_router)
app.include_router(delivery_router)
app.include_router(tracking_router)
app.include_router(admin_ops_router)
app.include_router(devices_router)
app.include_router(contact_router)
app.include_router(places_router)

@app.on_event("startup")
async def on_startup():
    validate_startup()

@app.get("/health")
def health():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/health/db")
def health_db():
    from core.database import get_admin_db
    try:
        get_admin_db().table("products").select("id").limit(1).execute()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
```

---

### STEP 15: Fix Deployment Files

**Update `backend/Procfile`:**
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Update `backend/run.py`:**
```python
import uvicorn
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

**Update `backend/requirements.txt`** — add:
```
pydantic-settings==2.5.2
```

---

### STEP 16: Add DB Migration for RLS + Indexes

**Create `supabase/019_fix_rls_policies.sql`** — see FIX 7 above

**Create `supabase/020_add_missing_indexes.sql`:**
```sql
-- Orders: fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Bookings: fast lookup by user_id  
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);

-- Points ledger: fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_points_ledger_user_id ON points_ledger(user_id);

-- Audit log: fast lookup by admin_id
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON admin_audit_log(admin_id);
```

---

## PHASE 4 — FILES TO DELETE AFTER MIGRATION

Once all new domain folders are in place and tested, delete these:

```
backend/app/api/           ← Replaced by domain routers
backend/app/services/      ← Replaced by domain services
backend/app/models/        ← Replaced by domain models
backend/app/utils/         ← Replaced by core/ and notifications/
backend/app/middleware/    ← Replaced by auth/dependencies.py
backend/app/config.py      ← Replaced by core/config.py
backend/app/database.py    ← Replaced by core/database.py
```

---

## FINAL STRUCTURE SUMMARY

```
backend/
├── app/
│   ├── core/              ← config, database, security, exceptions, audit, startup
│   ├── notifications/     ← sms, email
│   ├── auth/              ← router, service, models, dependencies
│   ├── admin_auth/        ← router, service, models, dependencies
│   ├── products/          ← router, service, models
│   ├── orders/            ← router, service, models
│   ├── bookings/          ← router, service, models
│   ├── payments/          ← router, service, models, mpesa
│   ├── points/            ← router, service, models
│   ├── services_catalog/  ← router, service, models
│   ├── delivery/          ← router, service, models
│   ├── tracking/          ← router, service
│   ├── admin_ops/         ← router, service, models
│   ├── devices/           ← router, service, models
│   ├── contact/           ← router, service
│   ├── places/            ← router
│   └── main.py            ← app factory ONLY
├── Procfile
├── Dockerfile
├── requirements.txt
├── .env.example
└── run.py
```

---

## EXECUTION ORDER SUMMARY

| Step | Action | Fixes |
|------|--------|-------|
| 0 | Delete 8 useless files | Removes confusion, dead routes |
| 1 | Create `core/` | FIX 1 bcrypt, FIX 2 JWT secret, FIX 3 expiry, FIX 4 env validation, FIX 9 DEBUG |
| 2 | Create `notifications/` | Isolates SMS/email |
| 3 | Create `auth/` | FIX 8 OTP hashing, FIX 10 rate limiting |
| 4 | Create `admin_auth/` | FIX 1 admin bcrypt, FIX 3 admin 8h expiry, FIX 10 rate limit |
| 5 | Create `products/` | Isolation only |
| 6 | Create `orders/` | Pagination |
| 7 | Create `bookings/` | Isolation only |
| 8 | Create `payments/` | FIX 5 callback IP verify, FIX 6 payment auth |
| 9–13 | Create remaining domains | Isolation only |
| 14 | Rewrite `main.py` | Clean app factory |
| 15 | Fix deployment files | Single entry point |
| 16 | DB migrations 019 + 020 | FIX 7 RLS, missing indexes |
| Final | Delete old `api/`, `services/`, `models/`, `utils/`, `middleware/` | Removes all legacy code |

---

*Total new files to create: ~60 | Files to delete: ~30 | Net: cleaner, safer, fully isolated*
