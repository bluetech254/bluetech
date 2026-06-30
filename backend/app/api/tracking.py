from fastapi import APIRouter, HTTPException
from app.services import tracking_service

router = APIRouter(prefix="/api/v1/track", tags=["Tracking"])

@router.get("/{phone}", response_model=dict)
def track_by_phone(phone: str):
    """Track all orders and bookings by phone number"""
    try:
        result = tracking_service.track_by_phone(phone)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
