from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from uuid import UUID
from app.services import booking_service
from app.models.booking import BookingCreate, CostUpdate
from app.models.order import StatusUpdate
from app.utils.exceptions import BookingNotFoundException

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
def update_booking_status(booking_id: UUID, status_update: StatusUpdate):
    """Update booking status (Admin)"""
    try:
        updated = booking_service.update_booking_status(booking_id, status_update.status)
        return updated
    except BookingNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{booking_id}/cost", response_model=dict)
def update_booking_cost(booking_id: UUID, cost_update: CostUpdate):
    """Update booking cost estimate (Admin)"""
    try:
        updated = booking_service.update_booking_cost(booking_id, cost_update)
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
