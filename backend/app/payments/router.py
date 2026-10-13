"""
payments/router.py — Paystack payment routes.

Endpoints:
  POST /payments/order/{order_id}/initiate         → get Paystack checkout URL for an order
  POST /payments/order/{order_id}/verify/{ref}     → poll/verify order payment
  GET  /payments/order/{order_id}/status           → DB payment status for an order
  POST /payments/booking/{id}/commitment/initiate  → get checkout URL for 20% commitment fee
  GET  /payments/booking/{id}/commitment/status    → commitment status
  POST /payments/booking/{id}/final/request        → admin triggers final payment link
  GET  /payments/booking/{id}/final/status         → final payment status
  POST /payments/webhook                           → Paystack webhook (HMAC-verified)

Rate limiting:
  - initiate endpoints: 5/minute (prevents spam checkout creation)
  - verify:             10/minute
  - webhook:            none (Paystack IPs only, verified by signature)
"""
import logging

from admin_auth.dependencies import get_current_admin
from auth.dependencies import get_optional_user
from fastapi import APIRouter, Depends, HTTPException, Request
from payments import service
from payments.paystack import verify_webhook_signature
from slowapi import Limiter
from slowapi.util import get_remote_address

logger  = logging.getLogger(__name__)
router  = APIRouter(prefix="/api/v1/payments", tags=["Payments"])
limiter = Limiter(key_func=get_remote_address)


# ── Order payments ────────────────────────────────────────────────────────────

@router.post("/order/{order_id}/initiate")
@limiter.limit("5/minute")
def initiate_order_payment(
    request: Request,
    order_id: str,
    user_id: str | None = Depends(get_optional_user),
):
    """
    Initialize Paystack payment for an order.
    Returns authorization_url — redirect the customer to it to complete payment.
    Authenticated users must own the order.
    """
    try:
        return service.initiate_order_payment(order_id, user_id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Paystack initiate order failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to initialize payment. Try again.")


@router.post("/order/verify/{reference}")
@limiter.limit("10/minute")
def verify_order_payment(request: Request, reference: str):
    """Verify an order payment by Paystack reference. Updates DB if paid."""
    try:
        return service.verify_order_payment(reference)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Paystack verify failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to verify payment.")


@router.get("/order/{order_id}/status")
def get_order_payment_status(order_id: str):
    """Get DB payment status for an order."""
    try:
        return service.get_order_payment_status(order_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Booking commitment payment ────────────────────────────────────────────────

@router.post("/booking/{booking_id}/commitment/initiate")
@limiter.limit("5/minute")
def initiate_commitment_payment(request: Request, booking_id: str, service_price: int = 0):
    """
    Initialize 20% commitment fee payment for a repair booking.
    Returns authorization_url — redirect the customer to it.
    """
    try:
        return service.initiate_commitment_payment(booking_id, service_price)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Paystack commitment initiate failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to initialize commitment payment. Try again.")


@router.post("/booking/commitment/verify/{reference}")
@limiter.limit("10/minute")
def verify_commitment_payment(request: Request, reference: str):
    """Verify a commitment payment by Paystack reference."""
    try:
        return service.verify_commitment_payment(reference)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Paystack verify commitment failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to verify payment.")


@router.get("/booking/{booking_id}/commitment/status")
def get_commitment_status(booking_id: str):
    """Get commitment payment status for a booking."""
    try:
        return service.get_commitment_status(booking_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Booking final payment ─────────────────────────────────────────────────────

@router.post("/booking/{booking_id}/final/request")
def request_final_payment(booking_id: str, admin: dict = Depends(get_current_admin)):
    """
    Admin generates Paystack payment link for the remaining repair balance.
    Returns authorization_url to send to the customer.
    Admin only.
    """
    try:
        return service.request_final_payment(booking_id, admin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Paystack final payment failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to create payment link. Try again.")


@router.post("/booking/final/verify/{reference}")
@limiter.limit("10/minute")
def verify_final_payment(request: Request, reference: str):
    """Verify a final payment by Paystack reference. Updates DB if paid."""
    try:
        return service.verify_final_payment(reference)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Paystack verify final failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to verify payment.")


@router.get("/booking/{booking_id}/final/status")
def get_final_payment_status(booking_id: str):
    """Get final payment status for a booking."""
    try:
        return service.get_final_payment_status(booking_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Paystack webhook ──────────────────────────────────────────────────────────

@router.post("/webhook")
async def paystack_webhook(request: Request):
    """
    Paystack event webhook.

    SECURITY: Verifies HMAC-SHA512 signature before processing.
    Paystack signs the raw body with your secret key and puts the hex
    digest in the 'x-paystack-signature' header.
    Any request without a valid signature gets 400 — cannot fake a payment.
    """
    raw_body  = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    if not signature:
        logger.warning("Paystack webhook received with no signature header")
        raise HTTPException(status_code=400, detail="Missing signature")

    if not verify_webhook_signature(raw_body, signature):
        logger.warning("Paystack webhook signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid signature")

    import json
    try:
        event = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    service.process_webhook(event)
    return {"status": "ok"}
