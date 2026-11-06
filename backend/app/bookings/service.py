"""
bookings/service.py — Repair bookings domain business logic.

Lifecycle (strict, single-step, no skipping):
  pending → confirmed → picked_up → in_diagnosis → in_repair → ready → completed
  Any non-terminal state → cancelled (only cancellation may jump).
  picked_up = device now in hand:
    - dropoff: client dropped off at shop
    - pickup: staff collected from client address

Fees:
  - dropoff: pickup_fee = 0, client pays service (estimated/final) only
  - pickup:  pickup_fee = 200 (PICKUP_FEE_KES), client pays service + 200
  Estimated/final costs are set manually by admin (PUT /bookings/{id}/cost),
  never from service catalog.
"""
import logging
from uuid import UUID

from bookings.models import PICKUP_FEE_KES, BookingCreate, CostUpdate
from core.db import db
from core.exceptions import BookingNotFoundException
from notifications.sms import send_sms

logger = logging.getLogger(__name__)


# Strict linear lifecycle (no skipping). cancelled is terminal escape hatch.
STATUS_CHAIN = ["pending", "confirmed", "picked_up", "in_diagnosis", "in_repair", "ready", "completed"]
TERMINAL_STATUSES = {"completed", "cancelled"}

# SMS messages per status change
_STATUS_SMS = {
    "confirmed":       "Your repair booking #{sid} is confirmed. We'll contact you shortly.",
    "picked_up":       "We have your device (#{sid}). We've received it safely.",
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
    # Flat pickup fee: pickup pays delivery, dropoff pays service only.
    row["pickup_fee"] = float(PICKUP_FEE_KES) if data.fulfillment_type.value == "pickup" else 0.0

    resp = db.table("bookings").insert(row).execute()
    if not resp.data:
        err = resp.get("error") or resp.error or "Insert returned no data"
        logger.error(f"Booking insert failed: {err}")
        raise RuntimeError(f"Failed to create booking: {err}")
    booking = resp.data[0]
    sid     = booking["id"][:8].upper()

    fulfillment = data.fulfillment_type.value.replace("_", " ").title()
    device      = data.device_type + (f" {data.device_model}" if data.device_model else "")
    fee_note    = f" | Pickup fee: KES {PICKUP_FEE_KES}" if data.fulfillment_type.value == "pickup" else ""
    location    = f"Pickup from: {data.pickup_address}" if data.fulfillment_type.value == "pickup" else "Drop-off at our shop"

    send_sms(
        data.phone_number,
        f"BlueTech Repair Booking Confirmed!\n"
        f"Booking #{sid}\n"
        f"Device: {device}\n"
        f"Issue: {data.issue_description[:60]}\n"
        f"Type: {fulfillment} | {location}{fee_note}\n"
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
    """Update booking status. Strict single-step lifecycle, no skipping.

    Lifecycle: pending → confirmed → picked_up → in_diagnosis → in_repair → ready → completed
    Cancellation: any non-terminal state → cancelled.
    Terminal states (completed, cancelled) have no outgoing transitions.

    Raises ValueError (mapped to 400) on skip / backward / terminal transitions.
    """
    booking = get_booking_by_id(booking_id)
    current = booking.get("status", "pending")
    status = status.lower()

    if current in TERMINAL_STATUSES:
        raise ValueError(f"Booking is in terminal state '{current}'; no further transitions allowed.")
    if status not in STATUS_CHAIN and status != "cancelled":
        raise ValueError(f"Unknown status '{status}'. Must be one of {STATUS_CHAIN} or 'cancelled'.")

    if status == "cancelled":
        pass  # allowed from any non-terminal state
    else:
        if current == status:
            raise ValueError(f"Booking is already '{current}'.")
        if current not in STATUS_CHAIN:
            raise ValueError(f"Booking has unknown current status '{current}'.")
        idx = STATUS_CHAIN.index(current)
        expected = STATUS_CHAIN[idx + 1] if idx + 1 < len(STATUS_CHAIN) else None
        if expected is None:
            raise ValueError(f"Booking in state '{current}' has no next step.")
        if status != expected:
            raise ValueError(
                f"Invalid transition {current} → {status}. "
                f"Must move one step at a time ({current} → {expected}) or cancel."
            )

    resp = db.table("bookings").update({"status": status}).eq("id", str(booking_id)).execute()
    if not resp.data:
        raise BookingNotFoundException(f"Booking {booking_id} not found")
    booking = resp.data[0]
    sid     = str(booking_id)[:8].upper()

    # Send SMS for key status changes
    if status in _STATUS_SMS:
        try:
            msg  = _STATUS_SMS[status].format(sid=sid)
            send_sms(booking["phone_number"], f"BlueTech: {msg}")
        except Exception:
            pass  # SMS failure must never break a status update

    return booking


def update_booking_cost(booking_id: UUID, cost_data: CostUpdate) -> dict:
    """Update estimated or final cost on a booking (admin only).

    For pickup bookings pickup_fee is auto-set to 200 at creation; admin may
    override it here. For dropoff bookings it stays 0 unless admin overrides.
    """
    updates = {}
    if cost_data.estimated_cost is not None:
        updates["estimated_cost"] = float(cost_data.estimated_cost)
    if cost_data.final_cost is not None:
        updates["final_cost"] = float(cost_data.final_cost)
    if cost_data.pickup_fee is not None:
        updates["pickup_fee"] = float(cost_data.pickup_fee)

    if not updates:
        raise ValueError("No cost values provided")

    resp = db.table("bookings").update(updates).eq("id", str(booking_id)).execute()
    if not resp.data:
        raise BookingNotFoundException(f"Booking {booking_id} not found")
    return resp.data[0]
