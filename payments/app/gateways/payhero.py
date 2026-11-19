"""
app/gateways/payhero.py — Payhero API calls (M-Pesa STK push).

Payhero pushes an STK prompt to the customer's phone against the channel
(Yetu Sacco paybill) configured in the Payhero dashboard. There is no redirect
URL: the customer approves on their phone, and Payhero calls our webhook.

Auth: HTTP Basic using the API username/password from the Payhero dashboard.

NOTE: field names below follow Payhero's v2 API. Confirm against your account
docs before going live — in particular the status endpoint path and the exact
callback payload keys.
"""
import base64
import hmac
import logging

import requests

from app.config import settings

logger = logging.getLogger(__name__)

name = "payhero"


def _headers() -> dict:
    raw = f"{settings.PAYHERO_API_USERNAME}:{settings.PAYHERO_API_PASSWORD}"
    token = base64.b64encode(raw.encode("utf-8")).decode("ascii")
    return {
        "Authorization": f"Basic {token}",
        "Content-Type": "application/json",
    }


def _normalise_phone(phone: str) -> str:
    """Turn 0712.../712.../+254712... into 254712..."""
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if digits.startswith("254"):
        return digits
    if digits.startswith("0"):
        return "254" + digits[1:]
    if digits.startswith(("7", "1")):
        return "254" + digits
    return digits


def initialize_transaction(
    *,
    email: str,
    amount_kes: float,
    reference: str,
    callback_url: str | None = None,
    phone_number: str | None = None,
    paybill_number: str | None = None,
    metadata: dict | None = None,
) -> dict:
    if not phone_number:
        raise ValueError("Payhero requires a phone number for STK push")
    if not settings.PAYHERO_CHANNEL_ID:
        raise ValueError("PAYHERO_CHANNEL_ID is not configured")

    payload: dict = {
        "amount": int(round(amount_kes)),
        "phone_number": _normalise_phone(phone_number),
        "channel_id": int(settings.PAYHERO_CHANNEL_ID),
        "provider": "m-pesa",
        "external_reference": reference,
    }
    if callback_url:
        payload["callback_url"] = callback_url

    try:
        resp = requests.post(
            f"{settings.PAYHERO_API_URL}/payments",
            json=payload,
            headers=_headers(),
            timeout=30,
        )
        resp.raise_for_status()
    except requests.HTTPError as exc:
        body = ""
        try:
            body = exc.response.json().get("message", exc.response.text)
        except Exception:
            body = str(exc)
        logger.error("Payhero initialize failed: %s — %s", exc, body)
        raise ValueError(f"Payhero error: {body}") from exc

    data = resp.json()
    if not data.get("success", True):
        raise ValueError(f"Payhero initialize failed: {data.get('message')}")

    return {
        "authorization_url": None,
        "reference": data.get("reference") or reference,
        "checkout_request_id": data.get("CheckoutRequestID"),
        "gateway": name,
        "requires_stk": True,
        "raw": data,
    }


def verify_transaction(reference: str) -> dict:
    resp = requests.get(
        f"{settings.PAYHERO_API_URL}/transaction-status",
        params={"reference": reference},
        headers=_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    raw_status = str(
        data.get("status") or data.get("transaction_status") or ""
    ).upper()
    if raw_status in ("SUCCESS", "SUCCESSFUL", "PAID", "COMPLETED"):
        status = "paid"
    elif raw_status in ("FAILED", "CANCELLED", "CANCELED", "REJECTED"):
        status = "failed"
    else:
        status = "pending"

    amount = data.get("amount") or data.get("Amount") or 0
    receipt = (
        data.get("provider_reference")
        or data.get("third_party_reference")
        or data.get("MpesaReceiptNumber")
        or data.get("mpesa_receipt")
    )
    return {
        "status": status,
        "reference": data.get("reference") or reference,
        "receipt": receipt,
        "amount_kes": float(amount),
        "gateway": name,
        "raw": data,
    }


def verify_webhook(raw_body: bytes, headers: dict[str, str]) -> bool:
    """Payhero callbacks are unsigned; final truth comes from transaction-status."""
    if not settings.PAYHERO_CALLBACK_SECRET:
        return True
    provided = headers.get("x-payhero-secret", "")
    return bool(provided) and hmac.compare_digest(
        provided, settings.PAYHERO_CALLBACK_SECRET
    )
