from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from app.config import settings
from app.api import products, orders, bookings, tracking, delivery_zones, services, auth, payments, admin_auth, points, admin_ops

# Tag metadata — drives ReDoc sidebar grouping and descriptions
tags_metadata = [
    {"name": "Admin Authentication",  "description": "Dedicated admin login, profile, password management, and admin account control. All write operations require a valid admin Bearer token."},
    {"name": "Admin Operations",      "description": "Analytics dashboard, stock alerts, CSV export, bulk order actions, referral tracking, customer history, global search, and audit log."},
    {"name": "Client Authentication", "description": "Customer registration, login, phone OTP verification, and password reset via SMS."},
    {"name": "Products",              "description": "Product catalog — public read, admin-guarded create/update/deactivate."},
    {"name": "Orders",                "description": "E-commerce order lifecycle. Supports loyalty points redemption and referral codes at checkout. Points are awarded on delivery."},
    {"name": "Repair Bookings",       "description": "Device repair job management. Status updates trigger SMS notifications to the customer."},
    {"name": "Payments",              "description": "Safaricom M-Pesa STK push — initiate payment, receive Safaricom callback, and poll payment status."},
    {"name": "Loyalty & Referrals",   "description": "Points system: earn 10% of order subtotal on delivery, 50 points per referral. Redeem 1000+ points for KES discount (delivery fee always charged)."},
    {"name": "Repair Services",       "description": "Repair services catalog with category filtering."},
    {"name": "Delivery Zones",        "description": "Active delivery zones and their fees."},    {"name": "Tracking",              "description": "Track all orders and bookings by phone number."},
]

