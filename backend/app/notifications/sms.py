"""
notifications/sms.py — SMS sending via HostPinnacle Bulk SMS.

Single public function: send_sms(mobile, message) -> bool
All other code in the backend imports from here — never from utils/.

HostPinnacle API docs: https://smsportal.hostpinnacle.co.ke
Endpoint: POST https://smsportal.hostpinnacle.co.ke/SMSApi/send
Auth: apikey in header
Success: responses[0]["response-code"] == "200"
"""
import logging

import requests
from core.config import settings

logger = logging.getLogger(__name__)


def send_sms(mobile: str, message: str) -> bool:
    """
    Send an SMS via HostPinnacle Bulk SMS API.

    Args:
        mobile:  Recipient phone number e.g. '254712345678'
        message: SMS body text

    Returns:
        True if the SMS was accepted by the provider, False on any failure.
        Never raises — SMS failure must never break the caller's operation.
    """
    if not settings.HOSTPINNACLE_API_KEY:
        logger.warning("SMS skipped: HOSTPINNACLE_API_KEY not configured")
        return False

    try:
        response = requests.post(
            settings.HOSTPINNACLE_API_URL,
            headers={
                "apikey": settings.HOSTPINNACLE_API_KEY,
            },
            data={
                "partnerID": settings.HOSTPINNACLE_PARTNER_ID,
                "mobile":    mobile,
                "msg":       message,
                "shortcode": settings.HOSTPINNACLE_SENDER_ID,
                "pass_type": "plain",
            },
            timeout=10,
        )
        data = response.json()
        # HostPinnacle returns a list under "responses"; check the first entry
        responses_list = data.get("responses", [])
        success = (
            len(responses_list) > 0
            and str(responses_list[0].get("response-code", "")) == "200"
        )
        if not success:
            logger.warning(f"SMS to {mobile} failed: {data}")
        return success
    except Exception as e:
        logger.warning(f"SMS to {mobile} failed with exception: {e}")
        return False
