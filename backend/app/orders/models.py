"""
orders/models.py — Pydantic schemas for the orders domain.
"""
from enum import Enum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class OrderStatus(str, Enum):
    pending    = "pending"
    confirmed  = "confirmed"
    processing = "processing"
    dispatched = "dispatched"
    delivered  = "delivered"
    cancelled  = "cancelled"


class PaymentMethod(str, Enum):
    cash_on_delivery = "cash_on_delivery"
    mpesa            = "mpesa"
    paystack         = "paystack"
    points_only      = "points_only"


class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    full_name:        str = Field(..., min_length=2, max_length=100)
    phone_number:     str = Field(..., pattern=r"^254[0-9]{9}$")
    email:            str | None = Field(None, max_length=254)
    delivery_address: str = Field(..., min_length=5, max_length=300)
    delivery_zone:    str = Field(..., max_length=100)
    items:            list[OrderItemCreate] = Field(..., min_length=1)
    notes:            str | None = Field(None, max_length=500)
    payment_method:   str = "cash_on_delivery"
    referral_code:    str | None = Field(None, max_length=20)
    redeem_points:    int | None = None


class StatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "processing", "dispatched", "delivered", "cancelled"]
