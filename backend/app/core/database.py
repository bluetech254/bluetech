"""
core/database.py — Supabase client singletons.

Two clients:
  supabase       — anon key, respects RLS (for public/client operations)
  supabase_admin — service role key, bypasses RLS (for backend/admin operations)

Both are lazy singletons — initialized on first access, not at import time,
so the app can start and validate config before opening DB connections.
"""
from supabase import create_client, Client
from core.config import settings


# ── Factory functions ─────────────────────────────────────────────────────────

def _make_anon_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def _make_admin_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


# ── Lazy singletons ───────────────────────────────────────────────────────────

_anon_client:  Client | None = None
_admin_client: Client | None = None


def get_db() -> Client:
    """Public Supabase client — respects Row Level Security."""
    global _anon_client
    if _anon_client is None:
        _anon_client = _make_anon_client()
    return _anon_client


def get_admin_db() -> Client:
    """Service-role Supabase client — bypasses RLS. Never expose to clients."""
    global _admin_client
    if _admin_client is None:
        _admin_client = _make_admin_client()
    return _admin_client


# ── Proxy objects ─────────────────────────────────────────────────────────────
# These allow `from core.database import supabase` with lazy initialization.
# They forward every attribute/method call to the real client on first use.

class _LazyClient:
    """Transparent proxy — forwards all attribute access to the real client."""
    def __init__(self, getter):
        object.__setattr__(self, "_getter", getter)

    def __getattr__(self, name):
        return getattr(object.__getattribute__(self, "_getter")(), name)

    def __setattr__(self, name, value):
        setattr(object.__getattribute__(self, "_getter")(), name, value)


# Use these everywhere — they behave exactly like the real Supabase client
supabase       = _LazyClient(get_db)
supabase_admin = _LazyClient(get_admin_db)
