"""
bookings/models.py — Pydantic schemas for the bookings domain.

Fulfillment rules:
  - dropoff: client takes device to shop. No delivery fee. Pays service only.
  - pickup: staff collects device from client. Pickup fee KSH 200 (env PICKUP_FEE_KES, default 200).
            pickup_address is REQUIRED.
"""

from decimal import Decimal
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, model_validator


PICKUP_FEE_KES = 200  # flat pickup fee for pickup bookings (configurable via env if needed)


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
    full_name:         str = Field(..., min_length=2, max_length=100)
    phone_number:      str = Field(..., pattern=r"^254[0-9]{9}$")
    device_type:       str = Field(..., max_length=100)
    device_model:      str | None = Field(None, max_length=100)
    issue_description: str = Field(..., min_length=10, max_length=1000)
    fulfillment_type:  FulfillmentType
    pickup_address:    str | None = Field(None, max_length=300)

    @model_validator(mode="after")
    def _require_pickup_address(self):
        if self.fulfillment_type == FulfillmentType.pickup:
            if not self.pickup_address or len(self.pickup_address.strip()) < 10:
                raise ValueError("pickup_address is required for pickup bookings (min 10 chars)")
        elif self.pickup_address:
            # dropoff ignores address
            self.pickup_address = None
        return self


class StatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "picked_up", "in_diagnosis", "in_repair", "ready", "completed", "cancelled"]


class CostUpdate(BaseModel):
    estimated_cost: Decimal | None = None
    final_cost:     Decimal | None = None
    pickup_fee:     Decimal | None = None
