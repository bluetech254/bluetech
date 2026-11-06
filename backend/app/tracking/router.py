"""tracking/router.py — Public order+booking tracking by phone number."""
import logging

from core.db import db
from core.security import decode_token
from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/track", tags=["Tracking"])

_HIDDEN_FIELDS = {
    "estimated_cost",
    "final_cost",
    "commitment_fee",
    "commitment_payment_status",
    "commitment_payment_reference",
    "commitment_receipt",
    "final_payment_status",
    "final_payment_reference",
    "final_receipt",
    "final_checkout_id",
    "internal_notes",
}

def _is_admin_request(request: Request) -> bool:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth:
        return False
    payload = decode_token(auth.split()[-1])
    return bool(payload and payload.get("type") == "admin")

def _sanitize(booking: dict, is_admin: bool = False) -> dict:
    if is_admin:
        return booking
    return {k: v for k, v in booking.items() if k not in _HIDDEN_FIELDS}


@router.get("/{phone}")
def track_by_phone(phone: str, request: Request):
    """Track all orders and bookings for a phone number. No auth required. Costs hidden from clients."""
    try:
        is_admin = _is_admin_request(request)
        orders   = db.table("orders").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
        bookings = db.table("bookings").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
        return {
            "phone_number": phone,
            "orders":       orders.data or [],
            "bookings":     [_sanitize(b, is_admin) for b in (bookings.data or [])],
        }
    except Exception as e:
        logger.error(f"Track by phone error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
