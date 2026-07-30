from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from uuid import UUID
from app.services import booking_service
from app.models.booking import BookingCreate, CostUpdate
from app.models.order import StatusUpdate
from app.utils.exceptions import BookingNotFoundException
from app.api.admin_auth import get_current_admin
from app.utils.audit import log_action

router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings"])

@router.post("", response_model=dict)
def create_booking(booking: BookingCreate):
    """Create new repair booking"""
    try:
        created = booking_service.create_booking(booking)
        return created
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=dict)
def get_bookings(status: Optional[str] = Query(None, description="Filter by status")):
    """Get all bookings (Admin)"""
    try:
        bookings = booking_service.get_bookings(status=status)
        return {"data": bookings, "count": len(bookings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{booking_id}", response_model=dict)
def get_booking(booking_id: UUID):
    """Get booking by ID"""
    try:
        booking = booking_service.get_booking_by_id(booking_id)
        return booking
    except BookingNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{booking_id}/status", response_model=dict)
def update_booking_status(booking_id: UUID, status_update: StatusUpdate, admin: dict = Depends(get_current_admin)):
    """Update booking status (Admin) — triggers SMS to customer"""
    try:
        updated = booking_service.update_booking_status(booking_id, status_update.status)
        log_action(admin, "booking.status_update", f"booking:{booking_id}", {"status": status_update.status})
        return updated
    except BookingNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{booking_id}/cost", response_model=dict)
def update_booking_cost(booking_id: UUID, cost_update: CostUpdate, admin: dict = Depends(get_current_admin)):
    """Update booking cost estimate (Admin)"""
    try:
        updated = booking_service.update_booking_cost(booking_id, cost_update)
        log_action(admin, "booking.cost_update", f"booking:{booking_id}",
                   {"estimated": str(cost_update.estimated_cost), "final": str(cost_update.final_cost)})
        return updated
    except BookingNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/track/{phone}", response_model=dict)
def track_bookings(phone: str):
    """Track bookings by phone number"""
    try:
        bookings = booking_service.track_bookings_by_phone(phone)
        return {"data": bookings, "count": len(bookings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
