"""
bookings/router.py — Repair bookings HTTP routes.

Public:         POST /api/v1/bookings (guest + authenticated)
                GET  /api/v1/bookings/track/{phone}
Authenticated:  GET  /api/v1/bookings/{id}
Admin:          GET  /api/v1/bookings
                PUT  /api/v1/bookings/{id}/status
                PUT  /api/v1/bookings/{id}/cost
"""
import logging
from uuid import UUID

from admin_auth.dependencies import get_current_admin
from auth.dependencies import get_optional_user
from bookings import service
from bookings.models import BookingCreate, CostUpdate, StatusUpdate
from core.audit import log_action
from core.exceptions import BookingNotFoundException
from core.security import decode_token
from fastapi import APIRouter, Depends, HTTPException, Query, Request

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/bookings", tags=["Repair Bookings"])

# Never exposed to clients — server/admin-internal only.
_HIDDEN_FIELDS = {
    "estimated_cost",
    "final_cost",
    "pickup_fee",
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
    token = auth.split()[-1] if auth else ""
    payload = decode_token(token)
    return bool(payload and payload.get("type") == "admin")

def _sanitize(booking: dict, is_admin: bool = False) -> dict:
    if is_admin:
        return booking
    return {k: v for k, v in booking.items() if k not in _HIDDEN_FIELDS}


@router.post("")
def create_booking(body: BookingCreate, request: Request, user_id: str | None = Depends(get_optional_user)):
    """Create a new repair booking. Works for guests and authenticated users.

    - dropoff: no delivery fee, service only
    - pickup: 200 flat pickup fee, pickup_address required
    """
    try:
        booking = service.create_booking(body, user_id=user_id)
        return _sanitize(booking, _is_admin_request(request))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Create booking error: {e}")
        raise HTTPException(status_code=500, detail="Booking creation failed.")


@router.get("")
def get_bookings(
    status: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(get_current_admin),
):
    """Get all bookings with pagination. Admin only."""
    bookings = service.get_bookings(status=status, limit=limit, offset=offset)
    return {"data": bookings, "count": len(bookings)}


@router.get("/track/{phone}")
def track_bookings(phone: str, request: Request):
    """Track bookings by phone number. Public — no auth required. Costs hidden from clients."""
    is_admin = _is_admin_request(request)
    bookings = service.track_bookings_by_phone(phone)
    return {"data": [_sanitize(b, is_admin) for b in bookings], "count": len(bookings)}


@router.get("/{booking_id}")
def get_booking(booking_id: UUID, request: Request, user_id: str | None = Depends(get_optional_user)):
    """Get a single booking by ID. Costs hidden from clients."""
    try:
        booking = service.get_booking_by_id(booking_id)
        # Authenticated users can only view their own bookings
        if user_id and booking.get("user_id") and str(booking["user_id"]) != str(user_id):
            raise HTTPException(status_code=403, detail="Access denied")
        return _sanitize(booking, _is_admin_request(request))
    except BookingNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{booking_id}/status")
def update_booking_status(
    booking_id: UUID,
    body: StatusUpdate,
    admin: dict = Depends(get_current_admin),
):
    """Update booking status. Sends SMS to customer. Admin only.

    Strict single-step lifecycle (no skipping):
    pending → confirmed → picked_up → in_diagnosis → in_repair → ready → completed.
    Cancellation: any non-terminal state → cancelled.
    Invalid transitions return 400.
    """
    try:
        updated = service.update_booking_status(booking_id, body.status)
        log_action(admin, "booking.status_update", f"booking:{booking_id}", {"status": body.status})
        return updated
    except BookingNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Update booking status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{booking_id}/cost")
def update_booking_cost(
    booking_id: UUID,
    body: CostUpdate,
    admin: dict = Depends(get_current_admin),
):
    """Set estimated/final/pickup fee. Admin only (prices set manually by admin)."""
    try:
        updated = service.update_booking_cost(booking_id, body)
        log_action(admin, "booking.cost_update", f"booking:{booking_id}", {
            "estimated_cost": str(body.estimated_cost),
            "final_cost": str(body.final_cost),
            "pickup_fee": str(body.pickup_fee),
        })
        return updated
    except BookingNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Update booking cost error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
