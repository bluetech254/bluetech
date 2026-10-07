"""
notifications/sms.py — SMS sending via BlessedTexts Bulk SMS.

Single public function: send_sms(mobile, message) -> bool
All other code in the backend imports from here — never from utils/.

BlessedTexts API docs: https://sms.blessedtexts.com/api/sms/v1
Endpoint: POST https://sms.blessedtexts.com/api/sms/v1/sendsms
Success:  response[0]["status_code"] == "1000"
"""
import logging

import requests
from core.config import settings

logger = logging.getLogger(__name__)


def send_sms(mobile: str, message: str) -> bool:
    """
    Send an SMS via BlessedTexts Bulk SMS API.

    Args:
        mobile:  Recipient phone number e.g. '254712345678'
        message: SMS body text

    Returns:
        True if the SMS was accepted by the provider, False on any failure.
        Never raises — SMS failure must never break the caller's operation.
    """
    if not settings.BLESSEDTEXTS_API_KEY:
        logger.warning("SMS skipped: BLESSEDTEXTS_API_KEY not configured")
        return False

    try:
        response = requests.post(
            settings.BLESSEDTEXTS_API_URL,
            json={
                "api_key":   settings.BLESSEDTEXTS_API_KEY,
                "sender_id": settings.BLESSEDTEXTS_SENDER_ID,
                "message":   message,
                "phone":     mobile,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )
        data = response.json()
        # Response is a list; check first entry's status_code
        if isinstance(data, list) and len(data) > 0:
            success = str(data[0].get("status_code", "")) == "1000"
        else:
            success = False

        if not success:
            logger.warning(f"SMS to {mobile} failed: {data}")
        return success
    except Exception as e:
        logger.warning(f"SMS to {mobile} failed with exception: {e}")
        return False
