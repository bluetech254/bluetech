"""services_catalog/router.py — Repair services catalog. Public read-only."""
import logging

from core.database import supabase
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/repair-services", tags=["Repair Services"])


@router.get("/categories")
def get_categories():
    """Get all distinct repair service categories."""
    try:
        resp = supabase.table("repair_services").select("service_category").eq("is_active", True).execute()
        cats = sorted(set(r["service_category"] for r in (resp.data or []) if r.get("service_category")))
        return {"data": cats, "count": len(cats)}
    except Exception as e:
        logger.error(f"Get repair categories error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def get_repair_services(
    category: str | None = Query(None),
    search:   str | None = Query(None),
    limit:    int | None = Query(None, ge=1),
):
    """Get active repair services with optional category/search filter."""
    try:
        q = supabase.table("repair_services").select("*").eq("is_active", True)
        if category:
            q = q.eq("service_category", category)
        if search:
            q = q.ilike("service_name", f"%{search}%")
        q = q.order("service_name")
        if limit:
            q = q.limit(limit)
        resp = q.execute()
        return {"data": resp.data or [], "count": len(resp.data or [])}
    except Exception as e:
        logger.error(f"Get repair services error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{service_id}")
def get_repair_service(service_id: str):
    """Get a single repair service by ID."""
    try:
        resp = supabase.table("repair_services").select("*").eq("id", service_id).single().execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Service not found")
        return resp.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get repair service error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
