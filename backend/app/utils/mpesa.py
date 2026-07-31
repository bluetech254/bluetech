import base64
import requests
from datetime import datetime
import os

CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY")
CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET")
SHORTCODE = os.getenv("MPESA_SHORTCODE", "174379")
PASSKEY = os.getenv("MPESA_PASSKEY")
CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL")
ENV = os.getenv("MPESA_ENV", "sandbox")

BASE_URL = "https://sandbox.safaricom.co.ke" if ENV == "sandbox" else "https://api.safaricom.co.ke"


def get_access_token() -> str:
    url = f"{BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
    resp = requests.get(url, auth=(CONSUMER_KEY, CONSUMER_SECRET), timeout=10)
    resp.raise_for_status()
    return resp.json()["access_token"]


def get_password_and_timestamp():
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{SHORTCODE}{PASSKEY}{timestamp}".encode()).decode()
    return password, timestamp


def stk_push(phone: str, amount: int, reference: str, description: str) -> dict:
    token = get_access_token()
    password, timestamp = get_password_and_timestamp()
    payload = {
        "BusinessShortCode": SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone,
        "PartyB": SHORTCODE,
        "PhoneNumber": phone,
        "CallBackURL": CALLBACK_URL,
        "AccountReference": reference[:12],
        "TransactionDesc": description[:13],
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest", json=payload, headers=headers, timeout=15)
    resp.raise_for_status()
    return resp.json()
