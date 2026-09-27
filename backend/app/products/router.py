"""
products/router.py — Products HTTP routes.

Public:  GET /api/v1/products, GET /api/v1/products/{id}, GET /api/v1/products/categories
Admin:   POST, PUT, DELETE — require valid admin JWT
"""
import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Depends

from core.exceptions import ProductNotFoundException
from admin_auth.dependencies import get_current_admin
from products.models import ProductCreate, ProductUpdate
from products import service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/products", tags=["Products"])


@router.get("/categories")
def get_categories():
    """Get distinct active product categories."""
    return service.get_product_categories()


@router.get("")
def get_products(
    search: Optional[str] = Query(None),
    active_only: bool = Query(True),
    is_flash_sale: Optional[bool] = Query(None),
    is_discounted: Optional[bool] = Query(None),
    is_clearance: Optional[bool] = Query(None),
    is_weekly_deal: Optional[bool] = Query(None),
    is_featured: Optional[bool] = Query(None),
    is_new_arrival: Optional[bool] = Query(None),
    is_best_seller: Optional[bool] = Query(None),
    is_trending: Optional[bool] = Query(None),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Get all products with optional filters and pagination."""
    products = service.get_products(
        search=search,
        active_only=active_only,
        is_flash_sale=is_flash_sale,
        is_discounted=is_discounted,
        is_clearance=is_clearance,
        is_weekly_deal=is_weekly_deal,
        is_featured=is_featured,
        is_new_arrival=is_new_arrival,
        is_best_seller=is_best_seller,
        is_trending=is_trending,
        limit=limit,
        offset=offset,
    )
    return {"data": products, "count": len(products)}


@router.get("/{product_id}")
def get_product(product_id: UUID):
    """Get a single product by ID."""
    try:
        return service.get_product_by_id(product_id)
    except ProductNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("")
def create_product(body: ProductCreate, admin: dict = Depends(get_current_admin)):
    """Create a new product. Admin only."""
    try:
        return service.create_product(body)
    except Exception as e:
        logger.error(f"Create product error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{product_id}")
def update_product(product_id: UUID, body: ProductUpdate, admin: dict = Depends(get_current_admin)):
    """Update a product. Admin only."""
    try:
        return service.update_product(product_id, body)
    except ProductNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Update product error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{product_id}")
def delete_product(product_id: UUID, admin: dict = Depends(get_current_admin)):
    """Deactivate a product (soft delete). Admin only."""
    try:
        service.deactivate_product(product_id)
        return {"message": "Product deactivated successfully"}
    except ProductNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Delete product error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
