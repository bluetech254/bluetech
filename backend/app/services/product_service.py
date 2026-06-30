from typing import List, Optional
from uuid import UUID
from app.database import supabase, supabase_admin
from app.models.product import ProductCreate, ProductUpdate, ProductResponse
from app.utils.exceptions import ProductNotFoundException

def get_products(search: Optional[str] = None, active_only: bool = True) -> List[dict]:
    """Get all products with optional filters"""
    query = supabase.table("products").select("*")
    
    if active_only:
        query = query.eq("is_active", True)
    
    if search:
        query = query.ilike("title", f"%{search}%")
    
    response = query.order("created_at", desc=True).execute()
    return response.data

def get_product_by_id(product_id: UUID) -> dict:
    """Get single product by ID"""
    response = supabase.table("products").select("*").eq("id", str(product_id)).single().execute()
    if not response.data:
        raise ProductNotFoundException(f"Product {product_id} not found")
    return response.data

def create_product(product_data: ProductCreate) -> dict:
    """Create new product"""
    data = product_data.model_dump()
    data["price"] = float(data["price"])
    
    response = supabase_admin.table("products").insert(data).execute()
    return response.data[0]

def update_product(product_id: UUID, product_data: ProductUpdate) -> dict:
    """Update product"""
    data = product_data.model_dump()
    data["price"] = float(data["price"])
    
    response = supabase_admin.table("products").update(data).eq("id", str(product_id)).execute()
    if not response.data:
        raise ProductNotFoundException(f"Product {product_id} not found")
    return response.data[0]

def deactivate_product(product_id: UUID) -> bool:
    """Soft delete product"""
    response = supabase_admin.table("products").update({"is_active": False}).eq("id", str(product_id)).execute()
    return len(response.data) > 0
