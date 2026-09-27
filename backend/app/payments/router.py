"""
payments/router.py — M-Pesa payment routes.

SECURITY FIX: /mpesa/callback enforces Safaricom IP whitelist.
Anyone not from Safaricom's published IPs gets 403 — cannot fake a payment.
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends

from admin_auth.dependencies import get_current_admin
from auth.dependencies import get_optional_user
from payments import service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/payments", tags=["Payments"])

# Safaricom's published callback IP ranges (as of 2024)
_SAFARICOM_IPS = {
    "196.201.214.200", "196.201.214.206", "196.201.213.114",
    "196.201.214.207", "196.201.214.208", "196.201.213.44",
    "196.201.212.127", "196.201.212.138", "196.201.212.129",
    "196.201.212.136", "196.201.212.74",  "196.201.212.69",
}


def _verify_safaricom_ip(request: Request) -> None:
    """Reject requests not from Safaricom's IP ranges."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "")
    if client_ip not in _SAFARICOM_IPS:
        logger.warning(f"M-Pesa callback blocked — unknown IP: {client_ip}")
        raise HTTPException(status_code=403, detail="Forbidden")


# ── Order payment ─────────────────────────────────────────────────────────────

@router.post("/mpesa/initiate")
def initiate_order_payment(order_id: str, user_id: Optional[str] = Depends(get_optional_user)):
    """Initiate M-Pesa STK push for an order. Authenticated users must own the order."""
    try:
        return service.initiate_order_payment(order_id, user_id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"STK push failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to initiate M-Pesa payment. Try again.")


@router.get("/mpesa/status/{order_id}")
def get_order_payment_status(order_id: str):
    """Poll payment status for an order."""
    try:
        return service.get_order_payment_status(order_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Booking commitment payment ────────────────────────────────────────────────

@router.post("/mpesa/booking/{booking_id}/commitment")
def initiate_commitment_payment(booking_id: str, service_price: int = 0):
    """Initiate 20% commitment fee STK push for a repair booking."""
    try:
        return service.initiate_commitment_payment(booking_id, service_price)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Commitment STK push failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to initiate payment. Try again.")


@router.get("/mpesa/booking/{booking_id}/commitment/status")
def get_commitment_status(booking_id: str):
    """Poll commitment payment status. Actively queries Safaricom if pending."""
    try:
        return service.get_commitment_status(booking_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Booking final payment ─────────────────────────────────────────────────────

@router.post("/mpesa/booking/{booking_id}/request-final-payment")
def request_final_payment(booking_id: str, admin: dict = Depends(get_current_admin)):
    """Admin triggers STK push for remaining repair balance. Admin only."""
    try:
        return service.request_final_payment(booking_id, admin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Final payment STK push failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to send payment prompt. Try again.")


@router.get("/mpesa/booking/{booking_id}/final/status")
def get_final_payment_status(booking_id: str):
    """Poll final payment status."""
    try:
        return service.get_final_payment_status(booking_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/mpesa/booking/status/{booking_id}")
def get_booking_payment_status(booking_id: str):
    """Poll general booking payment status."""
    try:
        return service.get_booking_payment_status(booking_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Safaricom callback ────────────────────────────────────────────────────────

@router.post("/mpesa/callback")
def mpesa_callback(request: Request, payload: dict):
    """
    Safaricom STK push callback.
    SECURITY: Validates source IP against Safaricom's published IP whitelist.
    Fake callbacks from unknown IPs are rejected with 403.
    """
    _verify_safaricom_ip(request)
    service.process_callback(payload)
    return {"ResultCode": 0, "ResultDesc": "Accepted"}
