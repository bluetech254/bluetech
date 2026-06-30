from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from uuid import UUID
from enum import Enum

class OrderStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    processing = "processing"
    dispatched = "dispatched"
    delivered = "delivered"
    cancelled = "cancelled"

class PaymentStatus(str, Enum):
    unpaid = "unpaid"
    paid = "paid"

class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)

class OrderItemResponse(BaseModel):
    id: UUID
    order_id: UUID
    product_id: UUID
    product_title: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    created_at: datetime

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    full_name: str = Field(..., min_length=2)
    phone_number: str = Field(..., pattern=r"^254[0-9]{9}$")
    email: Optional[str] = None
    delivery_address: str = Field(..., min_length=10)
    delivery_zone: str
    items: List[OrderItemCreate] = Field(..., min_length=1)
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: UUID
    full_name: str
    phone_number: str
    email: Optional[str]
    delivery_address: str
    delivery_zone: str
    delivery_fee: Decimal
    subtotal: Decimal
    total_amount: Decimal
    status: str
    payment_method: str
    payment_status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StatusUpdate(BaseModel):
    status: str
