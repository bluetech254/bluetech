from fastapi import APIRouter, HTTPException, Query
from uuid import UUID
from app.database import supabase

router = APIRouter(prefix="/api/v1/devices", tags=["Devices"])


@router.get("/brands")
def get_brands(device_type: str = Query(None)):
    """Get all active device brands, optionally filtered by device_type (includes 'multi' brands)"""
    query = supabase.table("device_brands").select("id,name,device_type,is_popular,logo_url").eq("is_active", True)
    if device_type:
        query = query.in_("device_type", [device_type, "multi"])
    resp = query.order("is_popular", desc=True).order("name").execute()
    return {"data": resp.data}


@router.get("/brands/{brand_id}/models")
def get_models(brand_id: UUID, device_type: str = Query(None)):
    """Get active models for a brand"""
    query = supabase.table("device_models").select("id,name,device_type,release_year")\
        .eq("brand_id", str(brand_id)).eq("is_active", True)
    if device_type:
        query = query.eq("device_type", device_type)
    resp = query.order("release_year", desc=True).order("name").execute()
    return {"data": resp.data}


@router.get("/services/{service_id}/price")
def get_service_price(service_id: UUID, brand_id: UUID = Query(None), model_id: UUID = Query(None)):
    """
    Smart price lookup with fallback chain:
    model-specific price > brand-specific price > service default price
    """
    sb = supabase

    # 1. Try model-specific price
    if model_id and brand_id:
        r = sb.table("service_pricing").select("price")\
            .eq("service_id", str(service_id))\
            .eq("brand_id", str(brand_id))\
            .eq("model_id", str(model_id))\
            .limit(1).execute()
        if r.data:
            return {"price": float(r.data[0]["price"]), "level": "model"}

    # 2. Try brand-specific price
    if brand_id:
        r = sb.table("service_pricing").select("price")\
            .eq("service_id", str(service_id))\
            .eq("brand_id", str(brand_id))\
            .is_("model_id", "null")\
            .limit(1).execute()
        if r.data:
            return {"price": float(r.data[0]["price"]), "level": "brand"}

    # 3. Fallback to service default price
    r = sb.table("repair_services").select("base_price").eq("id", str(service_id)).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"price": float(r.data["base_price"] or 0), "level": "default"}
