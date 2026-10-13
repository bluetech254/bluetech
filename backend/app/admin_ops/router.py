"""
admin_ops/router.py — Admin operations: dashboard, stock, export, bulk actions,
referrals, customer history, global search, audit log, transactions.
All endpoints require admin JWT.
"""
import csv
import io
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Literal

from admin_auth.dependencies import get_current_admin
from core.audit import log_action
from core.db import db
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/admin", tags=["Admin Operations"])


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def admin_dashboard(admin: dict = Depends(get_current_admin)):
    """Full dashboard stats — today's metrics, revenue, repair queue, low-stock."""
    today     = datetime.utcnow().date().isoformat()
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()
    today_set = {today, yesterday}   # EAT = UTC+3

    orders_r   = db.table("orders").select("*")).execute()
    bookings_r = db.table("bookings").select("*").execute()
    products_r = db.table("products")\
        .select("id,title,stock_quantity,low_stock_threshold,is_active").eq("is_active", True).execute()
    users_r    = db.table("users").select("id,created_at").execute()

    orders   = orders_r.data or []
    bookings = bookings_r.data or []
    products = products_r.data or []
    users    = users_r.data or []

    orders_today   = [o for o in orders   if (o.get("created_at") or "")[:10] in today_set]
    bookings_today = [b for b in bookings if (b.get("created_at") or "")[:10] in today_set]
    users_today    = [u for u in users    if (u.get("created_at") or "")[:10] in today_set]

    order_revenue      = sum(float(o.get("total_amount", 0) or 0) for o in orders if o.get("payment_status") == "paid")
    booking_commitment = sum(float(b.get("commitment_fee", 0) or 0) for b in bookings if b.get("commitment_payment_status") == "paid")
    booking_final      = sum(
        max(0, float(b.get("final_cost") or b.get("estimated_cost") or 0) - float(b.get("commitment_fee") or 0))
        for b in bookings if b.get("final_payment_status") == "paid"
    )
    booking_revenue = booking_commitment + booking_final

    revenue_today = (
        sum(float(o.get("total_amount", 0) or 0) for o in orders_today if o.get("payment_status") == "paid") +
        sum(float(b.get("commitment_fee", 0) or 0) for b in bookings_today if b.get("commitment_payment_status") == "paid")
    )

    active_statuses = {"pending", "confirmed", "picked_up", "in_diagnosis", "in_repair"}
    low_stock = [
        {"id": p["id"], "title": p["title"], "stock": p["stock_quantity"], "threshold": p["low_stock_threshold"]}
        for p in products if p["stock_quantity"] <= p.get("low_stock_threshold", 5)
    ]

    daily = defaultdict(float)
    for o in orders:
        if o.get("payment_status") == "paid":
            day = (o.get("created_at") or "")[:10]
            if day:
                daily[day] += float(o.get("total_amount", 0) or 0)

    status_counts = defaultdict(int)
    for o in orders:
        status_counts[o.get("status", "unknown")] += 1

    return {
        "today":   {"orders": len(orders_today), "bookings": len(bookings_today), "revenue": revenue_today, "new_users": len(users_today)},
        "totals":  {"orders": len(orders), "bookings": len(bookings), "products": len(products), "users": len(users),
                    "order_revenue": order_revenue, "booking_revenue": booking_revenue, "total_revenue": order_revenue + booking_revenue},
        "active_repair_queue":    len([b for b in bookings if b.get("status") in active_statuses]),
        "low_stock_alerts":       low_stock,
        "order_status_breakdown": dict(status_counts),
        "revenue_chart":          [{"date": k, "revenue": v} for k, v in sorted(daily.items())[-30:]],
        "recent_orders":          sorted(orders,   key=lambda x: x.get("created_at", ""), reverse=True)[:50],
        "recent_bookings":        sorted(bookings, key=lambda x: x.get("created_at", ""), reverse=True)[:20],
    }


# ── Stock alerts ──────────────────────────────────────────────────────────────

@router.get("/stock/alerts")
def stock_alerts(admin: dict = Depends(get_current_admin)):
    r = db.table("products")\
        .select("id,title,stock_quantity,low_stock_threshold,specifications")\
        .eq("is_active", True).execute()
    alerts = []
    for p in (r.data or []):
        if p["stock_quantity"] <= p.get("low_stock_threshold", 5):
            specs = p.get("specifications") or {}
            if isinstance(specs, str):
                import json
                try:
                    specs = json.loads(specs)
                except Exception:
                    specs = {}
            alerts.append({
                "id":        p["id"],
                "title":     p["title"],
                "stock":     p["stock_quantity"],
                "threshold": p["low_stock_threshold"],
                "category":  specs.get("category"),
                "brand":     specs.get("brand"),
            })
    return {"data": alerts, "count": len(alerts)}


