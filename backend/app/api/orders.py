from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from uuid import UUID
from app.services import order_service
from app.models.order import OrderCreate, StatusUpdate
from app.utils.exceptions import OrderNotFoundException, ProductNotFoundException, InsufficientStockException, DeliveryZoneNotFoundException
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/api/v1/orders", tags=["Orders"])

@router.post("", response_model=dict)
def create_order(order: OrderCreate):
    """Create new order"""
    try:
        created = order_service.create_order(order)
        return created
    except (ProductNotFoundException, DeliveryZoneNotFoundException) as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InsufficientStockException as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=dict)
def get_orders(status: Optional[str] = Query(None, description="Filter by status")):
    """Get all orders (Admin)"""
    try:
        orders = order_service.get_orders(status=status)
        return {"data": orders, "count": len(orders)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{order_id}", response_model=dict)
def get_order(order_id: UUID):
    """Get order by ID"""
    try:
        order = order_service.get_order_by_id(order_id)
        return order
    except OrderNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{order_id}/status", response_model=dict)
def update_order_status(order_id: UUID, status_update: StatusUpdate, admin: dict = Depends(get_current_admin)):
    """Update order status (Admin)"""
    try:
        updated = order_service.update_order_status(order_id, status_update.status)
        return updated
    except OrderNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/track/{phone}", response_model=dict)
def track_orders(phone: str):
    """Track orders by phone number"""
    try:
        orders = order_service.track_orders_by_phone(phone)
        return {"data": orders, "count": len(orders)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
