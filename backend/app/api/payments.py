from fastapi import APIRouter, HTTPException, Depends
from app.utils.mpesa import stk_push
from app.database import supabase_admin as supabase
from app.api.admin_auth import get_current_admin
from app.utils.audit import log_action
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.post("/mpesa/initiate")
def mpesa_initiate(order_id: str):
    order_resp = supabase.table("orders").select("*").eq("id", order_id).single().execute()
    if not order_resp.data:
        raise HTTPException(status_code=404, detail="Order not found")
    order = order_resp.data
    if order["payment_status"] == "paid":
        raise HTTPException(status_code=400, detail="Order already paid")
    try:
        result = stk_push(
            phone=order["phone_number"],
            amount=int(order["total_amount"]),
            reference=f"ORD-{order_id[:10].upper()}",
            description=f"BlueTech Order {order_id[:8].upper()}",
        )
        checkout_request_id = result.get("CheckoutRequestID")
        supabase.table("orders").update({"checkout_request_id": checkout_request_id}).eq("id", order_id).execute()
        return {"checkout_request_id": checkout_request_id, "message": "STK push sent. Check your phone."}
    except Exception as e:
        logger.error(f"STK push failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to initiate M-Pesa payment. Try again.")


@router.post("/mpesa/booking/initiate")
def mpesa_booking_initiate(booking_id: str):
    """Initiate M-Pesa STK push for a repair booking."""
    booking_resp = supabase.table("bookings").select("*").eq("id", booking_id).single().execute()
    if not booking_resp.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking = booking_resp.data
    if booking.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Booking already paid")

    amount = int(booking.get("final_cost") or booking.get("estimated_cost") or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="No cost set for this booking yet. Wait for admin to set the cost.")

    try:
        result = stk_push(
            phone=booking["phone_number"],
            amount=amount,
            reference=f"BKG-{booking_id[:10].upper()}",
            description=f"BlueTech Repair {booking_id[:8].upper()}",
        )
        checkout_request_id = result.get("CheckoutRequestID")
        supabase.table("bookings").update({"checkout_request_id": checkout_request_id}).eq("id", booking_id).execute()
        return {"checkout_request_id": checkout_request_id, "message": "STK push sent. Check your phone."}
    except Exception as e:
        logger.error(f"Booking STK push failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to initiate M-Pesa payment. Try again.")


@router.post("/mpesa/booking/{booking_id}/commitment")
def mpesa_booking_commitment(booking_id: str):
    """Initiate 20% commitment fee STK push after booking creation."""
    booking_resp = supabase.table("bookings").select("*").eq("id", booking_id).single().execute()
    if not booking_resp.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking = booking_resp.data

    if booking.get("commitment_payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Commitment fee already paid")

    service_price = int(booking.get("estimated_cost") or booking.get("final_cost") or 0)
    if service_price <= 0:
        raise HTTPException(status_code=400, detail="No service cost set on this booking")

    commitment_amount = max(1, round(service_price * 0.20))

    try:
        result = stk_push(
            phone=booking["phone_number"],
            amount=commitment_amount,
            reference=f"CMT-{booking_id[:10].upper()}",
            description="Repair Commitment",
        )
        checkout_id = result.get("CheckoutRequestID")
        supabase.table("bookings").update({
            "commitment_fee": commitment_amount,
            "commitment_checkout_id": checkout_id,
            "commitment_payment_status": "pending",
        }).eq("id", booking_id).execute()
        return {"checkout_request_id": checkout_id, "amount": commitment_amount, "message": "STK push sent. Check your phone."}
    except Exception as e:
        logger.error(f"Commitment STK push failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to initiate M-Pesa payment. Try again.")


