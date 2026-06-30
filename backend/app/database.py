from supabase import create_client, Client
from app.config import settings

def get_supabase_client() -> Client:
    """Get Supabase client with anon key (for public operations)"""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

def get_admin_client() -> Client:
    """Get Supabase client with service role key (for admin operations)"""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

# Initialize clients
supabase = get_supabase_client()
supabase_admin = get_admin_client()
