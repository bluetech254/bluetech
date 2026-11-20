"""
core/exceptions.py — All custom exception classes for the entire backend.

Every domain imports from here. Never define domain-specific exceptions
in individual domain folders — keep them centralized so error handling
is consistent and auditable in one place.
"""


class FixitException(Exception):
    """Base exception for all Fixit Blue Technology application errors."""


# ── Auth ──────────────────────────────────────────────────────────────────────

class AuthException(FixitException):
    """Invalid credentials, expired token, unverified account, etc."""


# ── Products ──────────────────────────────────────────────────────────────────

class ProductNotFoundException(FixitException):
    """Product does not exist or has been deactivated."""


class InsufficientStockException(FixitException):
    """Requested quantity exceeds available stock."""


# ── Orders ────────────────────────────────────────────────────────────────────

class OrderNotFoundException(FixitException):
    """Order does not exist."""


# ── Bookings ──────────────────────────────────────────────────────────────────

class BookingNotFoundException(FixitException):
    """Repair booking does not exist."""


# ── Delivery ─────────────────────────────────────────────────────────────────

class DeliveryZoneNotFoundException(FixitException):
    """Delivery zone name not found in the database."""


# ── Payments ──────────────────────────────────────────────────────────────────

class PaymentException(FixitException):
    """M-Pesa or payment processing error."""


# ── Points ────────────────────────────────────────────────────────────────────

class InsufficientPointsException(FixitException):
    """User does not have enough points to redeem."""
