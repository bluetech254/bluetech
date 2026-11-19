"""app/gateways/base.py — the interface every payment gateway must satisfy."""
from typing import Protocol


class Gateway(Protocol):
    """Duck-typed gateway. Modules implement these as module-level functions."""

    name: str

    def initialize_transaction(
        self,
        *,
        email: str,
        amount_kes: float,
        reference: str,
        callback_url: str | None = None,
        phone_number: str | None = None,
        paybill_number: str | None = None,
        metadata: dict | None = None,
    ) -> dict:
        """
        Start a payment.

        Returns a dict with at least:
            {
                "authorization_url": str | None,   # redirect URL (None for STK push)
                "reference": str,
                "gateway": str,
                "requires_stk": bool,              # True when customer approves on phone
                "raw": dict,
            }
        """
        ...

    def verify_transaction(self, reference: str) -> dict:
        """
        Verify a transaction by our reference.

        Returns a normalised dict:
            {
                "status": "paid" | "pending" | "failed",
                "reference": str,
                "receipt": str | None,
                "amount_kes": float,
                "gateway": str,
                "raw": dict,
            }
        """
        ...

    def verify_webhook(self, raw_body: bytes, headers: dict[str, str]) -> bool:
        """Return True when the webhook payload is authentic."""
        ...
