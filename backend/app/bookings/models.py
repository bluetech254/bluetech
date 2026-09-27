"""
bookings/models.py — Pydantic schemas for the bookings domain.
"""
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field


class FulfillmentType(str, Enum):
    dropoff = "dropoff"
    pickup  = "pickup"


class BookingStatus(str, Enum):
    pending      = "pending"
    confirmed    = "confirmed"
    picked_up    = "picked_up"
    in_diagnosis = "in_diagnosis"
    in_repair    = "in_repair"
    ready        = "ready"
    completed    = "completed"
    cancelled    = "cancelled"


class BookingCreate(BaseModel):
    full_name:         str = Field(..., min_length=2)
    phone_number:      str = Field(..., pattern=r"^254[0-9]{9}$")
    device_type:       str
    device_model:      str | None = None
    issue_description: str = Field(..., min_length=10)
    fulfillment_type:  FulfillmentType
    pickup_address:    str | None = None


class StatusUpdate(BaseModel):
    status: str


class CostUpdate(BaseModel):
    estimated_cost: Decimal | None = None
    final_cost:     Decimal | None = None
