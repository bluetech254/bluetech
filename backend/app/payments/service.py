"""
payments/service.py — Paystack payment business logic.

Flow:
  1. Client calls /payments/initiate  → we call Paystack, return authorization_url
  2. Customer pays on Paystack hosted page
  3. Paystack POSTs to /payments/webhook → we verify signature + update DB
  4. Client can also call /payments/verify/{reference} to poll status

paystack.py handles raw API calls; this file handles business rules
(ownership, idempotency, DB updates).
"""
import logging
import uuid

from core.audit import log_action
from core.config import settings
from core.db import db
from payments.paystack import initialize_transaction, verify_transaction

logger = logging.getLogger(__name__)


def _make_reference(prefix: str, entity_id: str) -> str:
    """Generate a short unique Paystack transaction reference."""
    short = entity_id[:8].upper()
    rand  = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{short}-{rand}"


def _callback_url() -> str | None:
    """Return frontend URL for Paystack to redirect to after payment, or None if not configured."""
    base = (settings.FRONTEND_URL or "").rstrip("/")
    return f"{base}/payment/callback" if base else None


# ── Order payments ─────────────────────────────────────────────────────────────

def initiate_order_payment(order_id: str, user_id: str | None) -> dict:
    """
    Initialize a Paystack transaction for an order.
    Returns { authorization_url, reference } — frontend redirects user to authorization_url.
    Ownership check: if caller is authenticated they must own this order.
    """
    resp = db.table("orders").select("*").eq("id", order_id).single().execute()
    if not resp.data:
        raise ValueError("Order not found")
    order = resp.data

    if order["payment_status"] == "paid":
        raise ValueError("Order already paid")

    if user_id and order.get("user_id") and str(order["user_id"]) != str(user_id):
        raise PermissionError("You do not own this order")

    # Use customer email if available, fall back to a phone-derived placeholder
    email = order.get("email") or f"{order['phone_number']}@noemail.bluetech.co.ke"

    reference = _make_reference("ORD", order_id)
    result = initialize_transaction(
        email       = email,
        amount_kes  = float(order["total_amount"]),
        reference   = reference,
        callback_url = _callback_url(),
        metadata    = {
            "order_id":   order_id,
            "type":       "order",
            "phone":      order["phone_number"],
        },
    )

    # Store reference so the webhook can match it back (don't change payment_status yet)
    db.table("orders").update({
        "payment_reference": reference,
    }).eq("id", order_id).execute()

    return {
        "authorization_url": result["authorization_url"],
        "reference":         reference,
        "message":           "Redirect customer to authorization_url to complete payment.",
    }


def verify_order_payment(reference: str) -> dict:
    """
    Verify an order payment by reference (client polling).
    Updates DB if Paystack says paid but our DB is still pending.
    """
    txn = verify_transaction(reference)
    if txn.get("status") == "success":
        db.table("orders").update({
            "payment_status":    "paid",
            "payment_receipt":   txn.get("reference", reference),
        }).eq("payment_reference", reference).execute()
    return {
        "status":    txn.get("status"),
        "reference": reference,
        "amount":    txn.get("amount", 0) / 100,  # convert from kobo back to KES
    }


def get_order_payment_status(order_id: str) -> dict:
    resp = db.table("orders").select(
        "payment_status, payment_receipt, payment_reference"
    ).eq("id", order_id).single().execute()
    if not resp.data:
        raise ValueError("Order not found")
    return resp.data


# ── Booking commitment payment ─────────────────────────────────────────────────

def initiate_commitment_payment(booking_id: str, service_price: int) -> dict:
    """
    Initialize 20% commitment fee payment after booking creation.
    Returns { authorization_url, reference, amount }.
    """
    resp = db.table("bookings").select("*").eq("id", booking_id).single().execute()
    if not resp.data:
        raise ValueError("Booking not found")
    booking = resp.data

    if booking.get("commitment_payment_status") == "paid":
        raise ValueError("Commitment fee already paid")

    price = service_price or int(booking.get("estimated_cost") or booking.get("final_cost") or 0)
    if price <= 0:
        raise ValueError("No service cost provided")

    commitment_amount = max(1, round(price * 0.20))

    if not booking.get("estimated_cost") and service_price > 0:
        db.table("bookings").update({"estimated_cost": float(service_price)}).eq("id", booking_id).execute()

    email     = f"{booking['phone_number']}@noemail.bluetech.co.ke"
    reference = _make_reference("CMT", booking_id)

    result = initialize_transaction(
        email      = email,
        amount_kes = float(commitment_amount),
        reference  = reference,
        callback_url = _callback_url(),
        metadata   = {
            "booking_id": booking_id,
            "type":       "commitment",
            "phone":      booking["phone_number"],
        },
    )

    db.table("bookings").update({
        "commitment_fee":                commitment_amount,
        "commitment_payment_reference":  reference,
    }).eq("id", booking_id).execute()

    return {
        "authorization_url": result["authorization_url"],
        "reference":         reference,
        "amount":            commitment_amount,
        "message":           "Redirect customer to authorization_url to pay commitment fee.",
    }


def verify_commitment_payment(reference: str) -> dict:
    """Verify commitment payment by reference (client polling)."""
    txn = verify_transaction(reference)
    if txn.get("status") == "success":
        db.table("bookings").update({
            "commitment_payment_status":  "paid",
            "commitment_receipt":         txn.get("reference", reference),
        }).eq("commitment_payment_reference", reference).execute()
    return {
        "status":    txn.get("status"),
        "reference": reference,
        "amount":    txn.get("amount", 0) / 100,
    }


