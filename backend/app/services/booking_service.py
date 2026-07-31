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
    """Update booking status and notify customer via SMS"""
    response = supabase_admin.table("bookings").update({"status": status}).eq("id", str(booking_id)).execute()
    if not response.data:
        raise BookingNotFoundException(f"Booking {booking_id} not found")
    
    booking = response.data[0]
    short_id = str(booking_id)[:8].upper()

    # Award 10% of final cost as points when repair is completed
    if status == "completed":
        user_id = booking.get("user_id")
        final_cost = float(booking.get("final_cost") or booking.get("estimated_cost") or 0)
        if user_id and final_cost > 0:
            try:
                from app.services.points_service import award_order_points
                award_order_points(user_id, final_cost, str(booking_id))
            except Exception:
                pass

    sms_map = {
        "confirmed":    f"BlueTech: Your repair booking #{short_id} is confirmed. We'll contact you shortly.",
        "in_diagnosis": f"BlueTech: Your device (#{short_id}) is being diagnosed. We'll send a cost estimate soon.",
        "ready":        f"BlueTech: Your device #{short_id} is ready for collection! Final cost: KES {booking.get('final_cost', 0):,.0f}.",
        "completed":    f"BlueTech: Repair #{short_id} complete. Thank you for choosing BlueTech!",
    }

    if status in sms_map:
        try:
            from app.utils.sms_service import send_sms
            send_sms(booking["phone_number"], sms_map[status])
        except Exception:
            pass  # SMS failure must never break the status update

    return booking

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
