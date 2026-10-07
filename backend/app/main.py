"""
app/main.py — Application factory. This file only mounts routers and
configures middleware. Zero business logic here.
"""
from admin_auth.router import router as admin_auth_router
from admin_ops.router import router as admin_ops_router

# ── Domain routers ────────────────────────────────────────────────────────────
from auth.router import router as auth_router
from bookings.router import router as bookings_router
from contact.router import router as contact_router
from core.config import settings
from core.startup import validate_startup
from delivery.router import router as delivery_router
from devices.router import router as devices_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from orders.router import router as orders_router
from payments.router import router as payments_router
from payments.mpesa.router import router as mpesa_router
from places.router import router as places_router
from points.router import router as points_router
from products.router import router as products_router
from services_catalog.router import router as services_router
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from tracking.router import router as tracking_router

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "Blue Technology API",
    description = "Production backend for Blue Technology Ltd — Nairobi's electronics repair and e-commerce platform.",
    version     = "2.0.0",
    debug       = settings.DEBUG,
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = settings.cors_origins_list,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Mount routers ─────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(admin_auth_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(bookings_router)
app.include_router(mpesa_router)       # M-Pesa Daraja — default payment provider
app.include_router(payments_router)    # Paystack — secondary (ready when needed)
app.include_router(points_router)
app.include_router(services_router)
app.include_router(delivery_router)
app.include_router(tracking_router)
app.include_router(admin_ops_router)
app.include_router(devices_router)
app.include_router(contact_router)
app.include_router(places_router)

# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    validate_startup()

# ── Health checks ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy", "version": "2.0.0"}

@app.get("/health/db", tags=["Health"])
def health_db():
    from core.database import get_admin_db
    try:
        get_admin_db().table("products").select("id").limit(1).execute()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "unhealthy", "database": str(e)})