@router.get("/mpesa/booking/{booking_id}/commitment/status")
def mpesa_commitment_status(booking_id: str):
    resp = supabase.table("bookings").select(
        "commitment_payment_status,commitment_receipt,commitment_fee"
    ).eq("id", booking_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return resp.data


@router.post("/mpesa/booking/{booking_id}/request-final-payment")
def request_final_payment(booking_id: str, admin: dict = Depends(get_current_admin)):
    """Mark booking as completed and send STK push for remaining 80% to client."""
    booking_resp = supabase.table("bookings").select("*").eq("id", booking_id).single().execute()
    if not booking_resp.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking = booking_resp.data

    if booking.get("final_payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Final payment already received")

    total = int(booking.get("final_cost") or booking.get("estimated_cost") or 0)
    if total <= 0:
        raise HTTPException(status_code=400, detail="Set a final cost before requesting payment")

    commitment = int(booking.get("commitment_fee") or 0)
    remaining = max(1, total - commitment)

    try:
        result = stk_push(
            phone=booking["phone_number"],
            amount=remaining,
            reference=f"FNL-{booking_id[:10].upper()}",
            description="Repair Final Payment",
        )
        checkout_id = result.get("CheckoutRequestID")
        supabase.table("bookings").update({
            "status": "completed",
            "final_checkout_id": checkout_id,
            "final_payment_status": "pending",
        }).eq("id", booking_id).execute()
        log_action(admin, "booking.final_payment_requested", f"booking:{booking_id}", {"amount": remaining})
        return {"checkout_request_id": checkout_id, "amount": remaining, "message": f"STK push of KES {remaining} sent to {booking['phone_number']}"}
    except Exception as e:
        logger.error(f"Final payment STK push failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to send payment prompt. Try again.")


@router.post("/mpesa/callback")
def mpesa_callback(payload: dict):
    try:
        stk = payload.get("Body", {}).get("stkCallback", {})
        checkout_request_id = stk.get("CheckoutRequestID")
        result_code = stk.get("ResultCode")
        if not checkout_request_id:
            return {"ResultCode": 0, "ResultDesc": "Accepted"}

        if result_code == 0:
            items = stk.get("CallbackMetadata", {}).get("Item", [])
            meta = {i["Name"]: i.get("Value") for i in items}
            receipt = meta.get("MpesaReceiptNumber", "")

            # Check orders first
            order_r = supabase.table("orders").select("id").eq("checkout_request_id", checkout_request_id).execute()
            if order_r.data:
                supabase.table("orders").update({"payment_status": "paid", "mpesa_receipt": receipt}).eq("checkout_request_id", checkout_request_id).execute()
                return {"ResultCode": 0, "ResultDesc": "Accepted"}

            # Check commitment payment
            cmt_r = supabase.table("bookings").select("id").eq("commitment_checkout_id", checkout_request_id).execute()
            if cmt_r.data:
                supabase.table("bookings").update({
                    "commitment_payment_status": "paid",
                    "commitment_receipt": receipt,
                }).eq("commitment_checkout_id", checkout_request_id).execute()
                return {"ResultCode": 0, "ResultDesc": "Accepted"}

            # Check final payment
            fnl_r = supabase.table("bookings").select("id").eq("final_checkout_id", checkout_request_id).execute()
            if fnl_r.data:
                supabase.table("bookings").update({
                    "final_payment_status": "paid",
                    "final_receipt": receipt,
                }).eq("final_checkout_id", checkout_request_id).execute()
                return {"ResultCode": 0, "ResultDesc": "Accepted"}

            # Legacy fallback
            supabase.table("bookings").update({"payment_status": "paid", "mpesa_receipt": receipt}).eq("checkout_request_id", checkout_request_id).execute()
        else:
            order_r = supabase.table("orders").select("id").eq("checkout_request_id", checkout_request_id).execute()
            if order_r.data:
                supabase.table("orders").update({"payment_status": "failed"}).eq("checkout_request_id", checkout_request_id).execute()
            else:
                cmt_r = supabase.table("bookings").select("id").eq("commitment_checkout_id", checkout_request_id).execute()
                if cmt_r.data:
                    supabase.table("bookings").update({"commitment_payment_status": "failed"}).eq("commitment_checkout_id", checkout_request_id).execute()
                else:
                    supabase.table("bookings").update({"final_payment_status": "failed"}).eq("final_checkout_id", checkout_request_id).execute()

    except Exception as e:
        logger.error(f"Callback processing error: {e}")
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.get("/mpesa/status/{order_id}")
def mpesa_payment_status(order_id: str):
    resp = supabase.table("orders").select("payment_status, mpesa_receipt").eq("id", order_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return resp.data


@router.get("/mpesa/booking/status/{booking_id}")
def mpesa_booking_payment_status(booking_id: str):
    resp = supabase.table("bookings").select("payment_status, mpesa_receipt").eq("id", booking_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return resp.data
