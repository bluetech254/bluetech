from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
from datetime import datetime
from uuid import UUID
from enum import Enum

class FulfillmentType(str, Enum):
    dropoff = "dropoff"
    pickup = "pickup"

class BookingStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    picked_up = "picked_up"
    in_diagnosis = "in_diagnosis"
    in_repair = "in_repair"
    ready = "ready"
    completed = "completed"
    cancelled = "cancelled"

class BookingCreate(BaseModel):
    full_name: str = Field(..., min_length=2)
    phone_number: str = Field(..., pattern=r"^254[0-9]{9}$")
    device_type: str
    device_model: Optional[str] = None
    issue_description: str = Field(..., min_length=10)
    fulfillment_type: FulfillmentType
    pickup_address: Optional[str] = None

class BookingResponse(BaseModel):
    id: UUID
    full_name: str
    phone_number: str
    device_type: str
    device_model: Optional[str]
    issue_description: str
    fulfillment_type: str
    pickup_address: Optional[str]
    status: str
    estimated_cost: Optional[Decimal]
    final_cost: Optional[Decimal]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CostUpdate(BaseModel):
    estimated_cost: Optional[Decimal] = None
    final_cost: Optional[Decimal] = None
