"""app/api/final.py — booking final payment routes (admin-triggered)."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.auth import require_api_key
from app.limiter import limiter
from app.schemas import FinalRequestOptions
from app.services import payments

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/booking",
    tags=["Final payments"],
    dependencies=[Depends(require_api_key)],
)


@router.post("/{booking_id}/final/request")
def request_final(booking_id: str, opts: FinalRequestOptions | None = None):
    try:
        return payments.request_final_payment(booking_id, opts or FinalRequestOptions())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Final payment request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to create payment link.")


@router.post("/final/verify/{reference}")
@limiter.limit("10/minute")
def verify(request: Request, reference: str):
    try:
        return payments.verify_payment(reference)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Final verify failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to verify payment.")


@router.get("/{booking_id}/final/status")
def status(booking_id: str):
    try:
        return payments.get_final_payment_status(booking_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
