"""
core/config.py — All environment variables validated at startup.

Uses pydantic-settings so the app crashes immediately with a clear error
if any required variable is missing, rather than failing silently at runtime.
"""

from pathlib import Path
from pydantic_settings import BaseSettings

# Resolve .env relative to this file so it works regardless of working directory.
# config.py lives at backend/app/core/config.py → go up 3 levels to backend/
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    # ── Required — no defaults, app will not start without these ──────────────
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str
    JWT_SECRET: str

    # ── M-Pesa Daraja (default payment provider) ──────────────────────────────
    MPESA_CONSUMER_KEY: str    = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_SHORTCODE: str       = ""
    MPESA_PASSKEY: str         = ""
    MPESA_CALLBACK_URL: str    = ""
    MPESA_ENV: str             = "sandbox"   # "sandbox" | "production"

    # ── Paystack (secondary — ready when needed) ──────────────────────────────
    PAYSTACK_SECRET_KEY: str   = ""          # sk_live_... or sk_test_...
    PAYSTACK_PUBLIC_KEY: str   = ""          # pk_live_... or pk_test_...
    # Frontend base URL — used to build Paystack callback_url
    # Dev:  http://localhost:3001   Prod: https://fixit-bluetechnology.co.ke
    FRONTEND_URL: str          = ""

    # ── Optional with safe defaults ───────────────────────────────────────────
    DEBUG: bool = False                 # NEVER default True in production
    API_HOST: str = "0.0.0.0"  # nosec B104 — intentional, required for containerised deployment
    API_PORT: int = 8000

    # CORS — comma-separated list of allowed origins.
    # Must be set explicitly per environment — no prod URLs baked into code.
    # Dev:  CORS_ORIGINS=http://localhost:3001,http://localhost:5173
    # Prod: CORS_ORIGINS=https://fixit-bluetechnology.co.ke,https://admin.fixit-bluetechnology.co.ke
    CORS_ORIGINS: str = ""

    # SMS — BlessedTexts Bulk SMS
    BLESSEDTEXTS_API_KEY: str    = ""
    BLESSEDTEXTS_SENDER_ID: str  = "23107"   # Sender ID assigned in BlessedTexts account
    BLESSEDTEXTS_API_URL: str    = "https://sms.blessedtexts.com/api/sms/v1/sendsms"

    # Payments — Paystack
    PAYSTACK_API_URL: str  = "https://api.paystack.co"

    # Payments — M-Pesa Daraja API base URLs (overridable for test mocks)
    MPESA_API_URL_PROD:    str = "https://api.safaricom.co.ke"
    MPESA_API_URL_SANDBOX: str = "https://sandbox.safaricom.co.ke"

    # Google Maps (optional — Places autocomplete)
    GOOGLE_MAPS_API_KEY:   str = ""
    GOOGLE_PLACES_API_URL: str = "https://maps.googleapis.com/maps/api/place/autocomplete/json"

    # Email — AWS SES (optional, falls back gracefully if not set)
    AWS_REGION: str            = "us-east-1"
    AWS_ACCESS_KEY_ID: str     = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    SES_SENDER_EMAIL: str      = ""

    # ── Computed helpers ──────────────────────────────────────────────────────
    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS origins as a list, stripping whitespace.
        In DEBUG mode, localhost origins are always appended so local dev
        never requires editing CORS_ORIGINS.
        """
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        if self.DEBUG:
            for loc in [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:5173",
            ]:
                if loc not in origins:
                    origins.append(loc)
        return origins

    @property
    def mpesa_base_url(self) -> str:
        if self.MPESA_ENV == "production":
            return self.MPESA_API_URL_PROD
        return self.MPESA_API_URL_SANDBOX

    class Config:
        env_file = str(_ENV_FILE)
        case_sensitive = True
        extra = "ignore"  # ignore unknown env vars silently


# ── Module-level singleton ────────────────────────────────────────────────────
# Instantiation validates all required fields immediately.
# Import this anywhere: from core.config import settings
settings = Settings()
