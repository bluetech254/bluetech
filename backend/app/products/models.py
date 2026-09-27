"""
products/models.py — Pydantic schemas for the products domain.
"""
from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
from datetime import datetime
from uuid import UUID


class ProductCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    price: Decimal = Field(..., gt=0)
    stock_quantity: int = Field(default=10, ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)
    specifications: dict = Field(default_factory=dict)
    image_url: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    is_active: bool = True
    # Merchandising flags
    is_flash_sale: bool = False
    is_discounted: bool = False
    is_clearance: bool = False
    is_weekly_deal: bool = False
    is_featured: bool = False
    is_new_arrival: bool = False
    is_best_seller: bool = False
    is_trending: bool = False
    is_editors_choice: bool = False
    is_back_in_stock: bool = False
    is_refurbished: bool = False
    is_pre_order: bool = False
    is_coming_soon: bool = False


class ProductUpdate(ProductCreate):
    """Same fields as create — full replacement update."""
    pass


class ProductResponse(ProductCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
