"""
orders/models.py — Pydantic schemas for the orders domain.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from uuid import UUID
from enum import Enum


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
    points_only      = "points_only"


class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    full_name:        str = Field(..., min_length=2)
    phone_number:     str = Field(..., pattern=r"^254[0-9]{9}$")
    email:            Optional[str] = None
    delivery_address: str = Field(..., min_length=5)
    delivery_zone:    str
    items:            List[OrderItemCreate] = Field(..., min_length=1)
    notes:            Optional[str] = None
    payment_method:   str = "cash_on_delivery"
    referral_code:    Optional[str] = None   # code entered at checkout
    redeem_points:    Optional[int] = None   # points to redeem


class StatusUpdate(BaseModel):
    status: str
