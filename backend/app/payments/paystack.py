"""
payments/paystack.py — Raw Paystack API calls.

All HTTP communication with Paystack lives here.
Business logic lives in payments/service.py — not here.

Paystack docs: https://paystack.com/docs/api/
"""
import hashlib
import hmac
import logging

import requests

from core.config import settings

logger = logging.getLogger(__name__)


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type":  "application/json",
    }


def initialize_transaction(
    email: str,
    amount_kes: float,
    reference: str,
    callback_url: str | None = None,
    metadata: dict | None = None,
) -> dict:
    """
    Initialize a Paystack transaction.
    Amount must be in KES (we convert to kobo/cents — Paystack uses smallest unit).
    Returns: { authorization_url, access_code, reference }
    """
    # Paystack KES amounts are in cents (1 KES = 100 kobo)
    payload: dict = {
        "email":     email,
        "amount":    int(amount_kes * 100),
        "currency":  "KES",
        "reference": reference,
    }
    if callback_url:
        payload["callback_url"] = callback_url
    if metadata:
        payload["metadata"] = metadata

    resp = requests.post(f"{settings.PAYSTACK_API_URL}/transaction/initialize", json=payload, headers=_headers(), timeout=30)
    resp.raise_for_status()
    data = resp.json()

    if not data.get("status"):
        raise ValueError(f"Paystack initialize failed: {data.get('message')}")

    return data["data"]  # { authorization_url, access_code, reference }


def verify_transaction(reference: str) -> dict:
    """
    Verify a transaction by reference.
    Returns the full transaction object from Paystack.
    Raises ValueError if transaction not found or failed.
    """
    resp = requests.get(f"{settings.PAYSTACK_API_URL}/transaction/verify/{reference}", headers=_headers(), timeout=30)
    resp.raise_for_status()
    data = resp.json()

    if not data.get("status"):
        raise ValueError(f"Paystack verify failed: {data.get('message')}")

    return data["data"]  # full transaction object


def verify_webhook_signature(payload_bytes: bytes, signature: str) -> bool:
    """
    Verify Paystack webhook signature.
    Paystack signs the raw request body with HMAC-SHA512 using your secret key.
    Always verify before trusting any webhook payload.
    """
    if not settings.PAYSTACK_SECRET_KEY:
        return False
    expected = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode("utf-8"),
        payload_bytes,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
