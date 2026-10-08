"""delivery/router.py — Delivery zones. Public read-only."""
import logging

from core.db import db
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/delivery-zones", tags=["Delivery Zones"])


@router.get("")
def get_delivery_zones():
    """Get all active delivery zones with their fees."""
    try:
        resp = db.table("delivery_zones").select("*").eq("is_active", True).order("zone_name").execute()
        return {"data": resp.data or [], "count": len(resp.data or [])}
    except Exception as e:
        logger.error(f"Get delivery zones error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
