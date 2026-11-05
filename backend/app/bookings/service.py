"""
bookings/service.py — Repair bookings domain business logic.

Imports from:
  core/database      — DB clients
  core/exceptions    — typed exceptions
  notifications/sms  — SMS at create + status changes
"""
import logging

from bookings.models import BookingCreate
from core.db import db
from core.exceptions import BookingNotFoundException
from notifications.sms import send_sms

logger = logging.getLogger(__name__)

# SMS messages per status change
_STATUS_SMS = {
    "confirmed":       "Your repair booking #{sid} is confirmed. We'll contact you shortly.",
    "in_diagnosis":    "Your device (#{sid}) is being diagnosed. We'll contact you soon.",
    "in_repair":       "Good news! Your device #{sid} is being repaired.",
    "ready":           "Your device #{sid} is ready for collection! We'll share the final cost after diagnosis.",
    "completed":       "Repair #{sid} complete. Thank you for choosing BlueTech!",
    "cancelled":       "Your booking #{sid} has been cancelled. Contact us if this was a mistake.",
}


def create_booking(data: BookingCreate, user_id: str | None = None) -> dict:
    """Create a new repair booking and send SMS confirmation."""
    row = data.model_dump()
    row["status"]  = "pending"
    row["user_id"] = user_id
    # Enum → string
    row["fulfillment_type"] = data.fulfillment_type.value

    resp = db.table("bookings").insert(row).execute()
    if not resp.data:
        err = resp.error or "Insert returned no data"
        logger.error(f"Booking insert failed: {err}")
        raise RuntimeError(f"Failed to create booking: {err}")
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
    try:
        resp = db.table("bookings").select("*").eq("id", str(booking_id)).single().execute()
        data = resp.data
    except Exception:
        data = None
    if not data:
        raise BookingNotFoundException(f"Booking {booking_id} not found")
    return data


def get_bookings(status: str | None = None, limit: int = 100, offset: int = 0) -> list[dict]:
    q = db.table("bookings").select("*")
    if status:
        q = q.eq("status", status)
    resp = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return resp.data or []


def track_bookings_by_phone(phone: str) -> list[dict]:
    resp = db.table("bookings").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
    return resp.data or []


def update_booking_status(booking_id: UUID, status: str) -> dict:
    """Update booking status. Sends SMS notification.
    
    Status transitions are forward-only:
    pending → confirmed → in_diagnosis → in_repair → ready → completed
    At any point, the booking may be cancelled.
    Going backward (e.g. confirmed → pending) is not allowed — use cancel instead."""
    resp = db.table("bookings").update({"status": status}).eq("id", str(booking_id)).execute()
    if not resp.data:
        raise BookingNotFoundException(f"Booking {booking_id} not found")
    booking = resp.data[0]
    sid     = str(booking_id)[:8].upper()
    
    # Forward-only status transition validation
    _status_order = ["pending", "confirmed", "in_diagnosis", "in_repair", "ready", "completed", "cancelled"]
    current = booking.get("status", "")
    try:
        current_idx = _status_order.index(current)
        new_idx = _status_order.index(status)
        if new_idx < current_idx and status != "cancelled":
            # Going backward without cancelling — not allowed
            # Exception: from confirmed/cancelled can go to pending only via full cancel
            raise ValueError(
                f"Invalid status transition from '{current}' to '{status}'. "
                f"Statuses must move forward: {_status_order}. "
                f'Use "cancelled" to reset, or follow the forward path.'
            )
    except ValueError as e:
        # Raised if status not in _status_order
        raise ValueError(str(e))
    
    # Send SMS for key status changes
    if status in _STATUS_SMS:
        try:
            msg  = _STATUS_SMS[status].format(sid=sid)
            send_sms(booking["phone_number"], f"BlueTech: {msg}")
        except Exception:
            pass  # SMS failure must never break a status update
    
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

    resp = db.table("bookings").update(updates).eq("id", str(booking_id)).execute()
    if not resp.data:
        raise BookingNotFoundException(f"Booking {booking_id} not found")
    return resp.data[0]
