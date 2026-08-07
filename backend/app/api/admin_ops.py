"""
Admin operations router — analytics, stock, export, bulk actions,
referral tracking, customer history, global search, audit log.
All endpoints require admin JWT.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from app.database import supabase_admin
from app.api.admin_auth import get_current_admin
from app.utils.audit import log_action
from datetime import datetime, timedelta
import io, csv

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Operations"])


# ── 1. ANALYTICS / DASHBOARD STATS ───────────────────────────────────────────

@router.get("/dashboard")
def admin_dashboard(admin: dict = Depends(get_current_admin)):
    """
    Full dashboard stats — today's metrics, revenue breakdown,
    top products, active repair queue, low-stock alerts.
    """
    today = datetime.utcnow().date().isoformat()

    orders_r   = supabase_admin.table("orders").select("*, order_items(*)").execute()
    bookings_r = supabase_admin.table("bookings").select("*").execute()
    products_r = supabase_admin.table("products").select("id,title,stock_quantity,low_stock_threshold,is_active").eq("is_active", True).execute()
    users_r    = supabase_admin.table("users").select("id,created_at").execute()

    orders   = orders_r.data or []
    bookings = bookings_r.data or []
    products = products_r.data or []
    users    = users_r.data or []

    # Accept both today and yesterday UTC to cover EAT (UTC+3) timezone
    from datetime import timezone, timedelta
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()
    today_dates = {today, yesterday}

    # Today filters
    orders_today   = [o for o in orders   if (o.get("created_at") or "")[:10] in today_dates]
    bookings_today = [b for b in bookings if (b.get("created_at") or "")[:10] in today_dates]
    users_today    = [u for u in users    if (u.get("created_at") or "")[:10] in today_dates]

    # Revenue — only paid transactions
    order_revenue   = sum(float(o.get("total_amount", 0) or 0) for o in orders if o.get("payment_status") == "paid")
    booking_commitment = sum(float(b.get("commitment_fee", 0) or 0) for b in bookings if b.get("commitment_payment_status") == "paid")
    booking_final   = sum(
        max(0, float(b.get("final_cost") or b.get("estimated_cost") or 0) - float(b.get("commitment_fee") or 0))
        for b in bookings if b.get("final_payment_status") == "paid"
    )
    booking_revenue = booking_commitment + booking_final

    # Today's revenue — orders + booking payments
    revenue_today = (
        sum(float(o.get("total_amount", 0) or 0) for o in orders_today if o.get("payment_status") == "paid") +
        sum(float(b.get("commitment_fee", 0) or 0) for b in bookings_today if b.get("commitment_payment_status") == "paid") +
        sum(
            max(0, float(b.get("final_cost") or b.get("estimated_cost") or 0) - float(b.get("commitment_fee") or 0))
            for b in bookings_today if b.get("final_payment_status") == "paid"
        )
    )

    # Active repair queue
    active_statuses = {"pending", "confirmed", "picked_up", "in_diagnosis", "in_repair"}
    active_queue = [b for b in bookings if b.get("status") in active_statuses]

    # Low stock
    low_stock = [
        {"id": p["id"], "title": p["title"], "stock": p["stock_quantity"], "threshold": p["low_stock_threshold"]}
        for p in products if p["stock_quantity"] <= p["low_stock_threshold"]
    ]

    # Revenue by day — last 30 days, orders + completed booking payments
    from collections import defaultdict
    daily = defaultdict(float)
    for o in orders:
        if o.get("payment_status") == "paid":
            day = (o.get("created_at") or "")[:10]
            if day:
                daily[day] += float(o.get("total_amount", 0) or 0)
    for b in bookings:
        if b.get("commitment_payment_status") == "paid":
            day = (b.get("created_at") or "")[:10]
            if day:
                daily[day] += float(b.get("commitment_fee", 0) or 0)
        if b.get("final_payment_status") == "paid":
            day = (b.get("created_at") or "")[:10]
            if day:
                total = float(b.get("final_cost") or b.get("estimated_cost") or 0)
                commitment = float(b.get("commitment_fee") or 0)
                daily[day] += max(0, total - commitment)
    revenue_chart = [{"date": k, "revenue": v} for k, v in sorted(daily.items())[-30:]]

    # Order status breakdown
    status_counts = defaultdict(int)
    for o in orders:
        status_counts[o.get("status", "unknown")] += 1

    return {
        "today": {
            "orders":   len(orders_today),
            "bookings": len(bookings_today),
            "revenue":  revenue_today,
            "new_users": len(users_today),
        },
        "totals": {
            "orders":          len(orders),
            "bookings":        len(bookings),
            "products":        len(products),
            "users":           len(users),
            "order_revenue":   order_revenue,
            "booking_revenue": booking_revenue,
            "total_revenue":   order_revenue + booking_revenue,
        },
        "active_repair_queue": len(active_queue),
        "low_stock_alerts":    low_stock,
        "order_status_breakdown": dict(status_counts),
        "revenue_chart":       revenue_chart,
        "recent_orders":       sorted(orders,   key=lambda x: x.get("created_at",""), reverse=True)[:50],
        "recent_bookings":     sorted(bookings, key=lambda x: x.get("created_at",""), reverse=True)[:20],
    }


# ── 2. STOCK ALERTS ───────────────────────────────────────────────────────────

@router.get("/stock/alerts")
def stock_alerts(admin: dict = Depends(get_current_admin)):
    """Products at or below their low_stock_threshold."""
    r = supabase_admin.table("products")\
        .select("id,title,stock_quantity,low_stock_threshold,category,brand")\
        .eq("is_active", True).execute()
    alerts = [p for p in (r.data or []) if p["stock_quantity"] <= p["low_stock_threshold"]]
    return {"data": alerts, "count": len(alerts)}


@router.put("/stock/{product_id}/threshold")
def set_stock_threshold(product_id: str, threshold: int, admin: dict = Depends(get_current_admin)):
    """Update low-stock alert threshold for a product."""
    supabase_admin.table("products").update({"low_stock_threshold": threshold}).eq("id", product_id).execute()
    log_action(admin, "product.threshold_update", f"product:{product_id}", {"threshold": threshold})
    return {"message": "Threshold updated"}


# ── 3. CSV EXPORT ─────────────────────────────────────────────────────────────

@router.get("/export/orders")
def export_orders_csv(
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Download all orders as CSV. Supports status and date range filters."""
    q = supabase_admin.table("orders").select("*")
    if status:
        q = q.eq("status", status)
    if date_from:
        q = q.gte("created_at", date_from)
    if date_to:
        q = q.lte("created_at", date_to + "T23:59:59")
    orders = q.order("created_at", desc=True).execute().data or []

    fields = ["id","full_name","phone_number","email","delivery_zone","delivery_address",
              "subtotal","delivery_fee","points_discount","total_amount",
              "status","payment_status","payment_method","notes","created_at"]

    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    w.writerows(orders)

    log_action(admin, "export.orders_csv", detail={"count": len(orders)})
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders.csv"}
    )


