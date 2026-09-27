"""
orders/router.py — Orders HTTP routes.

Public:         POST /api/v1/orders (guest + authenticated)
                GET  /api/v1/orders/track/{phone}
Authenticated:  GET  /api/v1/orders/{id}  (owns order or guest)
                POST /api/v1/orders/{id}/cancel
Admin:          GET  /api/v1/orders
                PUT  /api/v1/orders/{id}/status
                DELETE /api/v1/orders/{id}
"""
import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Depends

from core.exceptions import (
    OrderNotFoundException,
    ProductNotFoundException,
    InsufficientStockException,
    DeliveryZoneNotFoundException,
)
from core.audit import log_action
from admin_auth.dependencies import get_current_admin
from auth.dependencies import get_optional_user
from orders.models import OrderCreate, StatusUpdate
from orders import service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/orders", tags=["Orders"])


@router.post("")
def create_order(body: OrderCreate, user_id: Optional[str] = Depends(get_optional_user)):
    """
    Create a new order. Works for guests and authenticated users.
    Authenticated users earn loyalty points on delivery.
    Supports points redemption and referral codes.
    """
    try:
        return service.create_order(body, user_id=user_id)
    except (ProductNotFoundException, DeliveryZoneNotFoundException) as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InsufficientStockException as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Create order error: {e}")
        raise HTTPException(status_code=500, detail="Order creation failed.")


@router.get("")
def get_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(get_current_admin),
):
    """Get all orders with pagination. Admin only."""
    orders = service.get_orders(status=status, limit=limit, offset=offset)
    return {"data": orders, "count": len(orders)}


@router.get("/track/{phone}")
def track_orders(phone: str):
    """Track orders by phone number. Public — no auth required."""
    orders = service.track_orders_by_phone(phone)
    return {"data": orders, "count": len(orders)}


@router.get("/{order_id}")
def get_order(order_id: UUID, user_id: Optional[str] = Depends(get_optional_user)):
    """
    Get a single order. If the caller is authenticated, enforces ownership.
    Guests can fetch any order by ID (for order success page).
    """
    try:
        order = service.get_order_by_id(order_id)
        if user_id and order.get("user_id") and str(order["user_id"]) != str(user_id):
            raise HTTPException(status_code=403, detail="Access denied")
        return order
    except OrderNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{order_id}/status")
def update_order_status(
    order_id: UUID,
    body: StatusUpdate,
    admin: dict = Depends(get_current_admin),
):
    """Update order status. Admin only. Awards points on delivery."""
    try:
        updated = service.update_order_status(order_id, body.status)
        log_action(admin, "order.status_update", f"order:{order_id}", {"status": body.status})
        return updated
    except OrderNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Update order status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{order_id}/cancel")
def cancel_order_client(order_id: UUID, user_id: Optional[str] = Depends(get_optional_user)):
    """Client: cancel their own pending order."""
    try:
        from core.database import supabase_admin as sb
        order = sb.table("orders").select("status, user_id").eq("id", str(order_id)).single().execute()
        if not order.data:
            raise HTTPException(status_code=404, detail="Order not found")
        if user_id and order.data.get("user_id") and str(order.data["user_id"]) != str(user_id):
            raise HTTPException(status_code=403, detail="Access denied")
        if order.data["status"] != "pending":
            raise HTTPException(status_code=400, detail=f"Cannot cancel an order with status '{order.data['status']}'")
        sb.table("orders").update({"status": "cancelled"}).eq("id", str(order_id)).execute()
        return {"message": "Order cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cancel order error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{order_id}")
def cancel_order_admin(order_id: UUID, admin: dict = Depends(get_current_admin)):
    """Admin: cancel/delete an order."""
    try:
        from core.database import supabase_admin as sb
        resp = sb.table("orders").update({"status": "cancelled"}).eq("id", str(order_id)).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Order not found")
        log_action(admin, "order.cancelled", f"order:{order_id}")
        return {"message": "Order cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin cancel order error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
