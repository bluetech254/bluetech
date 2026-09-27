"""
payments/mpesa.py — Raw Safaricom Daraja API calls.

Only this file talks directly to Safaricom. Everything else
in the payments domain goes through service.py.
"""
import base64
import logging
from datetime import datetime

import requests
from core.config import settings

logger = logging.getLogger(__name__)


def _get_access_token() -> str:
    url  = f"{settings.mpesa_base_url}/oauth/v1/generate?grant_type=client_credentials"
    resp = requests.get(
        url,
        auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET),
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def _get_password_and_timestamp() -> tuple[str, str]:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    raw       = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    password  = base64.b64encode(raw.encode()).decode()
    return password, timestamp


def stk_push(phone: str, amount: int, reference: str, description: str) -> dict:
    """
    Initiate an M-Pesa STK push (Lipa Na M-Pesa Online).

    Args:
        phone:       Customer phone in 254XXXXXXXXX format
        amount:      Amount in KES (integer)
        reference:   Account reference (max 12 chars)
        description: Transaction description (max 13 chars)

    Returns:
        Safaricom API response dict containing CheckoutRequestID
    """
    token             = _get_access_token()
    password, timestamp = _get_password_and_timestamp()

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password":          password,
        "Timestamp":         timestamp,
        "TransactionType":   "CustomerPayBillOnline",
        "Amount":            amount,
        "PartyA":            phone,
        "PartyB":            settings.MPESA_SHORTCODE,
        "PhoneNumber":       phone,
        "CallBackURL":       settings.MPESA_CALLBACK_URL,
        "AccountReference":  reference[:12],
        "TransactionDesc":   description[:13],
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type":  "application/json",
    }
    resp = requests.post(
        f"{settings.mpesa_base_url}/mpesa/stkpush/v1/processrequest",
        json=payload, headers=headers, timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def stk_query(checkout_request_id: str) -> dict:
    """Query the status of a pending STK push transaction."""
    token             = _get_access_token()
    password, timestamp = _get_password_and_timestamp()

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password":          password,
        "Timestamp":         timestamp,
        "CheckoutRequestID": checkout_request_id,
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type":  "application/json",
    }
    resp = requests.post(
        f"{settings.mpesa_base_url}/mpesa/stkpushquery/v1/query",
        json=payload, headers=headers, timeout=15,
    )
    resp.raise_for_status()
    return resp.json()
