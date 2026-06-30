from typing import List
from uuid import UUID
from app.database import supabase, supabase_admin
from app.models.booking import BookingCreate, CostUpdate
from app.utils.exceptions import BookingNotFoundException

def create_booking(booking_data: BookingCreate) -> dict:
    """Create new repair booking"""
    data = booking_data.model_dump()
    data["status"] = "pending"
    
    response = supabase.table("bookings").insert(data).execute()
    return response.data[0]

def get_bookings(status: str = None) -> List[dict]:
    """Get all bookings"""
    query = supabase_admin.table("bookings").select("*")
    if status:
        query = query.eq("status", status)
    response = query.order("created_at", desc=True).execute()
    return response.data

def get_booking_by_id(booking_id: UUID) -> dict:
    """Get booking by ID"""
    response = supabase.table("bookings").select("*").eq("id", str(booking_id)).single().execute()
    if not response.data:
        raise BookingNotFoundException(f"Booking {booking_id} not found")
    return response.data

def update_booking_status(booking_id: UUID, status: str) -> dict:
    """Update booking status"""
    response = supabase_admin.table("bookings").update({"status": status}).eq("id", str(booking_id)).execute()
    if not response.data:
        raise BookingNotFoundException(f"Booking {booking_id} not found")
    return response.data[0]

def update_booking_cost(booking_id: UUID, cost_data: CostUpdate) -> dict:
    """Update booking cost"""
    data = {}
    if cost_data.estimated_cost is not None:
        data["estimated_cost"] = float(cost_data.estimated_cost)
    if cost_data.final_cost is not None:
        data["final_cost"] = float(cost_data.final_cost)
    
    response = supabase_admin.table("bookings").update(data).eq("id", str(booking_id)).execute()
    if not response.data:
        raise BookingNotFoundException(f"Booking {booking_id} not found")
    return response.data[0]

def track_bookings_by_phone(phone: str) -> List[dict]:
    """Track bookings by phone"""
    response = supabase.table("bookings").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
    return response.data
