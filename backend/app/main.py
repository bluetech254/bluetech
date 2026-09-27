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
from fastapi.responses import JSONResponse
from orders.router import router as orders_router
from payments.router import router as payments_router
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
app.include_router(payments_router)
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

@app.get("/", tags=["Health"])
def root():
    return {"message": "Blue Technology API v2.0.0", "docs": "/docs", "redoc": "/redoc"}