def get_commitment_status(booking_id: str) -> dict:
    resp = db.table("bookings").select(
        "commitment_payment_status, commitment_receipt, commitment_fee, commitment_payment_reference"
    ).eq("id", booking_id).single().execute()
    if not resp.data:
        raise ValueError("Booking not found")
    return resp.data


# ── Booking final payment ──────────────────────────────────────────────────────

def request_final_payment(booking_id: str, admin: dict) -> dict:
    """Admin initializes final payment (remaining balance after commitment)."""
    resp = db.table("bookings").select("*").eq("id", booking_id).single().execute()
    if not resp.data:
        raise ValueError("Booking not found")
    booking = resp.data

    if booking.get("final_payment_status") == "paid":
        raise ValueError("Final payment already received")

    total = int(booking.get("final_cost") or booking.get("estimated_cost") or 0)
    if total <= 0:
        raise ValueError("Set a final cost before requesting payment")

    commitment = int(booking.get("commitment_fee") or 0)
    remaining  = max(1, total - commitment)

    email     = f"{booking['phone_number']}@noemail.bluetech.co.ke"
    reference = _make_reference("FNL", booking_id)

    result = initialize_transaction(
        email      = email,
        amount_kes = float(remaining),
        reference  = reference,
        callback_url = _callback_url(),
        metadata   = {
            "booking_id": booking_id,
            "type":       "final",
            "phone":      booking["phone_number"],
        },
    )

    db.table("bookings").update({
        "status":                   "completed",
        "final_payment_reference":  reference,
    }).eq("id", booking_id).execute()

    log_action(admin, "booking.final_payment_requested", f"booking:{booking_id}", {"amount": remaining})

    return {
        "authorization_url": result["authorization_url"],
        "reference":         reference,
        "amount":            remaining,
        "message":           f"Send authorization_url to customer for KES {remaining} payment.",
    }


def get_final_payment_status(booking_id: str) -> dict:
    resp = db.table("bookings").select(
        "final_payment_status, final_receipt, final_cost, commitment_fee, final_payment_reference"
    ).eq("id", booking_id).single().execute()
    if not resp.data:
        raise ValueError("Booking not found")
    return resp.data


def verify_final_payment(reference: str) -> dict:
    """Verify a final payment by Paystack reference (client polling). Updates DB if paid."""
    txn = verify_transaction(reference)
    if txn.get("status") == "success":
        db.table("bookings").update({
            "final_payment_status": "paid",
            "final_receipt":        txn.get("reference", reference),
        }).eq("final_payment_reference", reference).execute()
    return {
        "status":    txn.get("status"),
        "reference": reference,
        "amount":    txn.get("amount", 0) / 100,
    }


# ── Webhook processor ──────────────────────────────────────────────────────────

def process_webhook(event: dict) -> None:
    """
    Process a verified Paystack webhook event.
    Called AFTER signature has been verified in the router.
    Only handles charge.success — ignores everything else.
    """
    if event.get("event") != "charge.success":
        return

    try:
        data      = event.get("data", {})
        reference = data.get("reference", "")
        status    = data.get("status", "")
        receipt   = data.get("reference", reference)   # Paystack reference IS the receipt
        meta      = data.get("metadata") or {}

        if status != "success":
            return

        entity_type = meta.get("type", "")

        if entity_type == "order" or reference.startswith("ORD-"):
            _handle_order_webhook(reference, receipt, meta)
        elif entity_type == "commitment" or reference.startswith("CMT-"):
            _handle_commitment_webhook(reference, receipt, meta)
        elif entity_type == "final" or reference.startswith("FNL-"):
            _handle_final_webhook(reference, receipt, meta)
        else:
            # Unknown type — try matching by reference in each table
            if not _handle_order_webhook(reference, receipt, meta):
                if not _handle_commitment_webhook(reference, receipt, meta):
                    _handle_final_webhook(reference, receipt, meta)

    except Exception as e:
        logger.error(f"Webhook processing error: {e}")


def _handle_order_webhook(reference: str, receipt: str, meta: dict) -> bool:
    r = db.table("orders").select("id").eq("payment_reference", reference).execute()
    if r.data:
        db.table("orders").update({
            "payment_status":  "paid",
            "payment_receipt": receipt,
        }).eq("payment_reference", reference).execute()
        logger.info(f"Order paid via webhook: ref={reference}")
        return True
    return False


def _handle_commitment_webhook(reference: str, receipt: str, meta: dict) -> bool:
    r = db.table("bookings").select("id").eq("commitment_payment_reference", reference).execute()
    if r.data:
        db.table("bookings").update({
            "commitment_payment_status": "paid",
            "commitment_receipt":        receipt,
        }).eq("commitment_payment_reference", reference).execute()
        logger.info(f"Commitment paid via webhook: ref={reference}")
        return True
    return False


def _handle_final_webhook(reference: str, receipt: str, meta: dict) -> bool:
    r = db.table("bookings").select("id").eq("final_payment_reference", reference).execute()
    if r.data:
        db.table("bookings").update({
            "final_payment_status": "paid",
            "final_receipt":        receipt,
        }).eq("final_payment_reference", reference).execute()
        logger.info(f"Final payment paid via webhook: ref={reference}")
        return True
    return False
