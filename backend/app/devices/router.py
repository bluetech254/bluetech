"""devices/router.py — Device brands, models, and service pricing."""
import logging
from uuid import UUID

from admin_auth.dependencies import get_current_admin
from core.db import db
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Devices"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class BrandBody(BaseModel):
    name: str
    device_type: str = "multi"
    country_of_origin: str | None = None
    is_popular: bool = False
    logo_url: str | None = None
    is_active: bool = True

class ModelBody(BaseModel):
    brand_id: str
    name: str
    device_type: str
    release_year: int | None = None
    is_active: bool = True

class PricingBody(BaseModel):
    service_id: str
    brand_id: str | None = None
    model_id: str | None = None
    price: float


# ── Public: device lookup for booking form ────────────────────────────────────

@router.get("/api/v1/devices/brands")
def get_brands(device_type: str | None = Query(None)):
    """Get active device brands. Optionally filter by device_type (includes 'multi' brands)."""
    q = db.table("device_brands").select("id,name,device_type,is_popular,logo_url").eq("is_active", True)
    if device_type:
        q = q.in_("device_type", [device_type, "multi"])
    resp = q.order("is_popular", desc=True).order("name").execute()
    return {"data": resp.data or []}


@router.get("/api/v1/devices/brands/{brand_id}/models")
def get_models(brand_id: UUID, device_type: str | None = Query(None)):
    """Get active models for a brand."""
    q = db.table("device_models").select("id,name,device_type,release_year")\
        .eq("brand_id", str(brand_id)).eq("is_active", True)
    if device_type:
        q = q.eq("device_type", device_type)
    resp = q.order("release_year", desc=True).order("name").execute()
    return {"data": resp.data or []}


@router.get("/api/v1/devices/services/{service_id}/price")
def get_service_price(
    service_id: UUID,
    brand_id:   UUID | None = Query(None),
    model_id:   UUID | None = Query(None),
):
    """Smart price lookup: model-specific → brand-specific → service default."""
    if model_id and brand_id:
        r = db.table("service_pricing").select("price")\
            .eq("service_id", str(service_id)).eq("brand_id", str(brand_id))\
            .eq("model_id", str(model_id)).limit(1).execute()
        if r["data"]:
            return {"price": float(r["data"][0]["price"]), "level": "model"}

    if brand_id:
        r = db.table("service_pricing").select("price")\
            .eq("service_id", str(service_id)).eq("brand_id", str(brand_id))\
            .is_("model_id", "null").limit(1).execute()
        if r["data"]:
            return {"price": float(r["data"][0]["price"]), "level": "brand"}

    r = db.table("repair_services").select("base_price").eq("id", str(service_id)).single().execute()
    if not r["data"]:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"price": float(r["data"]["base_price"] or 0), "level": "default"}


# ── Admin: brand CRUD ─────────────────────────────────────────────────────────

@router.get("/api/v1/admin/devices/brands")
def admin_get_brands(admin: dict = Depends(get_current_admin)):
    resp = db.table("device_brands").select("*").order("name").execute()
    return {"data": resp.data or []}

@router.post("/api/v1/admin/devices/brands")
def admin_create_brand(body: BrandBody, admin: dict = Depends(get_current_admin)):
    try:
        resp = db.table("device_brands").insert(body.model_dump()).execute()
        return {"data": resp.data[0] if resp.data else {}}
    except Exception as e:
        err = str(e)
        if "23505" in err or "duplicate key" in err.lower():
            raise HTTPException(status_code=409, detail=f"Brand '{body.name}' already exists")
        raise HTTPException(status_code=500, detail=err)

@router.put("/api/v1/admin/devices/brands/{brand_id}")
def admin_update_brand(brand_id: str, body: BrandBody, admin: dict = Depends(get_current_admin)):
    resp = db.table("device_brands").update(body.model_dump()).eq("id", brand_id).execute()
    return {"data": resp.data[0] if resp.data else {}}

@router.delete("/api/v1/admin/devices/brands/{brand_id}")
def admin_delete_brand(brand_id: str, admin: dict = Depends(get_current_admin)):
    db.table("device_brands").delete().eq("id", brand_id).execute()
    return {"ok": True}


# ── Admin: model CRUD ─────────────────────────────────────────────────────────

@router.get("/api/v1/admin/devices/models")
def admin_get_models(brand_id: str | None = Query(None), admin: dict = Depends(get_current_admin)):
    q = db.table("device_models").select("*, device_brands(name)")
    if brand_id:
        q = q.eq("brand_id", brand_id)
    resp = q.order("name").execute()
    return {"data": resp.data or []}

@router.post("/api/v1/admin/devices/models")
def admin_create_model(body: ModelBody, admin: dict = Depends(get_current_admin)):
    resp = db.table("device_models").insert(body.model_dump()).execute()
    return {"data": resp.data[0] if resp.data else {}}

@router.put("/api/v1/admin/devices/models/{model_id}")
def admin_update_model(model_id: str, body: ModelBody, admin: dict = Depends(get_current_admin)):
    resp = db.table("device_models").update(body.model_dump()).eq("id", model_id).execute()
    return {"data": resp.data[0] if resp.data else {}}

@router.delete("/api/v1/admin/devices/models/{model_id}")
def admin_delete_model(model_id: str, admin: dict = Depends(get_current_admin)):
    db.table("device_models").delete().eq("id", model_id).execute()
    return {"ok": True}


# ── Admin: service pricing CRUD ───────────────────────────────────────────────

@router.get("/api/v1/admin/devices/pricing")
def admin_get_pricing(admin: dict = Depends(get_current_admin)):
    resp = db.table("service_pricing")\
        .select("*, repair_services(service_name), device_brands(name), device_models(name)")\
        .order("created_at", desc=True).execute()
    return {"data": resp.data or []}

@router.post("/api/v1/admin/devices/pricing")
def admin_upsert_pricing(body: PricingBody, admin: dict = Depends(get_current_admin)):
    data = body.model_dump()
    # Delete existing rule with same combo first (handles NULL uniqueness)
    q = db.table("service_pricing").delete().eq("service_id", data["service_id"])
    q = q.eq("brand_id", data["brand_id"]) if data["brand_id"] else q.is_("brand_id", "null")
    q = q.eq("model_id", data["model_id"]) if data["model_id"] else q.is_("model_id", "null")
    q.execute()
    resp = db.table("service_pricing").insert(data).execute()
    return {"data": resp.data[0] if resp.data else {}}

@router.delete("/api/v1/admin/devices/pricing/{pricing_id}")
def admin_delete_pricing(pricing_id: str, admin: dict = Depends(get_current_admin)):
    db.table("service_pricing").delete().eq("id", pricing_id).execute()
    return {"ok": True}