@app.get("/structure", response_class=HTMLResponse, tags=["Health"])
def structure():
    """Full system structure — every file and folder with descriptions."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>System Structure — BlueTech</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --slate-950: #020617; --slate-900: #0f172a; --slate-800: #1e293b;
      --slate-700: #334155; --slate-600: #475569; --slate-400: #94a3b8;
      --slate-300: #cbd5e1; --blue-600: #2563eb; --blue-400: #60a5fa;
      --indigo-600: #4f46e5; --emerald-400: #34d399; --amber-400: #fbbf24;
      --rose-400: #fb7185; --purple-400: #c084fc;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--slate-950); color: var(--slate-300);
      min-height: 100vh;
    }
    header {
      border-bottom: 1px solid var(--slate-800);
      padding: 18px 40px;
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(15,23,42,0.9); backdrop-filter: blur(12px);
      position: sticky; top: 0; z-index: 10;
    }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo-icon {
      width: 34px; height: 34px;
      background: linear-gradient(135deg, var(--blue-600), var(--indigo-600));
      border-radius: 8px; display: flex; align-items: center;
      justify-content: center; font-size: 14px; font-weight: 800; color: white;
    }
    .logo-text { font-size: 15px; font-weight: 700; color: white; }
    .logo-sub  { font-size: 11px; color: var(--slate-400); }
    .nav-links { display: flex; gap: 16px; }
    .nav-links a {
      font-size: 12px; color: var(--slate-400); text-decoration: none;
      padding: 6px 14px; border-radius: 6px;
      border: 1px solid var(--slate-700);
      transition: color 0.15s, border-color 0.15s;
    }
    .nav-links a:hover { color: white; border-color: var(--slate-500); }

    .hero {
      padding: 56px 40px 40px; text-align: center;
      max-width: 700px; margin: 0 auto;
    }
    .tag {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(37,99,235,0.12); border: 1px solid rgba(37,99,235,0.3);
      color: var(--blue-400); font-size: 11px; font-weight: 700;
      padding: 4px 12px; border-radius: 20px; margin-bottom: 20px;
      letter-spacing: 0.5px; text-transform: uppercase;
    }
    h1 {
      font-size: clamp(26px, 4vw, 40px); font-weight: 800; color: white;
      letter-spacing: -1px; margin-bottom: 12px;
    }
    h1 span {
      background: linear-gradient(135deg, var(--blue-400), var(--indigo-600));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hero-sub { font-size: 14px; color: var(--slate-400); line-height: 1.7; }

    /* Search */
    .search-bar {
      max-width: 500px; margin: 32px auto 0;
      position: relative;
    }
    .search-bar input {
      width: 100%; padding: 12px 16px 12px 40px;
      background: var(--slate-900); border: 1px solid var(--slate-700);
      border-radius: 8px; color: white; font-size: 13px; outline: none;
    }
    .search-bar input:focus { border-color: var(--blue-600); }
    .search-bar input::placeholder { color: var(--slate-500); }
    .search-icon {
      position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
      color: var(--slate-500); font-size: 14px;
    }

    /* Layout */
    .main {
      max-width: 1200px; margin: 0 auto;
      padding: 48px 40px 80px;
      display: grid; grid-template-columns: 220px 1fr;
      gap: 32px; align-items: start;
    }

    /* Sidebar TOC */
    .toc {
      position: sticky; top: 72px;
      background: var(--slate-900);
      border: 1px solid var(--slate-800);
      border-radius: 10px; padding: 16px;
    }
    .toc-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; color: var(--slate-500); margin-bottom: 12px;
    }
    .toc a {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: var(--slate-400);
      text-decoration: none; padding: 6px 8px; border-radius: 6px;
      transition: background 0.15s, color 0.15s;
    }
    .toc a:hover { background: var(--slate-800); color: white; }
    .toc-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

    /* Sections */
    .section { margin-bottom: 48px; }
    .section-header {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 20px; padding-bottom: 12px;
      border-bottom: 1px solid var(--slate-800);
    }
    .section-icon {
      width: 36px; height: 36px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; font-size: 16px;
    }
    .section-title { font-size: 18px; font-weight: 800; color: white; }
    .section-desc  { font-size: 12px; color: var(--slate-500); margin-top: 2px; }

    /* Tree */
    .tree { display: flex; flex-direction: column; gap: 2px; }

    .tree-folder {
      margin-bottom: 12px;
    }
    .folder-header {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 8px;
      background: var(--slate-900); border: 1px solid var(--slate-800);
      cursor: pointer; user-select: none;
      transition: border-color 0.15s;
    }
    .folder-header:hover { border-color: var(--slate-600); }
    .folder-name { font-size: 13px; font-weight: 700; color: white; font-family: "SF Mono","Fira Code",monospace; }
    .folder-desc { font-size: 11px; color: var(--slate-500); margin-left: auto; }
    .chevron { font-size: 10px; color: var(--slate-500); transition: transform 0.2s; }
    .chevron.open { transform: rotate(90deg); }

    .folder-children {
      margin-left: 20px; margin-top: 2px;
      border-left: 1px solid var(--slate-800);
      padding-left: 12px;
      display: none;
    }
    .folder-children.open { display: flex; flex-direction: column; gap: 2px; }

    .file-row {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 7px 10px; border-radius: 6px;
      transition: background 0.1s;
    }
    .file-row:hover { background: var(--slate-900); }
    .file-name {
      font-size: 12px; font-family: "SF Mono","Fira Code",monospace;
      color: var(--slate-300); min-width: 200px; flex-shrink: 0;
    }
    .file-desc { font-size: 11px; color: var(--slate-500); line-height: 1.5; }

    .badge {
      font-size: 9px; font-weight: 700; padding: 1px 6px;
      border-radius: 4px; flex-shrink: 0; letter-spacing: 0.3px;
    }
    .badge-py   { background: rgba(37,99,235,0.15);   color: var(--blue-400); }
    .badge-ts   { background: rgba(79,70,229,0.15);   color: var(--purple-400); }
    .badge-tsx  { background: rgba(168,85,247,0.15);  color: var(--purple-400); }
    .badge-sql  { background: rgba(251,191,36,0.15);  color: var(--amber-400); }
    .badge-md   { background: rgba(16,185,129,0.15);  color: var(--emerald-400); }
    .badge-cfg  { background: rgba(244,63,94,0.15);   color: var(--rose-400); }

    .no-results {
      text-align: center; padding: 60px 20px;
      color: var(--slate-500); font-size: 14px;
    }

    footer {
      border-top: 1px solid var(--slate-800);
      padding: 20px 40px;
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 12px;
    }
    footer span { font-size: 12px; color: var(--slate-500); }
    footer a { font-size: 12px; color: var(--slate-500); text-decoration: none; }
    footer a:hover { color: var(--slate-300); }

    @media (max-width: 768px) {
      .main { grid-template-columns: 1fr; }
      .toc  { display: none; }
      header { padding: 16px 20px; }
      .hero  { padding: 40px 20px 32px; }
      .main  { padding: 32px 20px 60px; }
    }
  </style>
</head>
<body>

<header>
  <div class="logo">
    <div class="logo-icon">BT</div>
    <div>
      <div class="logo-text">Blue Technology</div>
      <div class="logo-sub">System Structure</div>
    </div>
  </div>
  <div class="nav-links">
    <a href="/">&#x2190; Home</a>
    <a href="/docs">Swagger</a>
    <a href="/redoc">ReDoc</a>
  </div>
</header>

<div class="hero">
  <div class="tag">&#x1F5C2;&#xFE0F; Full System Map</div>
  <h1>BlueTech <span>System Structure</span></h1>
  <p class="hero-sub">Every file and folder in the system with descriptions — backend, frontend client, admin panel, database migrations.</p>
  <div class="search-bar">
    <span class="search-icon">&#x1F50D;</span>
    <input type="text" id="search" placeholder="Search files, folders, descriptions..." oninput="filterTree(this.value)" />
  </div>
</div>

<div class="main">
  <!-- TOC Sidebar -->
  <nav class="toc">
    <div class="toc-title">Jump to</div>
    <a href="#backend"><span class="toc-dot" style="background:#3b82f6"></span> Backend (FastAPI)</a>
    <a href="#client"><span class="toc-dot" style="background:#a78bfa"></span> Client Frontend</a>
    <a href="#admin"><span class="toc-dot" style="background:#34d399"></span> Admin Panel</a>
    <a href="#supabase"><span class="toc-dot" style="background:#fbbf24"></span> Database Migrations</a>
    <a href="#root"><span class="toc-dot" style="background:#94a3b8"></span> Root / Config</a>
  </nav>

  <!-- Content -->
  <div id="tree-root">

    <!-- ═══════════════════════════════════════════════════ BACKEND -->
    <div class="section" id="backend">
      <div class="section-header">
        <div class="section-icon" style="background:rgba(37,99,235,0.15)">&#x1F5A5;&#xFE0F;</div>
        <div>
          <div class="section-title">Backend — FastAPI</div>
          <div class="section-desc">Python 3.11 · FastAPI · Supabase · Deployed on Render</div>
        </div>
      </div>
      <div class="tree">

        <!-- core/ -->
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">backend/app/core/</span>
            <span class="folder-desc">Shared infrastructure — config, DB, security, startup</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">config.py</span><span class="file-desc">All environment variables loaded via pydantic-settings. App crashes on boot if any required var is missing. Single source of truth for all settings.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">database.py</span><span class="file-desc">Supabase client singletons — supabase (anon key) and supabase_admin (service key). Imported everywhere that needs DB access.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">security.py</span><span class="file-desc">JWT creation/decoding for client and admin tokens, bcrypt password hashing, SHA-256 legacy hash migration, cryptographically secure OTP generation.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">startup.py</span><span class="file-desc">Startup validation — checks DB connectivity and M-Pesa credentials on boot. Raises RuntimeError so the process exits with a clear error rather than starting broken.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">exceptions.py</span><span class="file-desc">Custom exception classes — AuthException, PermissionException. Caught in routers and mapped to HTTP status codes.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">audit.py</span><span class="file-desc">Admin audit log writer. Saves every admin action (who, what, on which resource, timestamp) to the audit_logs table.</span></div>
          </div>
        </div>

        <!-- auth/ -->
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">backend/app/auth/</span>
            <span class="folder-desc">Client authentication — signup, login, OTP, password reset</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">router.py</span><span class="file-desc">HTTP routes: POST /signup, /login, /verify-phone, /forgot-password, /reset-password, /resend-code, /refresh. Rate-limited on all sensitive endpoints.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">service.py</span><span class="file-desc">Business logic: user creation with referral tracking, login with account lockout (5 attempts → 15 min lock), OTP verification, password reset flow.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">models.py</span><span class="file-desc">Pydantic request/response models. Password min 8 chars, phone pattern validation, max_length on all string fields.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">dependencies.py</span><span class="file-desc">FastAPI dependency: get_current_user — decodes and validates client JWT, rejects admin tokens on client routes.</span></div>
          </div>
        </div>

        <!-- admin_auth/ -->
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">backend/app/admin_auth/</span>
            <span class="folder-desc">Admin authentication — completely separate from client auth</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">router.py</span><span class="file-desc">Routes: POST /admin/auth/login, /logout, /change-password, /create-admin. GET /me, /list. PUT /deactivate, /toggle-active. Rate-limited login.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">service.py</span><span class="file-desc">Admin login logic, role validation (admin/superadmin), password management. Admin tokens contain role claims.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">models.py</span><span class="file-desc">Admin request/response models with role enum.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">dependencies.py</span><span class="file-desc">get_current_admin dependency — decodes admin JWT, rejects client tokens on admin routes.</span></div>
          </div>
        </div>

        <!-- payments/mpesa/ -->
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">backend/app/payments/mpesa/</span>
            <span class="folder-desc">M-Pesa Daraja integration — default active payment provider</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">daraja.py</span><span class="file-desc">Raw Safaricom Daraja API calls only. stk_push() initiates STK prompt, stk_query() polls status. Handles OAuth token fetch and password generation.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">service.py</span><span class="file-desc">Business logic: order payment initiation, booking commitment fee (20%), final payment, callback processor that matches CheckoutRequestID back to orders/bookings.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">router.py</span><span class="file-desc">Endpoints under /api/v1/payments/mpesa/. Callback endpoint enforces Safaricom IP whitelist. Initiate endpoints rate-limited 5/minute.</span></div>
          </div>
        </div>

        <!-- payments/ (paystack) -->
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">backend/app/payments/ (Paystack)</span>
            <span class="folder-desc">Paystack integration — built, dormant, ready to activate</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">paystack.py</span><span class="file-desc">Raw Paystack API calls: initialize_transaction(), verify_transaction(), verify_webhook_signature() (HMAC-SHA512).</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">service.py</span><span class="file-desc">Paystack business logic: order/booking/final payment initiation, webhook processor, reference-based matching.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">router.py</span><span class="file-desc">Paystack endpoints under /api/v1/payments/. Webhook endpoint verifies HMAC-SHA512 signature before processing.</span></div>
          </div>
        </div>

        <!-- orders/ -->
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">backend/app/orders/</span>
            <span class="folder-desc">E-commerce order lifecycle</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">router.py</span><span class="file-desc">POST /orders (create), GET /orders (list, admin), GET /orders/{id}, PUT /orders/{id}/status (admin), GET /orders/track/{phone}.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">service.py</span><span class="file-desc">Order creation with points redemption, referral code validation, delivery fee calculation, points award on delivery. Atomic point operations.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">models.py</span><span class="file-desc">OrderCreate, OrderItemCreate with max_length on all fields. PaymentMethod enum: cash_on_delivery, mpesa, paystack, points_only.</span></div>
          </div>
        </div>

        <!-- bookings/ -->
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">backend/app/bookings/</span>
            <span class="folder-desc">Device repair booking workflow</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">router.py</span><span class="file-desc">POST /bookings, GET /bookings (admin list), GET /bookings/{id}, PUT /bookings/{id}/status (admin), PUT /bookings/{id}/cost (admin), track by phone.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">service.py</span><span class="file-desc">Booking creation, status transitions (pending→diagnosed→in_repair→completed), SMS notifications at each stage.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">models.py</span><span class="file-desc">BookingCreate with max_length on all string fields. FulfillmentType enum: walk_in, pickup, delivery.</span></div>
          </div>
        </div>

        <!-- products/ -->
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">backend/app/products/</span>
            <span class="folder-desc">Product catalog management</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">router.py</span><span class="file-desc">GET /products (public, filterable), GET /products/{id}, POST/PUT/DELETE (admin only). Supports search, category filter, active-only.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">service.py</span><span class="file-desc">Product CRUD, stock management, section assignment.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">models.py</span><span class="file-desc">ProductCreate/Update models with validation.</span></div>
          </div>
        </div>

        <!-- notifications/ -->
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">backend/app/notifications/</span>
            <span class="folder-desc">SMS and email notification senders</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">sms.py</span><span class="file-desc">HostPinnacle Bulk SMS API integration. Sends OTP codes, booking status updates, order confirmations. Falls back silently if API key not set.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">email.py</span><span class="file-desc">AWS SES email sender. Used for order receipts and booking confirmations. Optional — falls back if SES credentials not set.</span></div>
          </div>
        </div>

        <!-- other domains -->
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">backend/app/ (other domains)</span>
            <span class="folder-desc">Points, tracking, delivery, devices, places, contact, services, admin ops</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">points/router.py + service.py</span><span class="file-desc">Loyalty points system. Earn 10% of subtotal on delivery, 50 pts per referral. Redeem 1000+ pts for KES discount. Atomic DB increment.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">tracking/router.py</span><span class="file-desc">GET /track/{phone} — returns all orders and bookings for a phone number. Public endpoint.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">delivery/router.py</span><span class="file-desc">GET /delivery-zones — returns active delivery zones and fees. Used at checkout.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">devices/router.py</span><span class="file-desc">Device brands, models and pricing catalog. Used in booking form for device selection and repair cost estimation.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">places/router.py</span><span class="file-desc">Google Places API proxy. Backend proxies autocomplete requests so the API key is never exposed to the frontend.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">contact/router.py</span><span class="file-desc">POST /contact — saves contact form messages to contact_messages table. Public endpoint.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">services_catalog/router.py</span><span class="file-desc">Repair services catalog with category filtering. Reference data for booking form.</span></div>
            <div class="file-row"><span class="badge badge-py">PY</span><span class="file-name">admin_ops/router.py</span><span class="file-desc">Admin-only operations: analytics dashboard, stock alerts, CSV export, bulk actions, referral tracking, customer history, global search, audit log, transactions list.</span></div>
          </div>
        </div>

        <!-- backend root files -->
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C4;</span>
            <span class="folder-name">backend/ (root files)</span>
            <span class="folder-desc">Docker, config, entrypoint</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-cfg">CFG</span><span class="file-name">main.py</span><span class="file-desc">FastAPI app factory. Mounts all routers, configures CORS and rate limiting middleware. Zero business logic — only wiring.</span></div>
            <div class="file-row"><span class="badge badge-cfg">CFG</span><span class="file-name">Dockerfile</span><span class="file-desc">Python 3.11-slim image. Installs requirements, copies app, runs entrypoint.sh.</span></div>
            <div class="file-row"><span class="badge badge-cfg">CFG</span><span class="file-name">entrypoint.sh</span><span class="file-desc">Container startup script. Runs uvicorn on 0.0.0.0:$PORT.</span></div>
            <div class="file-row"><span class="badge badge-cfg">CFG</span><span class="file-name">requirements.txt</span><span class="file-desc">All Python dependencies with pinned versions.</span></div>
            <div class="file-row"><span class="badge badge-cfg">CFG</span><span class="file-name">pyproject.toml</span><span class="file-desc">Ruff linter config — line length 140, ignored rules for FastAPI patterns, per-file overrides.</span></div>
            <div class="file-row"><span class="badge badge-cfg">CFG</span><span class="file-name">run.py</span><span class="file-desc">Local development runner — starts uvicorn with reload enabled.</span></div>
          </div>
        </div>

      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ CLIENT -->
    <div class="section" id="client">
      <div class="section-header">
        <div class="section-icon" style="background:rgba(168,85,247,0.15)">&#x1F4F1;</div>
        <div>
          <div class="section-title">Client Frontend — React</div>
          <div class="section-desc">React 18 · TypeScript · Vite · Tailwind CSS · Deployed on Vercel</div>
        </div>
      </div>
      <div class="tree">

        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">client/src/pages/</span>
            <span class="folder-desc">Full-page route components</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">HomePage.tsx</span><span class="file-desc">Landing page — hero, featured products, new arrivals, service categories, promotional carousels, marketing posters.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">ProductsPage.tsx</span><span class="file-desc">Full product catalog with filter sidebar (category, price range) and search.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">ProductDetailPage.tsx</span><span class="file-desc">Single product view — images, description, specs, add to cart, related products.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">CartPage.tsx</span><span class="file-desc">Cart summary with item management, points redemption toggle, referral code input, delivery zone selector.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">CheckoutPage.tsx</span><span class="file-desc">Order submission form — delivery details, payment method selection (cash/M-Pesa), order total breakdown.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">OrderSuccessPage.tsx</span><span class="file-desc">Post-order confirmation page with order ID and next steps.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">OrdersPage.tsx</span><span class="file-desc">Customer order history list. Auth-protected.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">OrderDetailPage.tsx</span><span class="file-desc">Single order detail — items, status, payment info, M-Pesa receipt.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">BookRepairPage.tsx</span><span class="file-desc">Repair booking form — device brand/model selection, issue description, fulfillment type (walk-in/pickup/delivery), address.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">BookingDetailPage.tsx</span><span class="file-desc">Single booking status page — repair progress, commitment fee status, final payment prompt.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">BookingSuccessPage.tsx</span><span class="file-desc">Post-booking confirmation with booking reference.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">ServicesPage.tsx</span><span class="file-desc">Repair services catalog with category filter tabs.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">TrackOrderPage.tsx</span><span class="file-desc">Public order/booking tracking by phone number. No login required.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">PointsPage.tsx</span><span class="file-desc">Loyalty points balance, transaction history, referral code sharing.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">ProfilePage.tsx</span><span class="file-desc">Customer profile — name, email, phone, change password.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">LoginPage.tsx</span><span class="file-desc">Phone + password login form with redirect after auth.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">RegisterPage.tsx</span><span class="file-desc">Signup form with optional referral code. Triggers OTP verification flow.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">VerifyPhonePage.tsx</span><span class="file-desc">OTP entry page after signup. Resend code support.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">ForgotPasswordPage.tsx</span><span class="file-desc">Phone entry to trigger SMS OTP for password reset.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">HotDealsPage.tsx</span><span class="file-desc">Promotional deals and discounted products listing.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">AboutPage.tsx / ContactPage.tsx</span><span class="file-desc">Static informational pages with contact form submission.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">Legal pages</span><span class="file-desc">PrivacyPolicyPage, TermsOfServicePage, CookiePolicyPage, ReturnsPage, WarrantyPage, FAQsPage, CareersPage, BlogPage.</span></div>
          </div>
        </div>

        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">client/src/components/</span>
            <span class="folder-desc">Reusable UI components by domain</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">layout/Header.tsx</span><span class="file-desc">Top navigation — logo, search trigger, cart icon with count, auth links, mobile menu toggle.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">layout/Footer.tsx</span><span class="file-desc">Site footer with links, social, legal pages.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">layout/BottomTabBar.tsx</span><span class="file-desc">Mobile bottom navigation — Home, Shop, Repairs, Track, Profile.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">layout/CartDrawer.tsx</span><span class="file-desc">Slide-in cart panel accessible from header icon.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">layout/SearchModal.tsx</span><span class="file-desc">Full-screen search overlay with live product results.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">cart/MpesaWaitingModal.tsx</span><span class="file-desc">Modal shown after M-Pesa STK push — instructs user to check phone and enter PIN.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">home/*</span><span class="file-desc">Hero, FeaturedProducts, NewArrivals, ServiceCategories, PromotionalDealsCarousel, MarketingPosters, HowItWorks — all homepage section components.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">products/*</span><span class="file-desc">ProductCard, ProductGrid, ProductDetail, FilterSidebar, SectionCarousel.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">common/*</span><span class="file-desc">Shared primitives: Button, Input, Select, Badge, Card, Loading, ErrorBoundary, ProtectedRoute, AuthShell, PlacesAutocomplete.</span></div>
          </div>
        </div>

        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">client/src/api/</span>
            <span class="folder-desc">Backend API call functions — one file per domain</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">axios.ts</span><span class="file-desc">Axios instance with base URL and auth token interceptor. Attaches JWT from localStorage to every request automatically.</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">auth.ts</span><span class="file-desc">login(), signup(), verifyPhone(), forgotPassword(), resetPassword(), resendCode().</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">products.ts</span><span class="file-desc">getProducts(), getProduct(), searchProducts().</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">orders.ts</span><span class="file-desc">createOrder(), getOrders(), getOrder(), trackOrders().</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">bookings.ts</span><span class="file-desc">createBooking(), getBooking(), trackBookings().</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">points.ts</span><span class="file-desc">getPoints(), getPointsHistory(), redeemPoints().</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">zones.ts</span><span class="file-desc">getDeliveryZones().</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">services.ts</span><span class="file-desc">getServices(), getServiceCategories().</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">users.ts</span><span class="file-desc">getMe(), updateProfile(), changePassword().</span></div>
          </div>
        </div>

        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">client/src/contexts/ + hooks/</span>
            <span class="folder-desc">Global state and reusable logic</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">AuthContext.tsx</span><span class="file-desc">Global auth state — current user, login/logout actions, token persistence in localStorage.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">CartContext.tsx</span><span class="file-desc">Cart state — items, add/remove/update, total calculation, points redemption toggle.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">NotificationContext.tsx</span><span class="file-desc">Toast notification system — success, error, info messages shown across the app.</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">useAuth.ts / useCart.ts</span><span class="file-desc">Convenience hooks that consume the auth and cart contexts.</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">useProducts.ts</span><span class="file-desc">Product fetching hook with filtering, pagination state.</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">useDebounce.ts / useLocalStorage.ts</span><span class="file-desc">Generic utility hooks.</span></div>
          </div>
        </div>

      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ ADMIN -->
    <div class="section" id="admin">
      <div class="section-header">
        <div class="section-icon" style="background:rgba(16,185,129,0.15)">&#x1F6E1;&#xFE0F;</div>
        <div>
          <div class="section-title">Admin Panel — Next.js</div>
          <div class="section-desc">Next.js 14 · TypeScript · Tailwind CSS · Deployed on Vercel</div>
        </div>
      </div>
      <div class="tree">
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">admin/app/(app)/</span>
            <span class="folder-desc">Authenticated admin pages (route group)</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">page.tsx (dashboard)</span><span class="file-desc">Dashboard overview — revenue summary, order counts, booking counts, recent activity feed.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">orders/page.tsx</span><span class="file-desc">Orders management — list, filter by status, update order status, view items.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">repairs/page.tsx</span><span class="file-desc">Repair bookings management — list, update status, set cost, trigger payment.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">products/page.tsx</span><span class="file-desc">Product catalog management — add, edit, deactivate, stock updates.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">transactions/page.tsx</span><span class="file-desc">All payment transactions — orders and bookings combined, payment status, receipts.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">analytics/page.tsx</span><span class="file-desc">Revenue charts, top products, booking stats, customer growth.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">users/page.tsx</span><span class="file-desc">Customer list — search, view history, points balance.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">loyalty/page.tsx</span><span class="file-desc">Loyalty program management — award points, view leaderboard, referral tracking.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">services/page.tsx</span><span class="file-desc">Repair services catalog management — add/edit services and categories.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">devices/page.tsx</span><span class="file-desc">Device brands, models and pricing management.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">zones/page.tsx</span><span class="file-desc">Delivery zones and fees management.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">admins/page.tsx</span><span class="file-desc">Admin account management — create admins, assign roles, activate/deactivate. Superadmin only.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">revenue/page.tsx</span><span class="file-desc">Detailed revenue breakdown — by period, by category, export to CSV.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">receipt/page.tsx</span><span class="file-desc">Printable receipt/invoice generator for orders and bookings.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">notifications/page.tsx</span><span class="file-desc">System notifications and alerts — stock alerts, failed payments.</span></div>
          </div>
        </div>
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">admin/lib/ + components/</span>
            <span class="folder-desc">API client, types, shared UI</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">lib/api.ts</span><span class="file-desc">All backend API calls for the admin panel. Axios instance with admin JWT interceptor.</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">lib/types.ts</span><span class="file-desc">TypeScript type definitions shared across admin pages.</span></div>
            <div class="file-row"><span class="badge badge-ts">TS</span><span class="file-name">lib/useNotifications.ts</span><span class="file-desc">Hook for polling and displaying system notifications.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">components/layout/Sidebar.tsx</span><span class="file-desc">Admin sidebar navigation with role-based menu items.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">components/layout/Topbar.tsx</span><span class="file-desc">Admin top bar — page title, notification bell, admin profile dropdown.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">components/ui/StatCard.tsx</span><span class="file-desc">Metric card used on dashboard and analytics pages.</span></div>
            <div class="file-row"><span class="badge badge-tsx">TSX</span><span class="file-name">components/ui/StatusBadge.tsx</span><span class="file-desc">Colour-coded status pill for order/booking/payment statuses.</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ SUPABASE -->
    <div class="section" id="supabase">
      <div class="section-header">
        <div class="section-icon" style="background:rgba(251,191,36,0.15)">&#x1F5C4;&#xFE0F;</div>
        <div>
          <div class="section-title">Database Migrations — Supabase (PostgreSQL)</div>
          <div class="section-desc">Run in order — each migration is idempotent (IF NOT EXISTS)</div>
        </div>
      </div>
      <div class="tree">
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C2;</span>
            <span class="folder-name">supabase/</span>
            <span class="folder-desc">22 SQL migration files</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">001_schema.sql</span><span class="file-desc">Base schema — users, products, orders, order_items, bookings, admins tables.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">002_rls_policies.sql</span><span class="file-desc">Row-Level Security policies — users can only read/write their own data.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">003_seed_products.sql</span><span class="file-desc">Initial product catalog seed data.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">004_seed_services.sql</span><span class="file-desc">Repair services seed data.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">006_create_admins_table.sql</span><span class="file-desc">Admins table with role column.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">008_create_customers_table.sql</span><span class="file-desc">Extended customer profile columns on users table.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">009_product_sections.sql</span><span class="file-desc">Product sections (Featured, New Arrivals, Hot Deals) — many-to-many with products.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">010_mpesa_payment_columns.sql</span><span class="file-desc">Adds checkout_request_id, mpesa_receipt, payment_method to orders.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">011_referral_points.sql</span><span class="file-desc">Referral code, points balance, points_transactions table.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">012_admin_audit_stock.sql</span><span class="file-desc">Admin audit_logs table and stock_alerts view.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">013_booking_payment_columns.sql</span><span class="file-desc">Payment columns on bookings — mpesa_receipt, checkout_request_id.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">014_contact_messages.sql</span><span class="file-desc">contact_messages table for the contact form.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">015_booking_commitment_fee.sql</span><span class="file-desc">Commitment fee columns on bookings — commitment_fee, commitment_checkout_id, commitment_receipt.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">016_points_atomic_increment.sql</span><span class="file-desc">Atomic points increment function to prevent race conditions on concurrent point awards.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">017_device_brands_models_pricing.sql</span><span class="file-desc">Device brands, models and repair pricing tables.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">018_seed_devices.sql</span><span class="file-desc">Seeds 41 device brands and 551 models.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">019_fix_rls_policies.sql</span><span class="file-desc">RLS policy corrections and additions for newer tables.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">020_add_missing_indexes.sql</span><span class="file-desc">Performance indexes on frequently queried columns — phone_number, checkout_request_id, created_at.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">021_account_lockout.sql</span><span class="file-desc">Adds failed_login_attempts and locked_until columns to users. Supports 5-attempt lockout.</span></div>
            <div class="file-row"><span class="badge badge-sql">SQL</span><span class="file-name">022_paystack_columns.sql</span><span class="file-desc">Renames checkout_request_id → payment_reference, mpesa_receipt → payment_receipt on orders and bookings. Adds Paystack indexes.</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ ROOT -->
    <div class="section" id="root">
      <div class="section-header">
        <div class="section-icon" style="background:rgba(148,163,184,0.15)">&#x2699;&#xFE0F;</div>
        <div>
          <div class="section-title">Root — Config &amp; Docs</div>
          <div class="section-desc">Project-level files</div>
        </div>
      </div>
      <div class="tree">
        <div class="tree-folder">
          <div class="folder-header" onclick="toggle(this)">
            <span>&#x1F4C4;</span>
            <span class="folder-name">/ (project root)</span>
            <span class="folder-desc">Monorepo root — backend/, client/, admin/, supabase/</span>
            <span class="chevron">&#x25B6;</span>
          </div>
          <div class="folder-children">
            <div class="file-row"><span class="badge badge-md">MD</span><span class="file-name">SYSTEM_ARCHITECTURE_OVERVIEW.md</span><span class="file-desc">High-level architecture diagram and component relationships.</span></div>
            <div class="file-row"><span class="badge badge-md">MD</span><span class="file-name">BACKEND_SPEC.md</span><span class="file-desc">Backend API specification and design decisions.</span></div>
            <div class="file-row"><span class="badge badge-md">MD</span><span class="file-name">DEPLOYMENT.md</span><span class="file-desc">Deployment guide — Render (backend), Vercel (frontend/admin), Supabase setup.</span></div>
            <div class="file-row"><span class="badge badge-md">MD</span><span class="file-name">DATABASE_SETUP.md</span><span class="file-desc">Database setup instructions — run migrations in order, RLS setup.</span></div>
            <div class="file-row"><span class="badge badge-md">MD</span><span class="file-name">API_TESTING.md</span><span class="file-desc">API testing guide with example curl commands for every endpoint.</span></div>
            <div class="file-row"><span class="badge badge-md">MD</span><span class="file-name">AUDIT.md</span><span class="file-desc">Security audit findings and remediation status.</span></div>
          </div>
        </div>
      </div>
    </div>

    <div id="no-results" class="no-results" style="display:none">
      No files or folders match your search.
    </div>

  </div><!-- /tree-root -->
</div><!-- /main -->

<footer>
  <span>&copy; 2026 Blue Technology Ltd &middot; Nairobi, Kenya</span>
  <div style="display:flex;gap:16px">
    <a href="/">Home</a>
    <a href="/docs">Swagger</a>
    <a href="/redoc">ReDoc</a>
    <a href="/health">Health</a>
  </div>
</footer>

<script>
  function toggle(header) {
    const children = header.nextElementSibling;
    const chevron  = header.querySelector('.chevron');
    const isOpen   = children.classList.contains('open');
    children.classList.toggle('open', !isOpen);
    chevron.classList.toggle('open', !isOpen);
  }

  // Open all folders on load
  document.querySelectorAll('.folder-children').forEach(el => el.classList.add('open'));
  document.querySelectorAll('.chevron').forEach(el => el.classList.add('open'));

  function filterTree(query) {
    const q = query.trim().toLowerCase();
    const noResults = document.getElementById('no-results');
    if (!q) {
      document.querySelectorAll('.file-row, .tree-folder, .section').forEach(el => {
        el.style.display = '';
      });
      noResults.style.display = 'none';
      return;
    }
    let anyVisible = false;
    document.querySelectorAll('.section').forEach(section => {
      let sectionVisible = false;
      section.querySelectorAll('.tree-folder').forEach(folder => {
        let folderVisible = false;
        folder.querySelectorAll('.file-row').forEach(row => {
          const text = row.textContent.toLowerCase();
          const match = text.includes(q);
          row.style.display = match ? '' : 'none';
          if (match) folderVisible = true;
        });
        folder.style.display = folderVisible ? '' : 'none';
        if (folderVisible) sectionVisible = true;
      });
      section.style.display = sectionVisible ? '' : 'none';
      if (sectionVisible) anyVisible = true;
    });
    noResults.style.display = anyVisible ? 'none' : 'block';
  }
</script>

</body>
</html>"""