@router.put("/stock/{product_id}/threshold")
def set_stock_threshold(product_id: str, threshold: int, admin: dict = Depends(get_current_admin)):
    db.table("products").update({"low_stock_threshold": threshold}).eq("id", product_id).execute()
    log_action(admin, "product.threshold_update", f"product:{product_id}", {"threshold": threshold})
    return {"message": "Threshold updated"}


# ── CSV Export ────────────────────────────────────────────────────────────────

@router.get("/export/orders")
def export_orders_csv(
    status:    str | None = None,
    date_from: str | None = None,
    date_to:   str | None = None,
    admin: dict = Depends(get_current_admin),
):
    q = db.table("orders").select("*")
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
    w   = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    w.writerows(orders)
    log_action(admin, "export.orders_csv", detail={"count": len(orders)})
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=orders.csv"})


@router.get("/export/bookings")
def export_bookings_csv(status: str | None = None, admin: dict = Depends(get_current_admin)):
    q = db.table("bookings").select("*")
    if status:
        q = q.eq("status", status)
    bookings = q.order("created_at", desc=True).execute().data or []

    fields = ["id","full_name","phone_number","device_type","device_model",
              "issue_description","fulfillment_type","status",
              "estimated_cost","final_cost","internal_notes","created_at"]
    buf = io.StringIO()
    w   = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    w.writerows(bookings)
    log_action(admin, "export.bookings_csv", detail={"count": len(bookings)})
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=bookings.csv"})


# ── Transactions ──────────────────────────────────────────────────────────────

@router.get("/transactions")
def get_transactions(admin: dict = Depends(get_current_admin)):
    orders_r   = db.table("orders").select("*")).execute()
    bookings_r = db.table("bookings").select("*").execute()
    txns = []
    for o in (orders_r.data or []):
        txns.append({"id": o["id"], "type": "order", "ref": f"ORD-{o['id'][:8].upper()}",
                     "customer": o.get("full_name"), "phone": o.get("phone_number"),
                     "amount": float(o.get("total_amount") or 0),
                     "payment_status": o.get("payment_status", "unpaid"),
                     "payment_receipt": o.get("payment_receipt"), "status": o.get("status"),
                     "payment_method": o.get("payment_method"), "created_at": o.get("created_at"),
                     "detail": {"subtotal": float(o.get("subtotal") or 0),
                                "delivery_fee": float(o.get("delivery_fee") or 0),
                                "items": o.get("order_items", [])}})
    for b in (bookings_r.data or []):
        if b.get("commitment_payment_status") in ("paid","pending","failed"):
            txns.append({"id": f"{b['id']}-cmt", "type": "booking_commitment",
                         "ref": f"CMT-{b['id'][:8].upper()}", "customer": b.get("full_name"),
                         "phone": b.get("phone_number"), "amount": float(b.get("commitment_fee") or 0),
                         "payment_status": b.get("commitment_payment_status"),
                         "payment_receipt": b.get("commitment_receipt"), "status": b.get("status"),
                         "payment_method": "paystack", "created_at": b.get("created_at"),
                         "detail": {"device": f"{b.get('device_type','')} {b.get('device_model','')}".strip(),
                                    "booking_id": b["id"]}})
        if b.get("final_payment_status") in ("paid","pending","failed"):
            txns.append({"id": f"{b['id']}-fnl", "type": "booking_final",
                         "ref": f"FNL-{b['id'][:8].upper()}", "customer": b.get("full_name"),
                         "phone": b.get("phone_number"),
                         "amount": float(b.get("final_cost") or b.get("estimated_cost") or 0) - float(b.get("commitment_fee") or 0),
                         "payment_status": b.get("final_payment_status"),
                         "payment_receipt": b.get("final_receipt"), "status": b.get("status"),
                         "payment_method": "paystack", "created_at": b.get("created_at"),
                         "detail": {"device": f"{b.get('device_type','')} {b.get('device_model','')}".strip(),
                                    "booking_id": b["id"]}})
    txns.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {"data": txns, "count": len(txns)}


# ── Bulk order status ─────────────────────────────────────────────────────────

class BulkStatusUpdate(BaseModel):
    order_ids: list[str] = Field(..., min_length=1)
    status: Literal["pending", "confirmed", "processing", "dispatched", "delivered", "cancelled"]

@router.post("/orders/bulk-status")
def bulk_update_order_status(body: BulkStatusUpdate, admin: dict = Depends(get_current_admin)):
    if not body.order_ids:
        raise HTTPException(status_code=400, detail="No order IDs provided")
    db.table("orders").update({"status": body.status}).in_("id", body.order_ids).execute()
    log_action(admin, "order.bulk_status_update", detail={"ids": body.order_ids, "status": body.status})
    return {"message": f"Updated {len(body.order_ids)} orders to '{body.status}'"}