# Create FastAPI app
app = FastAPI(
    title="Blue Technology API",
    description="""
## BlueTech REST API

Production backend for **Blue Technology Ltd** — Nairobi's electronics repair and e-commerce platform.

### Authentication
- **Client routes** use `Bearer` JWT tokens obtained from `/api/v1/auth/login`
- **Admin routes** use `Bearer` JWT tokens obtained from `/api/v1/admin/auth/login`

### Loyalty & Referrals
- Earn **10% of order subtotal** as points on delivery
- Refer a friend → earn **50 points** when they place their first order
- Redeem **1000+ points** for KES discount at checkout (delivery fee always applies)

### Payments
- M-Pesa STK push via Safaricom Daraja API
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=tags_metadata,
    contact={"name": "Blue Technology Ltd", "email": "dev@bluetech.co.ke"},
    license_info={"name": "Proprietary"},
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if not settings.DEBUG else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(admin_auth.router)
app.include_router(admin_ops.router)
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(bookings.router)
app.include_router(payments.router)
app.include_router(points.router)
app.include_router(services.router)
app.include_router(delivery_zones.router)
app.include_router(tracking.router)

@app.get("/", response_class=HTMLResponse)
def root():
    """BlueTech API — branded landing page"""
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

    /* ── Header ── */
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

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--blue-600), var(--indigo-600));
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      color: white;
      letter-spacing: -1px;
    }

    .logo-text {
      font-size: 16px;
      font-weight: 700;
      color: white;
    }

    .logo-sub {
      font-size: 11px;
      color: var(--slate-400);
      margin-top: 1px;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.25);
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      color: var(--emerald-400);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      background: var(--emerald-500);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* ── Hero ── */
    .hero {
      padding: 80px 40px 60px;
      text-align: center;
      max-width: 760px;
      margin: 0 auto;
    }

    .version-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(37,99,235,0.12);
      border: 1px solid rgba(37,99,235,0.3);
      color: var(--blue-400);
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 24px;
    }

    h1 {
      font-size: clamp(32px, 5vw, 52px);
      font-weight: 800;
      color: white;
      line-height: 1.15;
      letter-spacing: -1.5px;
      margin-bottom: 16px;
    }

    h1 span {
      background: linear-gradient(135deg, var(--blue-400), var(--indigo-600));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-desc {
      font-size: 16px;
      color: var(--slate-400);
      line-height: 1.7;
      max-width: 520px;
      margin: 0 auto 36px;
    }

    .hero-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--blue-600), var(--indigo-600));
      color: white;
      font-size: 13px;
      font-weight: 700;
      padding: 11px 24px;
      border-radius: 8px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

    .btn-secondary {
      background: transparent;
      color: var(--slate-300);
      font-size: 13px;
      font-weight: 600;
      padding: 11px 24px;
      border-radius: 8px;
      text-decoration: none;
      border: 1px solid var(--slate-700);
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-secondary:hover { border-color: var(--slate-500); color: white; }

    /* ── Stats Bar ── */
    .stats-bar {
      display: flex;
      justify-content: center;
      gap: 0;
      border-top: 1px solid var(--slate-800);
      border-bottom: 1px solid var(--slate-800);
      background: var(--slate-900);
      flex-wrap: wrap;
    }

    .stat-item {
      padding: 20px 40px;
      text-align: center;
      border-right: 1px solid var(--slate-800);
      flex: 1;
      min-width: 140px;
    }

    .stat-item:last-child { border-right: none; }

    .stat-value {
      font-size: 22px;
      font-weight: 800;
      color: white;
      letter-spacing: -0.5px;
    }

    .stat-label {
      font-size: 11px;
      color: var(--slate-500);
      margin-top: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    /* ── Endpoints Grid ── */
    .section {
      padding: 60px 40px;
      max-width: 1100px;
      margin: 0 auto;
      width: 100%;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--blue-400);
      margin-bottom: 8px;
    }

    .section-heading {
      font-size: 24px;
      font-weight: 800;
      color: white;
      letter-spacing: -0.5px;
      margin-bottom: 32px;
    }

    .endpoints-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .endpoint-card {
      background: var(--slate-900);
      border: 1px solid var(--slate-800);
      border-radius: 10px;
      padding: 20px;
      transition: border-color 0.15s, transform 0.15s;
    }

    .endpoint-card:hover {
      border-color: var(--slate-600);
      transform: translateY(-2px);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .card-icon {
      width: 32px;
      height: 32px;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      flex-shrink: 0;
    }

    .icon-blue { background: rgba(37,99,235,0.15); }
    .icon-indigo { background: rgba(79,70,229,0.15); }
    .icon-emerald { background: rgba(16,185,129,0.15); }
    .icon-amber { background: rgba(251,191,36,0.15); }
    .icon-rose { background: rgba(244,63,94,0.15); }
    .icon-purple { background: rgba(168,85,247,0.15); }

    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: white;
    }

    .card-desc {
      font-size: 12px;
      color: var(--slate-400);
      line-height: 1.6;
      margin-bottom: 14px;
    }

    .route-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .route-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-family: "SF Mono", "Fira Code", monospace;
    }

    .method {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      min-width: 38px;
      text-align: center;
    }

    .method-get { background: rgba(16,185,129,0.15); color: var(--emerald-400); }
    .method-post { background: rgba(37,99,235,0.15); color: var(--blue-400); }
    .method-put { background: rgba(251,191,36,0.15); color: var(--amber-400); }
    .method-delete { background: rgba(244,63,94,0.15); color: #fb7185; }

    .route-path {
      color: var(--slate-300);
    }

    /* ── Admin Section ── */
    .admin-banner {
      background: linear-gradient(135deg, rgba(37,99,235,0.08), rgba(79,70,229,0.08));
      border: 1px solid rgba(37,99,235,0.2);
      border-radius: 12px;
      padding: 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
      margin-bottom: 60px;
    }

    .admin-banner-text h3 {
      font-size: 18px;
      font-weight: 800;
      color: white;
      margin-bottom: 6px;
    }

    .admin-banner-text p {
      font-size: 13px;
      color: var(--slate-400);
    }

    /* ── Footer ── */
    footer {
      margin-top: auto;
      border-top: 1px solid var(--slate-800);
      padding: 24px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .footer-left {
      font-size: 12px;
      color: var(--slate-500);
    }

    .footer-links {
      display: flex;
      gap: 20px;
    }

    .footer-links a {
      font-size: 12px;
      color: var(--slate-500);
      text-decoration: none;
      transition: color 0.15s;
    }

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

  <!-- Header -->
  <header>
    <div class="logo">
      <div class="logo-icon">BT</div>
      <div>
        <div class="logo-text">Blue Technology</div>
        <div class="logo-sub">REST API v1.0.0</div>
      </div>
    </div>
    <div class="status-badge">
      <div class="status-dot"></div>
      All Systems Operational
    </div>
  </header>

  <!-- Hero -->
  <div class="hero">
    <div class="version-tag">⚡ v1.0.0 · FastAPI · Supabase</div>
    <h1>Blue Technology<br /><span>Backend API</span></h1>
    <p class="hero-desc">
      Production-grade REST API powering the BlueTech e-commerce platform and electronics repair booking system. Built for speed, security, and scale.
    </p>
    <div class="hero-actions">
      <a href="/docs" class="btn-primary">📖 Interactive Docs (Swagger)</a>
      <a href="/redoc" class="btn-secondary">📄 ReDoc Reference</a>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-bar">
    <div class="stat-item">
      <div class="stat-value">25+</div>
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

  <!-- Endpoints -->
  <div class="section">
    <div class="section-title">API Reference</div>
    <div class="section-heading">Available Endpoints</div>

    <div class="endpoints-grid">

      <!-- Admin Auth -->
      <div class="endpoint-card">
        <div class="card-header">
          <div class="card-icon icon-rose">🔐</div>
          <div class="card-title">Admin Authentication</div>
        </div>
        <p class="card-desc">Dedicated admin-only auth. Role-based JWT with superadmin controls. Completely separate from client auth.</p>
        <div class="route-list">
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/admin/auth/login</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/admin/auth/me</span></div>
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/admin/auth/logout</span></div>
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/admin/auth/change-password</span></div>
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/admin/auth/create-admin</span></div>
          <div class="route-item"><span class="method method-put">PUT</span><span class="route-path">/api/v1/admin/auth/deactivate/{id}</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/admin/auth/list</span></div>
          <div class="route-item"><span class="method method-put">PUT</span><span class="route-path">/api/v1/admin/auth/users/{id}/toggle-active</span></div>
        </div>
      </div>

      <!-- Client Auth -->
      <div class="endpoint-card">
        <div class="card-header">
          <div class="card-icon icon-blue">👤</div>
          <div class="card-title">Client Authentication</div>
        </div>
        <p class="card-desc">Customer registration with referral code support, login, phone OTP verification, and password reset via SMS.</p>
        <div class="route-list">
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/auth/signup</span></div>
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/auth/login</span></div>
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/auth/verify-phone</span></div>
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/auth/forgot-password</span></div>
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/auth/reset-password</span></div>
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/auth/resend-code</span></div>
        </div>
      </div>

      <!-- Products -->
      <div class="endpoint-card">
        <div class="card-header">
          <div class="card-icon icon-indigo">📦</div>
          <div class="card-title">Products</div>
        </div>
        <p class="card-desc">Product catalog — public read, admin-guarded writes. Supports search and active-only filtering.</p>
        <div class="route-list">
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/products</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/products/{id}</span></div>
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/products <span style="color:#f87171;font-size:9px;">🔒 Admin</span></span></div>
          <div class="route-item"><span class="method method-put">PUT</span><span class="route-path">/api/v1/products/{id} <span style="color:#f87171;font-size:9px;">🔒 Admin</span></span></div>
          <div class="route-item"><span class="method method-delete">DEL</span><span class="route-path">/api/v1/products/{id} <span style="color:#f87171;font-size:9px;">🔒 Admin</span></span></div>
        </div>
      </div>

      <!-- Orders -->
      <div class="endpoint-card">
        <div class="card-header">
          <div class="card-icon icon-emerald">🛒</div>
          <div class="card-title">Orders</div>
        </div>
        <p class="card-desc">E-commerce order lifecycle. Supports loyalty points redemption and referral codes at checkout. Points awarded on delivery.</p>
        <div class="route-list">
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/orders</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/orders</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/orders/{id}</span></div>
          <div class="route-item"><span class="method method-put">PUT</span><span class="route-path">/api/v1/orders/{id}/status <span style="color:#f87171;font-size:9px;">🔒 Admin</span></span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/orders/track/{phone}</span></div>
        </div>
      </div>

      <!-- Bookings -->
      <div class="endpoint-card">
        <div class="card-header">
          <div class="card-icon icon-purple">🔧</div>
          <div class="card-title">Repair Bookings</div>
        </div>
        <p class="card-desc">Device repair job management. Status updates trigger SMS to customer at key stages.</p>
        <div class="route-list">
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/bookings</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/bookings</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/bookings/{id}</span></div>
          <div class="route-item"><span class="method method-put">PUT</span><span class="route-path">/api/v1/bookings/{id}/status <span style="color:#f87171;font-size:9px;">🔒 Admin</span></span></div>
          <div class="route-item"><span class="method method-put">PUT</span><span class="route-path">/api/v1/bookings/{id}/cost <span style="color:#f87171;font-size:9px;">🔒 Admin</span></span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/bookings/track/{phone}</span></div>
        </div>
      </div>

      <!-- Payments -->
      <div class="endpoint-card">
        <div class="card-header">
          <div class="card-icon icon-amber">💳</div>
          <div class="card-title">M-Pesa Payments</div>
        </div>
        <p class="card-desc">Safaricom M-Pesa STK push — initiate payment, receive Safaricom webhook callback, poll payment status.</p>
        <div class="route-list">
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/payments/mpesa/initiate</span></div>
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/payments/mpesa/callback</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/payments/mpesa/status/{id}</span></div>
        </div>
      </div>

      <!-- Loyalty & Referrals -->
      <div class="endpoint-card">
        <div class="card-header">
          <div class="card-icon icon-indigo">⭐</div>
          <div class="card-title">Loyalty & Referrals</div>
        </div>
        <p class="card-desc">Earn 10% of subtotal as points on delivery. 50 pts per referral. Redeem 1000+ pts for KES discount (delivery fee always charged).</p>
        <div class="route-list">
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/points/me</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/points/history</span></div>
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/points/redeem</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/points/admin/user/{id} <span style="color:#f87171;font-size:9px;">🔒 Admin</span></span></div>
          <div class="route-item"><span class="method method-post">POST</span><span class="route-path">/api/v1/points/admin/award/{id} <span style="color:#f87171;font-size:9px;">🔒 Admin</span></span></div>
        </div>
      </div>

      <!-- Repair Services -->
      <div class="endpoint-card">
        <div class="card-header">
          <div class="card-icon icon-blue">🛠️</div>
          <div class="card-title">Repair Services</div>
        </div>
        <p class="card-desc">Repair services catalog with category filtering. Used for cost reference in booking workflow.</p>
        <div class="route-list">
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/repair-services</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/repair-services/categories</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/repair-services/{id}</span></div>
        </div>
      </div>

      <!-- Delivery Zones -->
      <div class="endpoint-card">
        <div class="card-header">
          <div class="card-icon icon-emerald">🗺️</div>
          <div class="card-title">Delivery Zones</div>
        </div>
        <p class="card-desc">Active delivery zones and their fees. Used at checkout to calculate order total.</p>
        <div class="route-list">
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/delivery-zones</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/api/v1/track/{phone}</span></div>
        </div>
      </div>

      <!-- Health -->
      <div class="endpoint-card">
        <div class="card-header">
          <div class="card-icon icon-emerald">❤️</div>
          <div class="card-title">Health & System</div>
        </div>
        <p class="card-desc">API and database health checks. Use for uptime monitoring and deployment verification.</p>
        <div class="route-list">
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/health</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/health/db</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/docs</span></div>
          <div class="route-item"><span class="method method-get">GET</span><span class="route-path">/redoc</span></div>
        </div>
      </div>

    </div>
  </div>

  <!-- Admin Banner -->
  <div class="section" style="padding-top: 0;">
    <div class="admin-banner">
      <div class="admin-banner-text">
        <h3>🔐 Admin Panel Access</h3>
        <p>Authenticate via <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-size:12px;">/api/v1/admin/auth/login</code> to receive a JWT token with role claims. All admin write operations require a valid admin Bearer token.</p>
      </div>
      <a href="/docs#/Admin%20Authentication" class="btn-primary" style="white-space:nowrap;">View Admin Docs →</a>
    </div>
  </div>

  <!-- Footer -->
  <footer>
    <div class="footer-left">© 2026 Blue Technology Ltd · Nairobi, Kenya · All rights reserved</div>
    <div class="footer-links">
      <a href="/docs">Swagger UI</a>
      <a href="/redoc">ReDoc</a>
      <a href="/health">Health</a>
      <a href="/health/db">DB Health</a>
    </div>
  </footer>

</body>
</html>"""


@app.get("/health")
def health_check():
    """API health check"""
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/health/db")
def db_health_check():
    """Database connectivity health check"""
    from app.database import supabase
    try:
        supabase.table("products").select("id").limit(1).execute()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        from fastapi import Response
        return {"status": "unhealthy", "database": "unreachable", "error": str(e)}
