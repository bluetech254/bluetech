"""
app/main.py — FastAPI entrypoint for the Fixit Blue Technology payments microservice.
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app import db
from app.api import commitment, final, order, webhook
from app.config import settings
from app.limiter import limiter

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(title="Fixit Blue Technology Payments API", version="1.0.0", docs_url=None, redoc_url=None, openapi_url=None)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(order.router)
app.include_router(commitment.router)
app.include_router(final.router)
app.include_router(webhook.router)


@app.get("/health", tags=["Health"])
def health():
    databases = db.healthcheck()
    healthy = all(value == "up" for value in databases.values())
    return {"status": "ok" if healthy else "degraded", "databases": databases}


@app.get("/", tags=["Health"])
def root():
    databases = db.healthcheck()
    healthy = all(value == "up" for value in databases.values())
    color = "#808080" if healthy else "#ef4444"
    name = "Fixit Blue Technology Payments"
    html = (
        "<!doctype html><html><body style=\""
        "background:#000;color:%s;display:flex;align-items:center;justify-content:center;"
        "height:100vh;margin:0;font-family:sans-serif;font-size:28px;text-align:center\">%s</body></html>"
        % (color, name)
    )

    return HTMLResponse(content=html, media_type="text/html")
