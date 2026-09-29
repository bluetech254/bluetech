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
      'Admin Authentication':   { icon: '\uD83D\uDD10', cls: 'icon-rose'    },
      'Client Authentication':  { icon: '\uD83D\uDC64', cls: 'icon-blue'    },
      'Products':               { icon: '\uD83D\uDCE6', cls: 'icon-indigo'  },
      'Orders':                 { icon: '\uD83D\uDED2', cls: 'icon-emerald' },
      'Repair Bookings':        { icon: '\uD83D\uDD27', cls: 'icon-purple'  },
      'Payments \u2014 M-Pesa': { icon: '\uD83D\uDCB3', cls: 'icon-amber'   },
      'Payments':               { icon: '\uD83D\uDCB3', cls: 'icon-amber'   },
      'Loyalty & Referrals':    { icon: '\u2B50',        cls: 'icon-indigo'  },
      'Repair Services':        { icon: '\uD83D\uDEE0\uFE0F', cls: 'icon-blue' },
      'Delivery Zones':         { icon: '\uD83D\uDDFA\uFE0F', cls: 'icon-emerald' },
      'Tracking':               { icon: '\uD83D\uDCCD', cls: 'icon-blue'    },
      'Points':                 { icon: '\uD83C\uDF1F', cls: 'icon-amber'   },
      'Admin Operations':       { icon: '\u2699\uFE0F', cls: 'icon-rose'    },
      'Devices':                { icon: '\uD83D\uDCF1', cls: 'icon-purple'  },
      'Contact':                { icon: '\uD83D\uDCEC', cls: 'icon-blue'    },
      'Places':                 { icon: '\uD83D\uDCCC', cls: 'icon-emerald' },
      'Health':                 { icon: '\u2764\uFE0F', cls: 'icon-emerald' },
    };

    const METHOD_CLS = {
      get: 'method-get', post: 'method-post',
      put: 'method-put', patch: 'method-patch', delete: 'method-delete',
    };

    function tagMeta(tag) {
      return TAG_META[tag] || { icon: '\uD83D\uDD17', cls: 'icon-blue' };
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
