"""
app/config.py — environment configuration for the payments microservice.

Two databases:
  - Bluetech main DB (DB_*)          -> authoritative order/booking status
  - Payments DB (PAYMENTS_DB_*)      -> isolated transaction history / audit
"""
from pathlib import Path

from pydantic_settings import BaseSettings

# .env lives at the project root (payments/.env)
_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    # ── Bluetech main database ────────────────────────────────────────────────
    DB_HOST: str = "db"
    DB_PORT: int = 5432
    DB_NAME: str = "bluetech"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""

    # ── Isolated payments database ────────────────────────────────────────────
    PAYMENTS_DB_HOST: str = "payments-db"
    PAYMENTS_DB_PORT: int = 5432
    PAYMENTS_DB_NAME: str = "payments"
    PAYMENTS_DB_USER: str = "payments_user"
    PAYMENTS_DB_PASSWORD: str = ""

    # ── Inter-service auth ────────────────────────────────────────────────────
    PAYMENTS_API_KEY: str = ""

    # ── Gateway (Payhero only) ────────────────────────────────────────────────
    PAYMENTS_GATEWAY: str = "payhero"

    # ── Payhero (Yetu Sacco custom paybill) ───────────────────────────────────
    PAYHERO_API_URL: str = "https://backend.payhero.co.ke/api/v2"
    PAYHERO_API_USERNAME: str = ""
    PAYHERO_API_PASSWORD: str = ""
    PAYHERO_CHANNEL_ID: int = 0
    PAYHERO_CALLBACK_SECRET: str = ""

    # ── App ───────────────────────────────────────────────────────────────────
    FRONTEND_URL: str = ""
    CORS_ORIGINS: str = ""
    DEBUG: bool = False

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = str(_ENV_FILE)
        case_sensitive = True
        extra = "ignore"


settings = Settings()
