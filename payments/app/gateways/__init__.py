"""app/gateways/__init__.py — gateway registry (Payhero only)."""
from app.config import settings
from app.gateways import payhero

_GATEWAYS = {"payhero": payhero}


def get_gateway(name: str | None = None):
    key = (name or settings.PAYMENTS_GATEWAY or "payhero").lower()
    gateway = _GATEWAYS.get(key)
    if gateway is None:
        raise ValueError(f"Unknown gateway '{key}' (only 'payhero' is supported)")
    return gateway
