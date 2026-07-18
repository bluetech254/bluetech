from fastapi import APIRouter, HTTPException, Depends
from app.utils.mpesa import stk_push
from app.utils.auth import verify_token
from app.database import supabase
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.post("/mpesa/initiate")
def mpesa_initiate(order_id: str, user_id: str = Depends(verify_token)):
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
            order_id=order_id,
        )
        checkout_request_id = result.get("CheckoutRequestID")
        supabase.table("orders").update({"checkout_request_id": checkout_request_id}).eq("id", order_id).execute()
        return {"checkout_request_id": checkout_request_id, "message": "STK push sent. Check your phone."}
    except Exception as e:
        logger.error(f"STK push failed: {e}")
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
            supabase.table("orders").update({
                "payment_status": "paid",
                "mpesa_receipt": mpesa_receipt,
            }).eq("checkout_request_id", checkout_request_id).execute()
        else:
            supabase.table("orders").update({
                "payment_status": "failed",
            }).eq("checkout_request_id", checkout_request_id).execute()
    except Exception as e:
        logger.error(f"Callback processing error: {e}")
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.get("/mpesa/status/{order_id}")
def mpesa_payment_status(order_id: str):
    resp = supabase.table("orders").select("payment_status, mpesa_receipt").eq("id", order_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return resp.data
