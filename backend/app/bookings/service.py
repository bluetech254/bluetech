"""
bookings/service.py — Repair bookings domain business logic.

Imports from:
  core/database      — DB clients
  core/exceptions    — typed exceptions
  notifications/sms  — SMS at create + status changes
"""
import logging
import math
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from core.database import supabase, supabase_admin
from core.exceptions import BookingNotFoundException
from notifications.sms import send_sms
from bookings.models import BookingCreate, CostUpdate

logger = logging.getLogger(__name__)

# SMS messages per status change
_STATUS_SMS = {
    "confirmed":    "Your repair booking #{sid} is confirmed. We'll contact you shortly.",
    "in_diagnosis": "Your device (#{sid}) is being diagnosed. We'll send a cost estimate soon.",
    "in_repair":    "Good news! Your device #{sid} is now in repair.",
    "ready":        "Your device #{sid} is ready for collection! Final cost: KES {cost:,.0f}.",
    "completed":    "Repair #{sid} complete. Thank you for choosing BlueTech!",
    "cancelled":    "Your booking #{sid} has been cancelled. Contact us if this was a mistake.",
}


def create_booking(data: BookingCreate, user_id: Optional[str] = None) -> dict:
    """Create a new repair booking and send SMS confirmation."""
    row = data.model_dump()
    row["status"]  = "pending"
    row["user_id"] = user_id
    # Enum → string
    row["fulfillment_type"] = data.fulfillment_type.value

    resp    = supabase.table("bookings").insert(row).execute()
    booking = resp.data[0]
    sid     = booking["id"][:8].upper()

    fulfillment = data.fulfillment_type.value.replace("_", " ").title()
    device      = data.device_type + (f" {data.device_model}" if data.device_model else "")
    location    = f"Pickup from: {data.pickup_address}" if data.fulfillment_type.value == "pickup" else "Drop-off at our shop"

    send_sms(
        data.phone_number,
        f"BlueTech Repair Booking Confirmed!\n"
        f"Booking #{sid}\n"
        f"Device: {device}\n"
        f"Issue: {data.issue_description[:60]}\n"
        f"Type: {fulfillment} | {location}\n"
        f"We'll reach out to confirm your appointment. Thank you!"
    )
    return booking


def get_booking_by_id(booking_id: UUID) -> dict:
    resp = supabase.table("bookings").select("*").eq("id", str(booking_id)).single().execute()
    if not resp.data:
        raise BookingNotFoundException(f"Booking {booking_id} not found")
    return resp.data


def get_bookings(status: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[dict]:
    q = supabase_admin.table("bookings").select("*")
    if status:
        q = q.eq("status", status)
    resp = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return resp.data or []


def track_bookings_by_phone(phone: str) -> List[dict]:
    resp = supabase.table("bookings").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
    return resp.data or []


def update_booking_status(booking_id: UUID, status: str) -> dict:
    """Update booking status. Sends SMS notification. Awards points on completion."""
    resp = supabase_admin.table("bookings").update({"status": status}).eq("id", str(booking_id)).execute()
    if not resp.data:
        raise BookingNotFoundException(f"Booking {booking_id} not found")
    booking = resp.data[0]
    sid     = str(booking_id)[:8].upper()

    # Send SMS for key status changes
    if status in _STATUS_SMS:
        try:
            cost = float(booking.get("final_cost") or booking.get("estimated_cost") or 0)
            msg  = _STATUS_SMS[status].format(sid=sid, cost=cost)
            send_sms(booking["phone_number"], f"BlueTech: {msg}")
        except Exception:
            pass  # SMS failure must never break a status update

    # Award 10% of repair cost as points when completed
    if status == "completed":
        _award_completion_points(booking)

    return booking


def update_booking_cost(booking_id: UUID, cost_data: CostUpdate) -> dict:
    """Update estimated or final cost on a booking."""
    updates = {}
    if cost_data.estimated_cost is not None:
        updates["estimated_cost"] = float(cost_data.estimated_cost)
    if cost_data.final_cost is not None:
        updates["final_cost"] = float(cost_data.final_cost)

    if not updates:
        raise ValueError("No cost values provided")

    resp = supabase_admin.table("bookings").update(updates).eq("id", str(booking_id)).execute()
    if not resp.data:
        raise BookingNotFoundException(f"Booking {booking_id} not found")
    return resp.data[0]


def _award_completion_points(booking: dict):
    """Award 10% of final/estimated cost as loyalty points on repair completion."""
    user_id    = booking.get("user_id")
    final_cost = float(booking.get("final_cost") or booking.get("estimated_cost") or 0)
    booking_id = booking["id"]

    if not user_id or final_cost <= 0:
        return

    earned = math.floor(final_cost * 0.10)
    if earned <= 0:
        return

    try:
        sb = supabase_admin
        u  = sb.table("users").select("points").eq("id", user_id).single().execute()
        current = u.data.get("points", 0) if u.data else 0
        sb.table("users").update({"points": current + earned}).eq("id", user_id).execute()
        sb.table("points_ledger").insert({
            "user_id":     user_id,
            "points":      earned,
            "type":        "booking_earn",
            "description": f"Earned {earned} points on repair #{booking_id[:8].upper()}",
        }).execute()
    except Exception as e:
        logger.warning(f"Award repair points failed: {e}")
