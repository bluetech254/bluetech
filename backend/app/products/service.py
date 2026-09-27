"""
products/service.py — Products domain business logic.

All DB access goes through core/database.
Admin writes use supabase_admin (bypasses RLS).
Public reads use supabase (respects RLS).
"""
from typing import Optional, List
from uuid import UUID

from core.database import supabase, supabase_admin
from core.exceptions import ProductNotFoundException
from products.models import ProductCreate, ProductUpdate


def get_products(
    search: Optional[str] = None,
    active_only: bool = True,
    is_flash_sale: Optional[bool] = None,
    is_discounted: Optional[bool] = None,
    is_clearance: Optional[bool] = None,
    is_weekly_deal: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    is_new_arrival: Optional[bool] = None,
    is_best_seller: Optional[bool] = None,
    is_trending: Optional[bool] = None,
    limit: int = 200,
    offset: int = 0,
) -> List[dict]:
    query = supabase.table("products").select("*")

    if active_only:
        query = query.eq("is_active", True)
    if search:
        query = query.ilike("title", f"%{search}%")

    # Merchandising flag filters — only apply if explicitly set
    flags = {
        "is_flash_sale":   is_flash_sale,
        "is_discounted":   is_discounted,
        "is_clearance":    is_clearance,
        "is_weekly_deal":  is_weekly_deal,
        "is_featured":     is_featured,
        "is_new_arrival":  is_new_arrival,
        "is_best_seller":  is_best_seller,
        "is_trending":     is_trending,
    }
    for flag, value in flags.items():
        if value is not None:
            query = query.eq(flag, value)

    response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return response.data or []


def get_product_by_id(product_id: UUID) -> dict:
    response = supabase.table("products").select("*").eq("id", str(product_id)).single().execute()
    if not response.data:
        raise ProductNotFoundException(f"Product {product_id} not found")
    return response.data


def get_product_categories() -> List[str]:
    r = supabase.table("products").select("category").eq("is_active", True).execute()
    return sorted(set(p["category"] for p in (r.data or []) if p.get("category")))


def create_product(product: ProductCreate) -> dict:
    data = product.model_dump()
    # Convert Decimal to float for JSON serialisation
    data["price"] = float(data["price"])
    response = supabase_admin.table("products").insert(data).execute()
    return response.data[0]


def update_product(product_id: UUID, product: ProductUpdate) -> dict:
    data = product.model_dump()
    data["price"] = float(data["price"])
    response = supabase_admin.table("products").update(data).eq("id", str(product_id)).execute()
    if not response.data:
        raise ProductNotFoundException(f"Product {product_id} not found")
    return response.data[0]


def deactivate_product(product_id: UUID) -> dict:
    response = supabase_admin.table("products").update({"is_active": False}).eq("id", str(product_id)).execute()
    if not response.data:
        raise ProductNotFoundException(f"Product {product_id} not found")
    return response.data[0]
