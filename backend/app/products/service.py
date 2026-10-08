"""
products/service.py — Products domain business logic.

All DB access goes through core/database.
Admin writes use supabase_admin (bypasses RLS).
Public reads use supabase (respects RLS).
"""
from uuid import UUID

from core.db import db
from core.exceptions import ProductNotFoundException
from products.models import ProductCreate, ProductUpdate


def get_products(
    search: str | None = None,
    active_only: bool = True,
    is_flash_sale: bool | None = None,
    is_discounted: bool | None = None,
    is_clearance: bool | None = None,
    is_weekly_deal: bool | None = None,
    is_featured: bool | None = None,
    is_new_arrival: bool | None = None,
    is_best_seller: bool | None = None,
    is_trending: bool | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[dict]:
    query = db.table("products").select("*")

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
    # Use supabase_admin so the lookup works regardless of is_active state and
    # avoids any RLS edge-cases that can cause the anon client to throw instead
    # of returning empty data.
    response = db.table("products").select("*").eq("id", str(product_id)).execute()
    if not response.data:
        raise ProductNotFoundException(f"Product {product_id} not found")
    return response.data[0]


def get_product_categories() -> list[str]:
    r = db.table("products").select("category").eq("is_active", True).execute()
    return sorted(set(p["category"] for p in (r.data or []) if p.get("category")))


def _prepare_product_data(data: dict) -> dict:
    """Normalise product data before writing to Supabase.

    - Converts Decimal price to float.
    - 'category' and 'brand' are not DB columns; fold category into
      specifications JSONB and drop brand entirely.
    """
    data["price"] = float(data["price"])
    # brand is not a DB column — drop it silently
    data.pop("brand", None)
    category = data.pop("category", None)
    if category:
        specs = data.get("specifications") or {}
        specs.setdefault("category", category)
        data["specifications"] = specs
    return data


def create_product(product: ProductCreate) -> dict:
    data = _prepare_product_data(product.model_dump())
    response = db.table("products").insert(data).execute()
    return response.data[0]


def update_product(product_id: UUID, product: ProductUpdate) -> dict:
    data = _prepare_product_data(product.model_dump())
    response = db.table("products").update(data).eq("id", str(product_id)).execute()
    if not response.data:
        raise ProductNotFoundException(f"Product {product_id} not found")
    return response.data[0]


def deactivate_product(product_id: UUID) -> dict:
    response = db.table("products").update({"is_active": False}).eq("id", str(product_id)).execute()
    if not response.data:
        raise ProductNotFoundException(f"Product {product_id} not found")
    return response.data[0]
