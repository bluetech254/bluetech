"""
app/auth.py — simple X-API-Key authentication for inter-service calls.

Every non-webhook route requires the shared secret in the X-API-Key header.
Webhook routes are authenticated by gateway signature instead.
"""
import hmac

from fastapi import Header, HTTPException

from app.config import settings


def require_api_key(x_api_key: str | None = Header(default=None)) -> str:
    if not settings.PAYMENTS_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="PAYMENTS_API_KEY is not configured on the server",
        )
    if not x_api_key or not hmac.compare_digest(x_api_key, settings.PAYMENTS_API_KEY):
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key
