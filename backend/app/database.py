from supabase import create_client, Client
from app.config import settings

def get_supabase_client() -> Client:
    """Get Supabase client with anon key (for public operations)"""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

def get_admin_client() -> Client:
    """Get Supabase client with service role key (for admin operations)"""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

# Lazy singletons — initialized on first access, not at import time
_supabase: Client | None = None
_supabase_admin: Client | None = None

def get_db() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = get_supabase_client()
    return _supabase

def get_admin_db() -> Client:
    global _supabase_admin
    if _supabase_admin is None:
        _supabase_admin = get_admin_client()
    return _supabase_admin

# Keep backward-compatible module-level names as proxies
class _LazyClient:
    """Proxy that forwards attribute access to the real client on first use."""
    def __init__(self, getter):
        object.__setattr__(self, '_getter', getter)

    def __getattr__(self, name):
        return getattr(object.__getattribute__(self, '_getter')(), name)

    def __setattr__(self, name, value):
        setattr(object.__getattribute__(self, '_getter')(), name, value)

supabase = _LazyClient(get_db)
supabase_admin = _LazyClient(get_admin_db)
