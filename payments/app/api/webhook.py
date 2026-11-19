"""app/api/webhook.py — gateway webhooks (authenticated by signature)."""
import json
import logging

from fastapi import APIRouter, HTTPException, Request

from app.gateways import get_gateway
from app.services import payments

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhook", tags=["Webhooks"])


def _lower_headers(request: Request) -> dict[str, str]:
    return {key.lower(): value for key, value in request.headers.items()}


async def _handle(request: Request, gateway_name: str) -> dict:
    raw_body = await request.body()
    gateway = get_gateway(gateway_name)

    if not gateway.verify_webhook(raw_body, _lower_headers(request)):
        logger.warning("%s webhook failed signature check", gateway_name)
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        event = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    payments.process_gateway_event(gateway_name, event)
    return {"status": "ok"}


@router.post("/payhero")
async def payhero_webhook(request: Request):
    return await _handle(request, "payhero")
