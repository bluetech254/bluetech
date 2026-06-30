from fastapi import APIRouter, HTTPException
from app.database import supabase

router = APIRouter(prefix="/api/v1/delivery-zones", tags=["Delivery Zones"])

@router.get("", response_model=dict)
def get_delivery_zones():
    """Get all active delivery zones"""
    try:
        response = supabase.table("delivery_zones").select("*").eq("is_active", True).execute()
        return {"data": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/seed")
def seed_delivery_zones():
    """Seed default delivery zones (admin only)"""
    try:
        zones = [
            {"zone_name": "Nairobi CBD", "delivery_fee": 200, "is_active": True},
            {"zone_name": "Westlands", "delivery_fee": 300, "is_active": True},
            {"zone_name": "Kilimani", "delivery_fee": 350, "is_active": True},
            {"zone_name": "Karen", "delivery_fee": 500, "is_active": True},
            {"zone_name": "Kileleshwa", "delivery_fee": 400, "is_active": True},
            {"zone_name": "Parklands", "delivery_fee": 350, "is_active": True},
            {"zone_name": "South B/C", "delivery_fee": 300, "is_active": True},
            {"zone_name": "Ruaka", "delivery_fee": 450, "is_active": True},
            {"zone_name": "Rongai", "delivery_fee": 400, "is_active": True},
            {"zone_name": "Ngong Road", "delivery_fee": 350, "is_active": True},
        ]
        
        response = supabase.table("delivery_zones").insert(zones).execute()
        return {"message": f"Added {len(response.data)} delivery zones", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
