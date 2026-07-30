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
    search: Optional[str] = Query(None, description="Search products by title"),
    active_only: bool = Query(True, description="Filter active products only")
):
    """Get all products with optional filters"""
    try:
        products = product_service.get_products(search=search, active_only=active_only)
        return {"data": products, "count": len(products)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