@router.get("/export/bookings")
def export_bookings_csv(
    status: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Download all bookings as CSV."""
    q = supabase_admin.table("bookings").select("*")
    if status:
        q = q.eq("status", status)
    bookings = q.order("created_at", desc=True).execute().data or []

    fields = ["id","full_name","phone_number","device_type","device_model",
              "issue_description","fulfillment_type","status",
              "estimated_cost","final_cost","internal_notes","created_at"]

    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    w.writerows(bookings)

    log_action(admin, "export.bookings_csv", detail={"count": len(bookings)})
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bookings.csv"}
    )


# ── 3b. TRANSACTIONS ──────────────────────────────────────────────────────────

@router.get("/transactions")
def get_transactions(admin: dict = Depends(get_current_admin)):
    """
    Unified transaction list — all paid orders + all bookings with any payment.
    Returns newest first.
    """
    orders_r   = supabase_admin.table("orders").select("*, order_items(*)").execute()
    bookings_r = supabase_admin.table("bookings").select("*").execute()

    txns = []

    for o in (orders_r.data or []):
        txns.append({
            "id":           o["id"],
            "type":         "order",
            "ref":          f"ORD-{o['id'][:8].upper()}",
            "customer":     o.get("full_name", ""),
            "phone":        o.get("phone_number", ""),
            "amount":       float(o.get("total_amount") or 0),
            "payment_status": o.get("payment_status", "unpaid"),
            "mpesa_receipt":  o.get("mpesa_receipt"),
            "status":       o.get("status"),
            "payment_method": o.get("payment_method"),
            "created_at":   o.get("created_at"),
            "detail": {
                "subtotal":        float(o.get("subtotal") or 0),
                "delivery_fee":    float(o.get("delivery_fee") or 0),
                "points_discount": float(o.get("points_discount") or 0),
                "delivery_zone":   o.get("delivery_zone"),
                "delivery_address":o.get("delivery_address"),
                "notes":           o.get("notes"),
                "items":           o.get("order_items", []),
            }
        })

    for b in (bookings_r.data or []):
        # commitment payment
        if b.get("commitment_payment_status") in ("paid", "pending", "failed"):
            txns.append({
                "id":           f"{b['id']}-cmt",
                "type":         "booking_commitment",
                "ref":          f"CMT-{b['id'][:8].upper()}",
                "customer":     b.get("full_name", ""),
                "phone":        b.get("phone_number", ""),
                "amount":       float(b.get("commitment_fee") or 0),
                "payment_status": b.get("commitment_payment_status", "unpaid"),
                "mpesa_receipt":  b.get("commitment_receipt"),
                "status":       b.get("status"),
                "payment_method": "mpesa",
                "created_at":   b.get("created_at"),
                "detail": {
                    "device":      f"{b.get('device_type','')} {b.get('device_model','')}".strip(),
                    "issue":       b.get("issue_description"),
                    "estimated_cost": float(b.get("estimated_cost") or 0),
                    "final_cost":     float(b.get("final_cost") or 0),
                    "booking_id":  b["id"],
                }
            })
        # final payment
        if b.get("final_payment_status") in ("paid", "pending", "failed"):
            txns.append({
                "id":           f"{b['id']}-fnl",
                "type":         "booking_final",
                "ref":          f"FNL-{b['id'][:8].upper()}",
                "customer":     b.get("full_name", ""),
                "phone":        b.get("phone_number", ""),
                "amount":       float((b.get("final_cost") or b.get("estimated_cost") or 0)) - float(b.get("commitment_fee") or 0),
                "payment_status": b.get("final_payment_status", "unpaid"),
                "mpesa_receipt":  b.get("final_receipt"),
                "status":       b.get("status"),
                "payment_method": "mpesa",
                "created_at":   b.get("created_at"),
                "detail": {
                    "device":      f"{b.get('device_type','')} {b.get('device_model','')}".strip(),
                    "issue":       b.get("issue_description"),
                    "estimated_cost": float(b.get("estimated_cost") or 0),
                    "final_cost":     float(b.get("final_cost") or 0),
                    "booking_id":  b["id"],
                }
            })

    txns.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {"data": txns, "count": len(txns)}



class BulkStatusUpdate(BaseModel):
    order_ids: List[str]
    status: str


@router.post("/orders/bulk-status")
def bulk_update_order_status(body: BulkStatusUpdate, admin: dict = Depends(get_current_admin)):
    """Update status on multiple orders at once."""
    if not body.order_ids:
        raise HTTPException(status_code=400, detail="No order IDs provided")

    supabase_admin.table("orders")\
        .update({"status": body.status})\
        .in_("id", body.order_ids).execute()

    log_action(admin, "order.bulk_status_update",
               detail={"ids": body.order_ids, "status": body.status})
    return {"message": f"Updated {len(body.order_ids)} orders to '{body.status}'"}


# ── 5. REFERRAL TRACKING ──────────────────────────────────────────────────────

@router.get("/referrals")
def referral_overview(admin: dict = Depends(get_current_admin)):
    """
    Referral leaderboard — users ranked by number of successful referrals,
    with total referral points awarded.
    """
    users_r = supabase_admin.table("users")\
        .select("id,full_name,phone_number,referral_code,points,referred_by")\
        .execute()
    users = users_r.data or []

    # Count how many users each person referred
    from collections import defaultdict
    referral_counts = defaultdict(int)
    for u in users:
        if u.get("referred_by"):
            referral_counts[u["referred_by"]] += 1

    user_map = {u["id"]: u for u in users}
    leaderboard = []
    for uid, count in sorted(referral_counts.items(), key=lambda x: -x[1]):
        u = user_map.get(uid, {})
        leaderboard.append({
            "user_id":       uid,
            "full_name":     u.get("full_name"),
            "phone_number":  u.get("phone_number"),
            "referral_code": u.get("referral_code"),
            "referrals":     count,
            "points_balance": u.get("points", 0),
        })

    return {
        "total_referrals": sum(referral_counts.values()),
        "leaderboard": leaderboard,
    }


@router.get("/referrals/user/{user_id}")
def user_referral_detail(user_id: str, admin: dict = Depends(get_current_admin)):
    """All users referred by a specific user."""
    r = supabase_admin.table("users")\
        .select("id,full_name,phone_number,created_at,points")\
        .eq("referred_by", user_id).execute()
    return {"data": r.data or [], "count": len(r.data or [])}


# ── 6. CUSTOMER HISTORY ───────────────────────────────────────────────────────

@router.get("/customers/{user_id}/history")
def customer_history(user_id: str, admin: dict = Depends(get_current_admin)):
    """Full profile + all orders + all bookings + points history for one customer."""
    user_r    = supabase_admin.table("users").select("*").eq("id", user_id).single().execute()
    orders_r  = supabase_admin.table("orders").select("*, order_items(*)").eq("user_id", user_id).order("created_at", desc=True).execute()
    bookings_r= supabase_admin.table("bookings").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    points_r  = supabase_admin.table("points_ledger").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()

    if not user_r.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_r.data
    user.pop("password", None)
    user.pop("verification_code", None)
    user.pop("reset_code", None)

    orders = orders_r.data or []
    return {
        "user":    user,
        "summary": {
            "total_orders":    len(orders),
            "total_spent":     sum(o.get("total_amount", 0) for o in orders if o.get("payment_status") == "paid"),
            "total_bookings":  len(bookings_r.data or []),
            "points_balance":  user.get("points", 0),
        },
        "orders":   orders,
        "bookings": bookings_r.data or [],
        "points_history": points_r.data or [],
    }


# ── 7. GLOBAL SEARCH ──────────────────────────────────────────────────────────

@router.get("/search")
def global_search(q: str = Query(..., min_length=2), admin: dict = Depends(get_current_admin)):
    """
    Search across orders, bookings, and users by phone number, name, or ID fragment.
    """
    term = q.strip()

    # Users — by phone or name
    users_r = supabase_admin.table("users")\
        .select("id,full_name,phone_number,email,points,created_at")\
        .or_(f"phone_number.ilike.%{term}%,full_name.ilike.%{term}%,email.ilike.%{term}%")\
        .limit(10).execute()

    # Orders — by phone, name, or id prefix
    orders_r = supabase_admin.table("orders")\
        .select("id,full_name,phone_number,total_amount,status,payment_status,created_at")\
        .or_(f"phone_number.ilike.%{term}%,full_name.ilike.%{term}%")\
        .limit(10).execute()

    # Bookings — by phone, name, device model
    bookings_r = supabase_admin.table("bookings")\
        .select("id,full_name,phone_number,device_type,device_model,status,created_at")\
        .or_(f"phone_number.ilike.%{term}%,full_name.ilike.%{term}%,device_model.ilike.%{term}%")\
        .limit(10).execute()

    return {
        "query":    term,
        "users":    users_r.data or [],
        "orders":   orders_r.data or [],
        "bookings": bookings_r.data or [],
    }


# ── 8. AUDIT LOG ──────────────────────────────────────────────────────────────

@router.get("/audit-log")
def get_audit_log(
    limit: int = Query(50, le=200),
    admin_id: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Admin activity log — who did what and when."""
    q = supabase_admin.table("admin_audit_log").select("*")
    if admin_id:
        q = q.eq("admin_id", admin_id)
    r = q.order("created_at", desc=True).limit(limit).execute()
    return {"data": r.data or [], "count": len(r.data or [])}


# ── 9. DEVICE BRANDS / MODELS / SERVICE PRICING ───────────────────────────────

class BrandBody(BaseModel):
    name: str
    device_type: str = "multi"
    country_of_origin: Optional[str] = None
    is_popular: bool = False
    logo_url: Optional[str] = None
    is_active: bool = True

class ModelBody(BaseModel):
    brand_id: str
    name: str
    device_type: str
    release_year: Optional[int] = None
    is_active: bool = True

class PricingBody(BaseModel):
    service_id: str
    brand_id: Optional[str] = None
    model_id: Optional[str] = None
    price: float

@router.get("/devices/brands")
def admin_get_brands(admin: dict = Depends(get_current_admin)):
    r = supabase_admin.table("device_brands").select("*").order("name").execute()
    return {"data": r.data or []}

@router.post("/devices/brands")
def admin_create_brand(body: BrandBody, admin: dict = Depends(get_current_admin)):
    r = supabase_admin.table("device_brands").insert(body.model_dump()).execute()
    return {"data": r.data[0] if r.data else {}}

@router.put("/devices/brands/{brand_id}")
def admin_update_brand(brand_id: str, body: BrandBody, admin: dict = Depends(get_current_admin)):
    r = supabase_admin.table("device_brands").update(body.model_dump()).eq("id", brand_id).execute()
    return {"data": r.data[0] if r.data else {}}

@router.delete("/devices/brands/{brand_id}")
def admin_delete_brand(brand_id: str, admin: dict = Depends(get_current_admin)):
    supabase_admin.table("device_brands").delete().eq("id", brand_id).execute()
    return {"ok": True}

@router.get("/devices/models")
def admin_get_models(brand_id: Optional[str] = None, admin: dict = Depends(get_current_admin)):
    q = supabase_admin.table("device_models").select("*, device_brands(name)")
    if brand_id:
        q = q.eq("brand_id", brand_id)
    r = q.order("name").execute()
    return {"data": r.data or []}

@router.post("/devices/models")
def admin_create_model(body: ModelBody, admin: dict = Depends(get_current_admin)):
    r = supabase_admin.table("device_models").insert(body.model_dump()).execute()
    return {"data": r.data[0] if r.data else {}}

@router.put("/devices/models/{model_id}")
def admin_update_model(model_id: str, body: ModelBody, admin: dict = Depends(get_current_admin)):
    r = supabase_admin.table("device_models").update(body.model_dump()).eq("id", model_id).execute()
    return {"data": r.data[0] if r.data else {}}

@router.delete("/devices/models/{model_id}")
def admin_delete_model(model_id: str, admin: dict = Depends(get_current_admin)):
    supabase_admin.table("device_models").delete().eq("id", model_id).execute()
    return {"ok": True}

@router.get("/devices/pricing")
def admin_get_pricing(admin: dict = Depends(get_current_admin)):
    r = supabase_admin.table("service_pricing")\
        .select("*, repair_services(service_name), device_brands(name), device_models(name)")\
        .order("created_at", desc=True).execute()
    return {"data": r.data or []}

@router.post("/devices/pricing")
def admin_upsert_pricing(body: PricingBody, admin: dict = Depends(get_current_admin)):
    data = body.model_dump()
    # Delete any existing rule with same service+brand+model combo first (handles NULL uniqueness)
    q = supabase_admin.table("service_pricing").delete().eq("service_id", data["service_id"])
    if data["brand_id"]:
        q = q.eq("brand_id", data["brand_id"])
    else:
        q = q.is_("brand_id", "null")
    if data["model_id"]:
        q = q.eq("model_id", data["model_id"])
    else:
        q = q.is_("model_id", "null")
    q.execute()
    r = supabase_admin.table("service_pricing").insert(data).execute()
    return {"data": r.data[0] if r.data else {}}

@router.delete("/devices/pricing/{pricing_id}")
def admin_delete_pricing(pricing_id: str, admin: dict = Depends(get_current_admin)):
    supabase_admin.table("service_pricing").delete().eq("id", pricing_id).execute()
    return {"ok": True}
