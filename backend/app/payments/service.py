"""
payments/service.py — M-Pesa payment business logic.

All STK push initiation, callback processing, and status polling
lives here. mpesa.py handles raw API calls; this file handles
business rules (ownership, idempotency, status updates).
"""
import logging
from core.database import supabase_admin as db
from core.audit import log_action
from payments.mpesa import stk_push, stk_query

logger = logging.getLogger(__name__)


# ── Order payments ────────────────────────────────────────────────────────────

def initiate_order_payment(order_id: str, user_id: str | None) -> dict:
    """Initiate STK push for an order. Verifies ownership if user authenticated."""
    resp = db.table("orders").select("*").eq("id", order_id).single().execute()
    if not resp.data:
        raise ValueError("Order not found")
    order = resp.data

    if order["payment_status"] == "paid":
        raise ValueError("Order already paid")

    # Ownership check — if caller is authenticated they must own this order
    if user_id and order.get("user_id") and str(order["user_id"]) != str(user_id):
        raise PermissionError("You do not own this order")

    result = stk_push(
        phone       = order["phone_number"],
        amount      = int(order["total_amount"]),
        reference   = f"ORD-{order_id[:10].upper()}",
        description = f"BlueTech Order",
    )
    checkout_id = result.get("CheckoutRequestID")
    db.table("orders").update({"checkout_request_id": checkout_id}).eq("id", order_id).execute()
    return {"checkout_request_id": checkout_id, "message": "STK push sent. Check your phone."}


def get_order_payment_status(order_id: str) -> dict:
    resp = db.table("orders").select("payment_status, mpesa_receipt").eq("id", order_id).single().execute()
    if not resp.data:
        raise ValueError("Order not found")
    return resp.data


# ── Booking commitment payment ────────────────────────────────────────────────

def initiate_commitment_payment(booking_id: str, service_price: int) -> dict:
    """Initiate 20% commitment fee STK push after booking creation."""
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

    result      = stk_push(
        phone       = booking["phone_number"],
        amount      = commitment_amount,
        reference   = f"CMT-{booking_id[:10].upper()}",
        description = "Repair Commitment",
    )
    checkout_id = result.get("CheckoutRequestID")
    db.table("bookings").update({
        "commitment_fee":            commitment_amount,
        "commitment_checkout_id":    checkout_id,
        "commitment_payment_status": "pending",
    }).eq("id", booking_id).execute()
    return {"checkout_request_id": checkout_id, "amount": commitment_amount, "message": "STK push sent. Check your phone."}


def get_commitment_status(booking_id: str) -> dict:
    """Poll commitment payment status. Actively queries Safaricom if still pending."""
    resp = db.table("bookings").select(
        "commitment_payment_status, commitment_receipt, commitment_fee, commitment_checkout_id"
    ).eq("id", booking_id).single().execute()
    if not resp.data:
        raise ValueError("Booking not found")

    data = resp.data
    if data.get("commitment_payment_status") == "pending" and data.get("commitment_checkout_id"):
        try:
            result      = stk_query(data["commitment_checkout_id"])
            result_code = result.get("ResultCode")
            if result_code == 0:
                db.table("bookings").update({"commitment_payment_status": "paid"}).eq("id", booking_id).execute()
                data["commitment_payment_status"] = "paid"
            elif result_code is not None and result_code != 0:
                db.table("bookings").update({"commitment_payment_status": "failed"}).eq("id", booking_id).execute()
                data["commitment_payment_status"] = "failed"
        except Exception as e:
            logger.warning(f"STK query failed (non-critical): {e}")
    return data


# ── Booking final payment ─────────────────────────────────────────────────────

def request_final_payment(booking_id: str, admin: dict) -> dict:
    """Admin triggers STK push for remaining balance after repair is done."""
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

    result      = stk_push(
        phone       = booking["phone_number"],
        amount      = remaining,
        reference   = f"FNL-{booking_id[:10].upper()}",
        description = "Repair Final Payment",
    )
    checkout_id = result.get("CheckoutRequestID")
    db.table("bookings").update({
        "status":               "completed",
        "final_checkout_id":    checkout_id,
        "final_payment_status": "pending",
    }).eq("id", booking_id).execute()
    log_action(admin, "booking.final_payment_requested", f"booking:{booking_id}", {"amount": remaining})
    return {"checkout_request_id": checkout_id, "amount": remaining,
            "message": f"STK push of KES {remaining} sent to {booking['phone_number']}"}


def get_final_payment_status(booking_id: str) -> dict:
    resp = db.table("bookings").select(
        "final_payment_status, final_receipt, final_cost, commitment_fee"
    ).eq("id", booking_id).single().execute()
    if not resp.data:
        raise ValueError("Booking not found")
    return resp.data


def get_booking_payment_status(booking_id: str) -> dict:
    resp = db.table("bookings").select("payment_status, mpesa_receipt").eq("id", booking_id).single().execute()
    if not resp.data:
        raise ValueError("Booking not found")
    return resp.data


# ── Callback processor ────────────────────────────────────────────────────────

def process_callback(payload: dict) -> None:
    """
    Process Safaricom STK push callback.
    Matches CheckoutRequestID to orders or bookings and updates payment status.
    """
    try:
        stk             = payload.get("Body", {}).get("stkCallback", {})
        checkout_id     = stk.get("CheckoutRequestID")
        result_code     = stk.get("ResultCode")

        if not checkout_id:
            return

        if result_code == 0:
            # Successful payment — extract receipt
            items   = stk.get("CallbackMetadata", {}).get("Item", [])
            meta    = {i["Name"]: i.get("Value") for i in items}
            receipt = meta.get("MpesaReceiptNumber", "")

            # 1. Order payment
            r = db.table("orders").select("id").eq("checkout_request_id", checkout_id).execute()
            if r.data:
                db.table("orders").update({"payment_status": "paid", "mpesa_receipt": receipt})\
                    .eq("checkout_request_id", checkout_id).execute()
                return

            # 2. Booking commitment
            r = db.table("bookings").select("id").eq("commitment_checkout_id", checkout_id).execute()
            if r.data:
                db.table("bookings").update({
                    "commitment_payment_status": "paid",
                    "commitment_receipt":        receipt,
                }).eq("commitment_checkout_id", checkout_id).execute()
                return

            # 3. Booking final payment
            r = db.table("bookings").select("id").eq("final_checkout_id", checkout_id).execute()
            if r.data:
                db.table("bookings").update({
                    "final_payment_status": "paid",
                    "final_receipt":        receipt,
                }).eq("final_checkout_id", checkout_id).execute()
                return

        else:
            # Failed/cancelled payment
            r = db.table("orders").select("id").eq("checkout_request_id", checkout_id).execute()
            if r.data:
                db.table("orders").update({"payment_status": "failed"})\
                    .eq("checkout_request_id", checkout_id).execute()
                return

            r = db.table("bookings").select("id").eq("commitment_checkout_id", checkout_id).execute()
            if r.data:
                db.table("bookings").update({"commitment_payment_status": "failed"})\
                    .eq("commitment_checkout_id", checkout_id).execute()
                return

            r = db.table("bookings").select("id").eq("final_checkout_id", checkout_id).execute()
            if r.data:
                db.table("bookings").update({"final_payment_status": "failed"})\
                    .eq("final_checkout_id", checkout_id).execute()

    except Exception as e:
        logger.error(f"Callback processing error: {e}")
