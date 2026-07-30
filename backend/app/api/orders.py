from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from uuid import UUID
from app.services import order_service
from app.models.order import OrderCreate, StatusUpdate
from app.utils.exceptions import OrderNotFoundException, ProductNotFoundException, InsufficientStockException, DeliveryZoneNotFoundException
from app.api.admin_auth import get_current_admin
from app.utils.auth import decode_token
from app.utils.audit import log_action

router = APIRouter(prefix="/api/v1/orders", tags=["Orders"])
security = HTTPBearer(auto_error=False)


def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """Extract user_id from token if present, else None (guest checkout)."""
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    return payload.get("user_id") if payload else None


@router.post("", response_model=dict)
def create_order(order: OrderCreate, user_id: Optional[str] = Depends(get_optional_user)):
    """
    Create a new order.
    - Authenticated users earn loyalty points on delivery
    - Supports points redemption (min 1000 pts) via `redeem_points` field
    - Supports referral code via `referral_code` field
    """
    try:
        created = order_service.create_order(order, user_id=user_id)
        return created
    except (ProductNotFoundException, DeliveryZoneNotFoundException) as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InsufficientStockException as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
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
        log_action(admin, "order.status_update", f"order:{order_id}", {"status": status_update.status})
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