# ── Referral tracking ─────────────────────────────────────────────────────────

@router.get("/referrals")
def referral_overview(admin: dict = Depends(get_current_admin)):
    users = db.table("users")\
        .select("id,full_name,phone_number,referral_code,points,referred_by").execute().data or []
    counts   = defaultdict(int)
    user_map = {u["id"]: u for u in users}
    for u in users:
        if u.get("referred_by"):
            counts[u["referred_by"]] += 1
    leaderboard = [{"user_id": uid, "full_name": user_map.get(uid, {}).get("full_name"),
                    "phone_number": user_map.get(uid, {}).get("phone_number"),
                    "referral_code": user_map.get(uid, {}).get("referral_code"),
                    "referrals": c, "points_balance": user_map.get(uid, {}).get("points", 0)}
                   for uid, c in sorted(counts.items(), key=lambda x: -x[1])]
    return {"total_referrals": sum(counts.values()), "leaderboard": leaderboard}


@router.get("/referrals/user/{user_id}")
def user_referral_detail(user_id: str, admin: dict = Depends(get_current_admin)):
    r = db.table("users")\
        .select("id,full_name,phone_number,created_at,points").eq("referred_by", user_id).execute()
    return {"data": r.data or [], "count": len(r.data or [])}


# ── Customer history ──────────────────────────────────────────────────────────

@router.get("/customers/{user_id}/history")
def customer_history(user_id: str, admin: dict = Depends(get_current_admin)):
    try:
        user_r = db.table("users").select("*").eq("id", user_id).single().execute()
        user   = user_r.data
    except Exception:
        user = None
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    orders_r   = db.table("orders").select("*")).eq("user_id", user_id).order("created_at", desc=True).execute()
    bookings_r = db.table("bookings").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    points_r   = db.table("points_ledger").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    for f in ("password", "verification_code", "reset_code"):
        user.pop(f, None)
    orders = orders_r.data or []
    return {
        "user": user,
        "summary": {
            "total_orders":    len(orders),
            "total_spent":     sum(o.get("total_amount", 0) for o in orders if o.get("payment_status") == "paid"),
            "total_bookings":  len(bookings_r.data or []),
            "points_balance":  user.get("points", 0),
        },
        "orders":        orders,
        "bookings":      bookings_r.data or [],
        "points_history": points_r.data or [],
    }


# ── Global search ─────────────────────────────────────────────────────────────

@router.get("/search")
def global_search(q: str = Query(..., min_length=2), admin: dict = Depends(get_current_admin)):
    term = q.strip()
    users_r    = db.table("users")\
        .select("id,full_name,phone_number,email,points,created_at")\
        .or_(f"phone_number.ilike.%{term}%,full_name.ilike.%{term}%,email.ilike.%{term}%").limit(10).execute()
    orders_r   = db.table("orders")\
        .select("id,full_name,phone_number,total_amount,status,payment_status,created_at")\
        .or_(f"phone_number.ilike.%{term}%,full_name.ilike.%{term}%").limit(10).execute()
    bookings_r = db.table("bookings")\
        .select("id,full_name,phone_number,device_type,device_model,status,created_at")\
        .or_(f"phone_number.ilike.%{term}%,full_name.ilike.%{term}%,device_model.ilike.%{term}%").limit(10).execute()
    return {"query": term, "users": users_r.data or [], "orders": orders_r.data or [], "bookings": bookings_r.data or []}


# ── Audit log ─────────────────────────────────────────────────────────────────

@router.get("/audit-log")
def get_audit_log(
    limit:    int = Query(50, le=200),
    admin_id: str | None = None,
    admin: dict = Depends(get_current_admin),
):
    q = db.table("admin_audit_log").select("*")
    if admin_id:
        q = q.eq("admin_id", admin_id)
    r = q.order("created_at", desc=True).limit(limit).execute()
    return {"data": r.data or [], "count": len(r.data or [])}


# ── Booking internal notes ─────────────────────────────────────────────────────

class BookingNotesUpdate(BaseModel):
    internal_notes: str | None = None


@router.put("/bookings/{booking_id}/notes")
def update_booking_notes(
    booking_id: str,
    body: BookingNotesUpdate,
    admin: dict = Depends(get_current_admin),
):
    """Update internal notes for a booking. Admin only."""
    r = db.table("bookings") \
        .update({"internal_notes": body.internal_notes}) \
        .eq("id", booking_id).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    log_action(admin, "booking.notes_update", f"booking:{booking_id}", {})
    return {"ok": True}
