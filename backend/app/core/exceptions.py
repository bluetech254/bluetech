"""
core/exceptions.py — All custom exception classes for the entire backend.

Every domain imports from here. Never define domain-specific exceptions
in individual domain folders — keep them centralized so error handling
is consistent and auditable in one place.
"""


class BlueTechException(Exception):
    """Base exception for all BlueTech application errors."""
    pass


# ── Auth ──────────────────────────────────────────────────────────────────────

class AuthException(BlueTechException):
    """Invalid credentials, expired token, unverified account, etc."""
    pass


# ── Products ──────────────────────────────────────────────────────────────────

class ProductNotFoundException(BlueTechException):
    """Product does not exist or has been deactivated."""
    pass


class InsufficientStockException(BlueTechException):
    """Requested quantity exceeds available stock."""
    pass


# ── Orders ────────────────────────────────────────────────────────────────────

class OrderNotFoundException(BlueTechException):
    """Order does not exist."""
    pass


# ── Bookings ──────────────────────────────────────────────────────────────────

class BookingNotFoundException(BlueTechException):
    """Repair booking does not exist."""
    pass


# ── Delivery ─────────────────────────────────────────────────────────────────

class DeliveryZoneNotFoundException(BlueTechException):
    """Delivery zone name not found in the database."""
    pass


# ── Payments ──────────────────────────────────────────────────────────────────

class PaymentException(BlueTechException):
    """M-Pesa or payment processing error."""
    pass


# ── Points ────────────────────────────────────────────────────────────────────

class InsufficientPointsException(BlueTechException):
    """User does not have enough points to redeem."""
    pass
