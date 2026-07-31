from fastapi import APIRouter, HTTPException
from app.utils.mpesa import stk_push
from app.database import supabase_admin as supabase
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
            mpesa_receipt = meta.get("MpesaReceiptNumber", "")
            paid_update = {"payment_status": "paid", "mpesa_receipt": mpesa_receipt}
            failed_update = None
        else:
            paid_update = None
            failed_update = {"payment_status": "failed"}

        update = paid_update or failed_update

        # Try orders first, then bookings
        order_r = supabase.table("orders").select("id").eq("checkout_request_id", checkout_request_id).execute()
        if order_r.data:
            supabase.table("orders").update(update).eq("checkout_request_id", checkout_request_id).execute()
        else:
            supabase.table("bookings").update(update).eq("checkout_request_id", checkout_request_id).execute()

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