@app.get("/", response_class=HTMLResponse, tags=["Health"])
def root():
    """BlueTech API — dynamic branded landing page (routes fetched from /openapi.json)"""
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BlueTech API — Blue Technology Ltd</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --blue-600: #2563eb;
      --blue-700: #1d4ed8;
      --blue-500: #3b82f6;
      --blue-400: #60a5fa;
      --indigo-600: #4f46e5;
      --slate-950: #020617;
      --slate-900: #0f172a;
      --slate-800: #1e293b;
      --slate-700: #334155;
      --slate-600: #475569;
      --slate-400: #94a3b8;
      --slate-300: #cbd5e1;
      --emerald-400: #34d399;
      --emerald-500: #10b981;
      --amber-400: #fbbf24;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--slate-950);
      color: var(--slate-300);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      border-bottom: 1px solid var(--slate-800);
      padding: 20px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(15,23,42,0.8);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .logo { display: flex; align-items: center; gap: 12px; }

    .logo-icon {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, var(--blue-600), var(--indigo-600));
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 800; color: white; letter-spacing: -1px;
    }

    .logo-text { font-size: 16px; font-weight: 700; color: white; }
    .logo-sub  { font-size: 11px; color: var(--slate-400); margin-top: 1px; }

    .status-badge {
      display: flex; align-items: center; gap: 6px;
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.25);
      padding: 5px 12px; border-radius: 20px;
      font-size: 11px; font-weight: 600; color: var(--emerald-400);
    }

    .status-dot {
      width: 6px; height: 6px;
      background: var(--emerald-500); border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    .hero {
      padding: 80px 40px 60px;
      text-align: center;
      max-width: 760px;
      margin: 0 auto;
    }

    .version-tag {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(37,99,235,0.12);
      border: 1px solid rgba(37,99,235,0.3);
      color: var(--blue-400);
      font-size: 11px; font-weight: 700;
      padding: 4px 12px; border-radius: 20px;
      letter-spacing: 0.5px; text-transform: uppercase;
      margin-bottom: 24px;
    }

    h1 {
      font-size: clamp(32px, 5vw, 52px);
      font-weight: 800; color: white;
      line-height: 1.15; letter-spacing: -1.5px;
      margin-bottom: 16px;
    }

    h1 span {
      background: linear-gradient(135deg, var(--blue-400), var(--indigo-600));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-desc {
      font-size: 16px; color: var(--slate-400);
      line-height: 1.7; max-width: 520px;
      margin: 0 auto 36px;
    }

    .hero-actions {
      display: flex; gap: 12px;
      justify-content: center; flex-wrap: wrap;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--blue-600), var(--indigo-600));
      color: white; font-size: 13px; font-weight: 700;
      padding: 11px 24px; border-radius: 8px;
      text-decoration: none; border: none; cursor: pointer;
      transition: opacity 0.15s, transform 0.15s;
      display: inline-flex; align-items: center; gap: 6px;
    }

    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

    .btn-secondary {
      background: transparent; color: var(--slate-300);
      font-size: 13px; font-weight: 600;
      padding: 11px 24px; border-radius: 8px;
      text-decoration: none;
      border: 1px solid var(--slate-700); cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
      display: inline-flex; align-items: center; gap: 6px;
    }

    .btn-secondary:hover { border-color: var(--slate-500); color: white; }

    .stats-bar {
      display: flex; justify-content: center;
      border-top: 1px solid var(--slate-800);
      border-bottom: 1px solid var(--slate-800);
      background: var(--slate-900); flex-wrap: wrap;
    }

    .stat-item {
      padding: 20px 40px; text-align: center;
      border-right: 1px solid var(--slate-800);
      flex: 1; min-width: 140px;
    }

    .stat-item:last-child { border-right: none; }

    .stat-value { font-size: 22px; font-weight: 800; color: white; letter-spacing: -0.5px; }
    .stat-label { font-size: 11px; color: var(--slate-500); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }

    .section {
      padding: 60px 40px;
      max-width: 1100px;
      margin: 0 auto;
      width: 100%;
    }

    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--blue-400); margin-bottom: 8px; }
    .section-heading { font-size: 24px; font-weight: 800; color: white; letter-spacing: -0.5px; margin-bottom: 32px; }

    .endpoints-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .endpoint-card {
      background: var(--slate-900);
      border: 1px solid var(--slate-800);
      border-radius: 10px; padding: 20px;
      transition: border-color 0.15s, transform 0.15s;
    }

    .endpoint-card:hover { border-color: var(--slate-600); transform: translateY(-2px); }

    .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }

    .card-icon {
      width: 32px; height: 32px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }

    .icon-blue    { background: rgba(37,99,235,0.15); }
    .icon-indigo  { background: rgba(79,70,229,0.15); }
    .icon-emerald { background: rgba(16,185,129,0.15); }
    .icon-amber   { background: rgba(251,191,36,0.15); }
    .icon-rose    { background: rgba(244,63,94,0.15); }
    .icon-purple  { background: rgba(168,85,247,0.15); }

    .card-title { font-size: 13px; font-weight: 700; color: white; }
    .card-desc  { font-size: 12px; color: var(--slate-400); line-height: 1.6; margin-bottom: 14px; }

    .route-list { display: flex; flex-direction: column; gap: 5px; }

    .route-item {
      display: flex; align-items: center; gap: 8px;
      font-size: 11px;
      font-family: "SF Mono", "Fira Code", monospace;
    }

    .method {
      font-size: 9px; font-weight: 800;
      padding: 2px 6px; border-radius: 4px;
      letter-spacing: 0.5px;
      min-width: 38px; text-align: center;
    }

    .method-get    { background: rgba(16,185,129,0.15); color: var(--emerald-400); }
    .method-post   { background: rgba(37,99,235,0.15);  color: var(--blue-400); }
    .method-put    { background: rgba(251,191,36,0.15); color: var(--amber-400); }
    .method-patch  { background: rgba(251,191,36,0.15); color: var(--amber-400); }
    .method-delete { background: rgba(244,63,94,0.15);  color: #fb7185; }

    .route-path { color: var(--slate-300); }

    .loading {
      color: var(--slate-500);
      font-size: 13px;
      padding: 40px 0;
      text-align: center;
    }

    .admin-banner {
      background: linear-gradient(135deg, rgba(37,99,235,0.08), rgba(79,70,229,0.08));
      border: 1px solid rgba(37,99,235,0.2);
      border-radius: 12px; padding: 32px;
      display: flex; align-items: center;
      justify-content: space-between;
      gap: 24px; flex-wrap: wrap;
      margin-bottom: 60px;
    }

    .admin-banner-text h3 { font-size: 18px; font-weight: 800; color: white; margin-bottom: 6px; }
    .admin-banner-text p  { font-size: 13px; color: var(--slate-400); }

    footer {
      margin-top: auto;
      border-top: 1px solid var(--slate-800);
      padding: 24px 40px;
      display: flex; align-items: center;
      justify-content: space-between;
      flex-wrap: wrap; gap: 12px;
    }

    .footer-left { font-size: 12px; color: var(--slate-500); }
    .footer-links { display: flex; gap: 20px; }
    .footer-links a { font-size: 12px; color: var(--slate-500); text-decoration: none; transition: color 0.15s; }
    .footer-links a:hover { color: var(--slate-300); }

    @media (max-width: 640px) {
      header { padding: 16px 20px; }
      .hero { padding: 48px 20px 40px; }
      .section { padding: 40px 20px; }
      .stat-item { padding: 16px 20px; }
      footer { padding: 20px; }
    }
  </style>
</head>
<body>

  <header>
    <div class="logo">
      <div class="logo-icon">BT</div>
      <div>
        <div class="logo-text">Blue Technology</div>
        <div class="logo-sub">REST API v2.0.0</div>
      </div>
    </div>
    <div class="status-badge">
      <div class="status-dot"></div>
      All Systems Operational
    </div>
  </header>

  <div class="hero">
    <div class="version-tag">&#x26A1; v2.0.0 &middot; FastAPI &middot; Supabase</div>
    <h1>Blue Technology<br /><span>Backend API</span></h1>
    <p class="hero-desc">
      Production-grade REST API powering the BlueTech e-commerce platform and electronics repair booking system. Built for speed, security, and scale.
    </p>
    <div class="hero-actions">
      <a href="/docs" class="btn-primary">&#x1F4D6; Interactive Docs (Swagger)</a>
      <a href="/redoc" class="btn-secondary">&#x1F4C4; ReDoc Reference</a>
    </div>
  </div>

  <div class="stats-bar">
    <div class="stat-item">
      <div class="stat-value" id="endpoint-count">...</div>
      <div class="stat-label">Endpoints</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">JWT</div>
      <div class="stat-label">Auth Method</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">M-Pesa</div>
      <div class="stat-label">Payments</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">SMS</div>
      <div class="stat-label">Notifications</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">Points</div>
      <div class="stat-label">Loyalty System</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">KES</div>
      <div class="stat-label">Currency</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">API Reference</div>
    <div class="section-heading">Available Endpoints</div>
    <div class="endpoints-grid" id="endpoints-grid">
      <div class="loading">Loading endpoints&hellip;</div>
    </div>
  </div>

  <div class="section" style="padding-top: 0;">
    <div class="admin-banner">
      <div class="admin-banner-text">
        <h3>&#x1F510; Admin Panel Access</h3>
        <p>Authenticate via <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-size:12px;">/api/v1/admin/auth/login</code> to receive a JWT token with role claims. All admin write operations require a valid admin Bearer token.</p>
      </div>
      <a href="/docs#/Admin%20Authentication" class="btn-primary" style="white-space:nowrap;">View Admin Docs &rarr;</a>
    </div>
  </div>

  <footer>
    <div class="footer-left">&copy; 2026 Blue Technology Ltd &middot; Nairobi, Kenya &middot; All rights reserved</div>
    <div class="footer-links">
      <a href="/docs">Swagger UI</a>
      <a href="/redoc">ReDoc</a>
      <a href="/health">Health</a>
      <a href="/health/db">DB Health</a>
    </div>
  </footer>

  <script>
    // Tag → card icon + colour mapping
    const TAG_META = {
      'Admin Authentication':   { icon: '&#x1F510;', cls: 'icon-rose'    },
      'Client Authentication':  { icon: '&#x1F464;', cls: 'icon-blue'    },
      'Products':               { icon: '&#x1F4E6;', cls: 'icon-indigo'  },
      'Orders':                 { icon: '&#x1F6D2;', cls: 'icon-emerald' },
      'Repair Bookings':        { icon: '&#x1F527;', cls: 'icon-purple'  },
      'Payments — M-Pesa': { icon: '&#x1F4B3;', cls: 'icon-amber'   },
      'Payments':               { icon: '&#x1F4B3;', cls: 'icon-amber'   },
      'Loyalty & Referrals':    { icon: '&#x2B50;',  cls: 'icon-indigo'  },
      'Repair Services':        { icon: '&#x1F6E0;', cls: 'icon-blue'    },
      'Delivery Zones':         { icon: '&#x1F5FA;', cls: 'icon-emerald' },
      'Tracking':               { icon: '&#x1F4CD;', cls: 'icon-blue'    },
      'Points':                 { icon: '&#x1F31F;', cls: 'icon-amber'   },
      'Admin Operations':       { icon: '&#x2699;',  cls: 'icon-rose'    },
      'Devices':                { icon: '&#x1F4F1;', cls: 'icon-purple'  },
      'Contact':                { icon: '&#x1F4EC;', cls: 'icon-blue'    },
      'Places':                 { icon: '&#x1F4CC;', cls: 'icon-emerald' },
      'Health':                 { icon: '&#x2764;',  cls: 'icon-emerald' },
    };

    const METHOD_CLS = {
      get: 'method-get', post: 'method-post',
      put: 'method-put', patch: 'method-patch', delete: 'method-delete',
    };

    function tagMeta(tag) {
      return TAG_META[tag] || { icon: '&#x1F517;', cls: 'icon-blue' };
    }

    function buildCard(tag, routes, tagDesc) {
      const meta = tagMeta(tag);
      const routeItems = routes.map(r => {
        const method = r.method.toLowerCase();
        const cls    = METHOD_CLS[method] || 'method-get';
        return `<div class="route-item">
          <span class="method ${cls}">${r.method.toUpperCase()}</span>
          <span class="route-path">${r.path}</span>
        </div>`;
      }).join('');

      const desc = tagDesc
        ? `<p class="card-desc">${tagDesc}</p>`
        : '';

      return `<div class="endpoint-card">
        <div class="card-header">
          <div class="card-icon ${meta.cls}">${meta.icon}</div>
          <div class="card-title">${tag}</div>
        </div>
        ${desc}
        <div class="route-list">${routeItems}</div>
      </div>`;
    }

    async function loadEndpoints() {
      const grid = document.getElementById('endpoints-grid');
      try {
        const res    = await fetch('/openapi.json');
        const schema = await res.json();

        // Build tag → description map from schema tags
        const tagDescMap = {};
        (schema.tags || []).forEach(t => { tagDescMap[t.name] = t.description || ''; });

        // Group paths by first tag
        const groups = {};
        Object.entries(schema.paths || {}).forEach(([path, methods]) => {
          Object.entries(methods).forEach(([method, op]) => {
            if (method === 'parameters') return;
            const tag = (op.tags && op.tags[0]) || 'Other';
            if (!groups[tag]) groups[tag] = [];
            groups[tag].push({ path, method });
          });
        });

        // Skip internal/health tags from cards (still counted)
        const SKIP_CARDS = new Set(['Health']);

        const totalEndpoints = Object.values(groups)
          .reduce((sum, routes) => sum + routes.length, 0);
        document.getElementById('endpoint-count').textContent = totalEndpoints + '+';

        const cards = Object.entries(groups)
          .filter(([tag]) => !SKIP_CARDS.has(tag))
          .map(([tag, routes]) => buildCard(tag, routes, tagDescMap[tag]))
          .join('');

        grid.innerHTML = cards || '<div class="loading">No endpoints found.</div>';
      } catch (e) {
        grid.innerHTML = '<div class="loading">Could not load endpoints. <a href="/docs" style="color:var(--blue-400)">Try Swagger UI</a></div>';
      }
    }

    loadEndpoints();
  </script>

</body>
</html>"""
