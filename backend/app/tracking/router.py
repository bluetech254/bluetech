"""tracking/router.py — Public order+booking tracking by phone number."""
import logging
from fastapi import APIRouter, HTTPException
from core.database import supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/track", tags=["Tracking"])


@router.get("/{phone}")
def track_by_phone(phone: str):
    """Track all orders and bookings for a phone number. No auth required."""
    try:
        orders   = supabase.table("orders").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
        bookings = supabase.table("bookings").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
        return {
            "phone_number": phone,
            "orders":       orders.data or [],
            "bookings":     bookings.data or [],
        }
    except Exception as e:
        logger.error(f"Track by phone error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
