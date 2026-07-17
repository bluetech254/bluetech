import requests
import os
from dotenv import load_dotenv
load_dotenv()

TEXTPIE_API_KEY = os.getenv("TEXTPIE_API_KEY", "")
TEXTPIE_URL = "https://api.textpie.co.ke/sms/sendsms"
TEXTPIE_SHORTCODE = "Textpie_LTD"
TEXTPIE_SERVICE_ID = 151


def send_sms(mobile: str, message: str) -> bool:
    """Send SMS via TextPie. Returns True on success."""
    try:
        response = requests.post(TEXTPIE_URL, json={
            "api_key": TEXTPIE_API_KEY,
            "service_id": TEXTPIE_SERVICE_ID,
            "mobile": mobile,
            "response_type": "json",
            "shortcode": TEXTPIE_SHORTCODE,
            "message": message,
        }, timeout=10)
        data = response.json()
        return data.get("status_code") == "1000"
    except Exception:
        return False
