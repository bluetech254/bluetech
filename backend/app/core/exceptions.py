"""
core/exceptions.py — All custom exception classes for the entire backend.

Every domain imports from here. Never define domain-specific exceptions
in individual domain folders — keep them centralized so error handling
is consistent and auditable in one place.
"""


class BlueTechException(Exception):
    """Base exception for all BlueTech application errors."""


# ── Auth ──────────────────────────────────────────────────────────────────────

class AuthException(BlueTechException):
    """Invalid credentials, expired token, unverified account, etc."""


# ── Products ──────────────────────────────────────────────────────────────────

class ProductNotFoundException(BlueTechException):
    """Product does not exist or has been deactivated."""


class InsufficientStockException(BlueTechException):
    """Requested quantity exceeds available stock."""


# ── Orders ────────────────────────────────────────────────────────────────────

class OrderNotFoundException(BlueTechException):
    """Order does not exist."""


# ── Bookings ──────────────────────────────────────────────────────────────────

class BookingNotFoundException(BlueTechException):
    """Repair booking does not exist."""


# ── Delivery ─────────────────────────────────────────────────────────────────

class DeliveryZoneNotFoundException(BlueTechException):
    """Delivery zone name not found in the database."""


# ── Payments ──────────────────────────────────────────────────────────────────

class PaymentException(BlueTechException):
    """M-Pesa or payment processing error."""


# ── Points ────────────────────────────────────────────────────────────────────

class InsufficientPointsException(BlueTechException):
    """User does not have enough points to redeem."""
