from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from uuid import UUID
from app.services import product_service
from app.models.product import ProductCreate, ProductUpdate, ProductResponse
from app.utils.exceptions import ProductNotFoundException
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/api/v1/products", tags=["Products"])

@router.get("", response_model=dict)
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
):
    """Get all products with optional filters"""
    try:
        products = product_service.get_products(
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
        )
        return {"data": products, "count": len(products)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories", response_model=list)
def get_product_categories():
    from app.database import supabase
    r = supabase.table("products").select("category").eq("is_active", True).execute()
    cats = sorted(set(p["category"] for p in r.data if p.get("category")))
    return cats

@router.get("/{product_id}", response_model=dict)
def get_product(product_id: UUID):
    """Get single product by ID"""
    try:
        product = product_service.get_product_by_id(product_id)
        return product
    except ProductNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=dict)
def create_product(product: ProductCreate, admin: dict = Depends(get_current_admin)):
    """Create new product (Admin)"""
    try:
        created = product_service.create_product(product)
        return created
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{product_id}", response_model=dict)
def update_product(product_id: UUID, product: ProductUpdate, admin: dict = Depends(get_current_admin)):
    """Update product (Admin)"""
    try:
        updated = product_service.update_product(product_id, product)
        return updated
    except ProductNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{product_id}")
def delete_product(product_id: UUID, admin: dict = Depends(get_current_admin)):
    """Deactivate product (Admin)"""
    try:
        result = product_service.deactivate_product(product_id)
        return {"message": "Product deactivated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
