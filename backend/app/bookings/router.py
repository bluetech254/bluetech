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
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Depends

from core.exceptions import BookingNotFoundException
from core.audit import log_action
from admin_auth.dependencies import get_current_admin
from auth.dependencies import get_optional_user
from bookings.models import BookingCreate, StatusUpdate, CostUpdate
from bookings import service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/bookings", tags=["Repair Bookings"])


@router.post("")
def create_booking(body: BookingCreate, user_id: Optional[str] = Depends(get_optional_user)):
    """Create a new repair booking. Works for guests and authenticated users."""
    try:
        return service.create_booking(body, user_id=user_id)
    except Exception as e:
        logger.error(f"Create booking error: {e}")
        raise HTTPException(status_code=500, detail="Booking creation failed.")


@router.get("")
def get_bookings(
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(get_current_admin),
):
    """Get all bookings with pagination. Admin only."""
    bookings = service.get_bookings(status=status, limit=limit, offset=offset)
    return {"data": bookings, "count": len(bookings)}


@router.get("/track/{phone}")
def track_bookings(phone: str):
    """Track bookings by phone number. Public — no auth required."""
    bookings = service.track_bookings_by_phone(phone)
    return {"data": bookings, "count": len(bookings)}


@router.get("/{booking_id}")
def get_booking(booking_id: UUID, user_id: Optional[str] = Depends(get_optional_user)):
    """Get a single booking by ID."""
    try:
        booking = service.get_booking_by_id(booking_id)
        # Authenticated users can only view their own bookings
        if user_id and booking.get("user_id") and str(booking["user_id"]) != str(user_id):
            raise HTTPException(status_code=403, detail="Access denied")
        return booking
    except BookingNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{booking_id}/status")
def update_booking_status(
    booking_id: UUID,
    body: StatusUpdate,
    admin: dict = Depends(get_current_admin),
):
    """Update booking status. Sends SMS to customer. Awards points on completion. Admin only."""
    try:
        updated = service.update_booking_status(booking_id, body.status)
        log_action(admin, "booking.status_update", f"booking:{booking_id}", {"status": body.status})
        return updated
    except BookingNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Update booking status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{booking_id}/cost")
def update_booking_cost(
    booking_id: UUID,
    body: CostUpdate,
    admin: dict = Depends(get_current_admin),
):
    """Set estimated or final repair cost. Admin only."""
    try:
        updated = service.update_booking_cost(booking_id, body)
        log_action(admin, "booking.cost_update", f"booking:{booking_id}", {
            "estimated_cost": str(body.estimated_cost),
            "final_cost": str(body.final_cost),
        })
        return updated
    except BookingNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Update booking cost error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
