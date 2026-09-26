"""
notifications/sms.py — SMS sending via TextPie.

Single public function: send_sms(mobile, message) -> bool
All other code in the backend imports from here — never from utils/.
"""
import logging
import requests
from core.config import settings

logger = logging.getLogger(__name__)

_TEXTPIE_URL = "https://api.textpie.co.ke/sms/sendsms"


def send_sms(mobile: str, message: str) -> bool:
    """
    Send an SMS via TextPie.

    Args:
        mobile:  Recipient phone number e.g. '254712345678'
        message: SMS body text

    Returns:
        True if the SMS was accepted by the provider, False on any failure.
        Never raises — SMS failure must never break the caller's operation.
    """
    if not settings.TEXTPIE_API_KEY:
        logger.warning("SMS skipped: TEXTPIE_API_KEY not configured")
        return False

    try:
        response = requests.post(
            _TEXTPIE_URL,
            json={
                "api_key":       settings.TEXTPIE_API_KEY,
                "service_id":    settings.TEXTPIE_SERVICE_ID,
                "mobile":        mobile,
                "response_type": "json",
                "shortcode":     settings.TEXTPIE_SHORTCODE,
                "message":       message,
            },
            timeout=10,
        )
        data = response.json()
        success = data.get("status_code") == "1000"
        if not success:
            logger.warning(f"SMS to {mobile} failed: {data}")
        return success
    except Exception as e:
        logger.warning(f"SMS to {mobile} failed with exception: {e}")
        return False
