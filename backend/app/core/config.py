"""
core/config.py — All environment variables validated at startup.

Uses pydantic-settings so the app crashes immediately with a clear error
if any required variable is missing, rather than failing silently at runtime.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Required — no defaults, app will not start without these ──────────────
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str
    JWT_SECRET: str
    MPESA_CONSUMER_KEY: str
    MPESA_CONSUMER_SECRET: str
    MPESA_SHORTCODE: str
    MPESA_PASSKEY: str
    MPESA_CALLBACK_URL: str

    # ── Optional with safe defaults ───────────────────────────────────────────
    MPESA_ENV: str = "sandbox"          # "sandbox" | "production"
    DEBUG: bool = False                 # NEVER default True in production
    API_HOST: str = "0.0.0.0"  # nosec B104 — intentional, required for containerised deployment
    API_PORT: int = 8000

    # CORS — comma-separated list of allowed origins
    CORS_ORIGINS: str = (
        "https://fixit-bluetechnology.co.ke,"
        "https://www.fixit-bluetechnology.co.ke,"
        "https://admin.fixit-bluetechnology.co.ke,"
        "https://bluetechadmin.vercel.app,"
        "https://bluetech-client.vercel.app"
    )

    # SMS — TextPie
    TEXTPIE_API_KEY: str = ""
    TEXTPIE_SHORTCODE: str = "Textpie_LTD"
    TEXTPIE_SERVICE_ID: int = 151

    # Email — AWS SES (optional, falls back gracefully if not set)
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    SES_SENDER_EMAIL: str = ""

    # Google Maps (optional — Places autocomplete)
    GOOGLE_MAPS_API_KEY: str = ""

    # ── Computed helpers ──────────────────────────────────────────────────────
    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS origins as a list, stripping whitespace."""
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        # Always add localhost in debug mode for local development
        if self.DEBUG:
            origins += ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]
        return origins

    @property
    def mpesa_base_url(self) -> str:
        if self.MPESA_ENV == "production":
            return "https://api.safaricom.co.ke"
        return "https://sandbox.safaricom.co.ke"

    # ── Validators ────────────────────────────────────────────────────────────
    @field_validator("MPESA_ENV")
    @classmethod
    def validate_mpesa_env(cls, v: str) -> str:
        if v not in ("sandbox", "production"):
            raise ValueError("MPESA_ENV must be 'sandbox' or 'production'")
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # ignore unknown env vars silently


# ── Module-level singleton ────────────────────────────────────────────────────
# Instantiation validates all required fields immediately.
# Import this anywhere: from core.config import settings
settings = Settings()
