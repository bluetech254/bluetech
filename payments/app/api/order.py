"""app/api/order.py — order payment routes."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.auth import require_api_key
from app.limiter import limiter
from app.schemas import InitiateOptions
from app.services import payments

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/order",
    tags=["Order payments"],
    dependencies=[Depends(require_api_key)],
)


@router.post("/{order_id}/initiate")
@limiter.limit("5/minute")
def initiate(request: Request, order_id: str, opts: InitiateOptions | None = None):
    try:
        return payments.initiate_order_payment(order_id, opts or InitiateOptions())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Order initiate failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to initialize payment.")


@router.post("/verify/{reference}")
@limiter.limit("10/minute")
def verify(request: Request, reference: str):
    try:
        return payments.verify_payment(reference)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Order verify failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to verify payment.")


@router.get("/{order_id}/status")
def status(order_id: str):
    try:
        return payments.get_order_payment_status(order_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
