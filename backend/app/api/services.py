from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.database import supabase

router = APIRouter(prefix="/api/v1/repair-services", tags=["Services"])

@router.get("", response_model=dict)
def get_repair_services(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(None)
):
    """Get all repair services with optional filters"""
    try:
        query = supabase.table("repair_services").select("*").eq("is_active", True)
        
        if category:
            query = query.eq("service_category", category)
        
        if search:
            query = query.ilike("service_name", f"%{search}%")
        
        query = query.order("service_name")
        
        if limit:
            query = query.limit(limit)
        
        response = query.execute()
        return {"data": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories", response_model=dict)
def get_repair_service_categories():
    """Get unique service categories"""
    try:
        response = supabase.table("repair_services").select("service_category").eq("is_active", True).execute()
        categories = list(set([item["service_category"] for item in response.data if item.get("service_category")]))
        categories.sort()
        return {"data": categories, "count": len(categories)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{service_id}", response_model=dict)
def get_repair_service(service_id: str):
    """Get single repair service by ID"""
    try:
        response = supabase.table("repair_services").select("*").eq("id", service_id).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Service not found")
        return response.data
    except Exception as e:
        if "404" in str(e):
            raise HTTPException(status_code=404, detail="Service not found")
        raise HTTPException(status_code=500, detail=str(e))
