"""
orders/service.py — Orders domain business logic.

Imports from:
  core/database       — DB clients
  core/exceptions     — typed exceptions
  notifications/sms   — SMS confirmations
  products/service    — stock check (read only, no circular writes)

Points logic is called here but lives in points/ — we import the
function directly. No inline DB queries for points.
"""
import math
import logging
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from core.database import supabase, supabase_admin
from core.exceptions import (
    ProductNotFoundException,
    InsufficientStockException,
    DeliveryZoneNotFoundException,
    OrderNotFoundException,
)
from notifications.sms import send_sms
from orders.models import OrderCreate, OrderItemCreate

logger = logging.getLogger(__name__)


# ── Internal helpers ──────────────────────────────────────────────────────────

def _fetch_products(item_ids: List[str]) -> dict:
    resp = supabase.table("products").select("*").in_("id", item_ids).execute()
    return {p["id"]: p for p in (resp.data or [])}


def _get_delivery_fee(zone_name: str) -> Decimal:
    resp = (
        supabase.table("delivery_zones")
        .select("delivery_fee")
        .eq("zone_name", zone_name)
        .eq("is_active", True)
        .single()
        .execute()
    )
    if not resp.data:
        raise DeliveryZoneNotFoundException(f"Delivery zone '{zone_name}' not found")
    return Decimal(str(resp.data["delivery_fee"]))


def _check_stock(items: List[OrderItemCreate], products: dict):
    for item in items:
        p = products.get(str(item.product_id))
        if not p:
            raise ProductNotFoundException(f"Product {item.product_id} not found")
        if p["stock_quantity"] < item.quantity:
            raise InsufficientStockException(
                f"Insufficient stock for '{p['title']}'. "
                f"Available: {p['stock_quantity']}, requested: {item.quantity}"
            )


def _decrement_stock(items: List[OrderItemCreate], products: dict):
    for item in items:
        p = products[str(item.product_id)]
        new_qty = p["stock_quantity"] - item.quantity
        supabase_admin.table("products").update(
            {"stock_quantity": new_qty}
        ).eq("id", str(item.product_id)).execute()


def _resolve_referral(referral_code: Optional[str], user_id: Optional[str]) -> Optional[str]:
    """Return referrer user_id from code or from user profile. Never returns self."""
    referrer_id = None

    if referral_code and user_id:
        resp = supabase.table("users").select("id").eq("referral_code", referral_code.upper()).execute()
        if resp.data:
            referrer_id = resp.data[0]["id"]

    # Fallback: use referred_by from user profile
    if not referrer_id and user_id:
        resp = supabase_admin.table("users").select("referred_by").eq("id", user_id).single().execute()
        if resp.data:
            referrer_id = resp.data.get("referred_by")

    # Never refer yourself
    if referrer_id == user_id:
        referrer_id = None

    return referrer_id


# ── Public service functions ──────────────────────────────────────────────────

