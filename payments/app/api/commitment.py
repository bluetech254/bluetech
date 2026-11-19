"""app/api/commitment.py — booking commitment fee routes (20%)."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.auth import require_api_key
from app.limiter import limiter
from app.schemas import CommitmentInitiateOptions
from app.services import payments

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/booking",
    tags=["Commitment payments"],
    dependencies=[Depends(require_api_key)],
)


@router.post("/{booking_id}/commitment/initiate")
@limiter.limit("5/minute")
def initiate(request: Request, booking_id: str, opts: CommitmentInitiateOptions | None = None):
    try:
        return payments.initiate_commitment_payment(
            booking_id, opts or CommitmentInitiateOptions()
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Commitment initiate failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to initialize commitment payment.")


@router.post("/commitment/verify/{reference}")
@limiter.limit("10/minute")
def verify(request: Request, reference: str):
    try:
        return payments.verify_payment(reference)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Commitment verify failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to verify payment.")


@router.get("/{booking_id}/commitment/status")
def status(booking_id: str):
    try:
        return payments.get_commitment_status(booking_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