def create_order(order_data: OrderCreate, user_id: Optional[str] = None) -> dict:
    """
    Create a new order.
    - Validates stock before insert
    - Handles points redemption (deducts immediately)
    - Decrements stock on each product
    - Awards referral bonus at delivery (stored as referrer_id on order)
    - Sends SMS confirmation
    """
    product_ids = [str(i.product_id) for i in order_data.items]
    products    = _fetch_products(product_ids)

    # Validate all products exist and have enough stock
    _check_stock(order_data.items, products)

    # Calculate subtotal
    line_items = []
    subtotal   = Decimal(0)
    for item in order_data.items:
        p           = products[str(item.product_id)]
        unit_price  = Decimal(str(p["price"]))
        total_price = unit_price * item.quantity
        subtotal   += total_price
        line_items.append({
            "product_id":    str(item.product_id),
            "product_title": p["title"],
            "quantity":      item.quantity,
            "unit_price":    unit_price,
            "total_price":   total_price,
        })

    delivery_fee    = _get_delivery_fee(order_data.delivery_zone)
    points_discount = Decimal(0)

    # Points redemption
    if order_data.redeem_points and user_id:
        from core.database import supabase_admin as sb
        user_r    = sb.table("users").select("points").eq("id", user_id).single().execute()
        current   = user_r.data.get("points", 0) if user_r.data else 0
        if current < order_data.redeem_points:
            raise ValueError(f"Insufficient points. You have {current}, requested {order_data.redeem_points}")
        # 10 pts = KES 1
        kes_value       = Decimal(str(round(order_data.redeem_points * 0.1, 2)))
        points_discount = min(kes_value, subtotal)   # never discount more than subtotal

    # Points-only payment — must cover full subtotal
    if order_data.payment_method == "points_only":
        if not user_id:
            raise ValueError("Must be logged in to pay with points")
        if not order_data.redeem_points:
            raise ValueError("redeem_points must be set for points_only payment")
        if points_discount < subtotal:
            pts_needed = math.ceil(float(subtotal) / 0.1)
            raise ValueError(f"Need {pts_needed} points to cover KES {float(subtotal):.2f}")

    total_amount = subtotal - points_discount + delivery_fee
    referrer_id  = _resolve_referral(order_data.referral_code, user_id)

    order_row = {
        "full_name":        order_data.full_name,
        "phone_number":     order_data.phone_number,
        "email":            order_data.email,
        "delivery_address": order_data.delivery_address,
        "delivery_zone":    order_data.delivery_zone,
        "delivery_fee":     float(delivery_fee),
        "subtotal":         float(subtotal),
        "points_discount":  float(points_discount),
        "total_amount":     float(total_amount),
        "status":           "pending",
        "payment_method":   order_data.payment_method,
        "payment_status":   "paid" if order_data.payment_method == "points_only" else "unpaid",
        "notes":            order_data.notes,
        "user_id":          user_id,
        "referrer_id":      referrer_id,
        "points_redeemed":  int(order_data.redeem_points or 0),
    }

    order_resp = supabase.table("orders").insert(order_row).execute()
    order      = order_resp.data[0]
    order_id   = order["id"]

    # Insert order items
    items_rows = [{
        "order_id":      order_id,
        "product_id":    li["product_id"],
        "product_title": li["product_title"],
        "quantity":      li["quantity"],
        "unit_price":    float(li["unit_price"]),
        "total_price":   float(li["total_price"]),
    } for li in line_items]
    supabase.table("order_items").insert(items_rows).execute()

    # Decrement stock
    _decrement_stock(order_data.items, products)

    # Deduct redeemed points
    if points_discount > 0 and user_id:
        pts = int(order_data.redeem_points)
        sb = supabase_admin
        user_r  = sb.table("users").select("points").eq("id", user_id).single().execute()
        current = user_r.data.get("points", 0) if user_r.data else 0
        sb.table("users").update({"points": current - pts}).eq("id", user_id).execute()
        sb.table("points_ledger").insert({
            "user_id":     user_id,
            "points":      -pts,
            "type":        "redemption",
            "description": f"Redeemed {pts} points on order #{order_id[:8].upper()}",
            "order_id":    order_id,
        }).execute()

    # SMS confirmation
    try:
        short_id     = order_id[:8].upper()
        items_text   = ", ".join(f"{li['product_title']} x{li['quantity']}" for li in line_items)
        send_sms(
            order_data.phone_number,
            f"BlueTech Order Confirmed!\n"
            f"Order #{short_id}\n"
            f"Items: {items_text}\n"
            f"Subtotal: KES {float(subtotal):,.0f}\n"
            f"Delivery: KES {float(delivery_fee):,.0f}\n"
            f"Total: KES {float(total_amount):,.0f}\n"
            f"We'll contact you to confirm delivery. Thank you!"
        )
    except Exception:
        pass

    return order


def get_order_by_id(order_id: UUID) -> dict:
    resp = supabase.table("orders").select("*, order_items(*)").eq("id", str(order_id)).single().execute()
    if not resp.data:
        raise OrderNotFoundException(f"Order {order_id} not found")
    return resp.data


def get_orders(status: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[dict]:
    q = supabase_admin.table("orders").select("*, order_items(*)")
    if status:
        q = q.eq("status", status)
    resp = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return resp.data or []


def update_order_status(order_id: UUID, status: str) -> dict:
    """Update status. Awards loyalty + referral points on delivery."""
    resp = supabase_admin.table("orders").update({"status": status}).eq("id", str(order_id)).execute()
    if not resp.data:
        raise OrderNotFoundException(f"Order {order_id} not found")
    order = resp.data[0]

    if status == "delivered":
        _handle_delivery_rewards(order)

    return order


def _handle_delivery_rewards(order: dict):
    """Award 10% loyalty points to buyer and referral bonus on first order."""
    user_id  = order.get("user_id")
    subtotal = float(order.get("subtotal", 0))
    order_id = order["id"]

    if user_id and subtotal > 0:
        import math as _math
        earned = _math.floor(subtotal * 0.10)
        if earned > 0:
            sb = supabase_admin
            u  = sb.table("users").select("points").eq("id", user_id).single().execute()
            current = u.data.get("points", 0) if u.data else 0
            sb.table("users").update({"points": current + earned}).eq("id", user_id).execute()
            sb.table("points_ledger").insert({
                "user_id":     user_id,
                "points":      earned,
                "type":        "order_earn",
                "description": f"Earned {earned} points on order #{order_id[:8].upper()}",
                "order_id":    order_id,
            }).execute()

    # Referral bonus — first delivered order only
    referrer_id = order.get("referrer_id")
    if referrer_id and user_id:
        prev = supabase_admin.table("orders") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("status", "delivered") \
            .neq("id", order_id) \
            .execute()
        if not prev.data:
            buyer = supabase_admin.table("users").select("full_name").eq("id", user_id).single().execute()
            name  = buyer.data.get("full_name", "A customer") if buyer.data else "A customer"
            sb    = supabase_admin
            ref_u = sb.table("users").select("points").eq("id", referrer_id).single().execute()
            ref_pts = ref_u.data.get("points", 0) if ref_u.data else 0
            sb.table("users").update({"points": ref_pts + 50}).eq("id", referrer_id).execute()
            sb.table("points_ledger").insert({
                "user_id":     referrer_id,
                "points":      50,
                "type":        "referral_earn",
                "description": f"Referral bonus — {name}'s first order delivered",
            }).execute()


def track_orders_by_phone(phone: str) -> List[dict]:
    resp = supabase.table("orders").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
    return resp.data or []
