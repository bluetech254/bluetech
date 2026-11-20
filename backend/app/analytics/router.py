"""
analytics/router.py — Visitor & funnel tracking endpoints.

Public endpoints (no auth):
  POST /api/v1/analytics/page-view   — called on every client page navigation
  POST /api/v1/analytics/cart-event  — called on cart/funnel actions

Admin endpoints (JWT required):
  GET  /api/v1/analytics/today       — today's visitor + funnel summary for Daily Ops

All public endpoints are fire-and-forget: they always return 200 and swallow
errors silently so a tracking failure can never break a user's page load.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Literal, Optional

from admin_auth.dependencies import get_current_admin
from core.db import db
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


# ── Inbound models ────────────────────────────────────────────────────────────

class PageViewEvent(BaseModel):
    session_id:   str              = Field(..., min_length=8, max_length=128)
    path:         str              = Field(..., max_length=500)
    referrer:     Optional[str]    = Field(None, max_length=500)
    device_type:  Optional[str]    = Field(None, max_length=20)
    utm_source:   Optional[str]    = Field(None, max_length=100)
    utm_medium:   Optional[str]    = Field(None, max_length=100)
    utm_campaign: Optional[str]    = Field(None, max_length=100)


# ── Public: record a page view ────────────────────────────────────────────────

@router.post("/page-view", status_code=200)
def record_page_view(body: PageViewEvent):
    """
    Called by the client on every page navigation.
    Upserts the visitor_session and inserts a page_views row.
    Never returns an error — analytics must not break page loads.
    """
    try:
        _upsert_session(body)
        _insert_page_view(body)
    except Exception as e:
        logger.warning(f"analytics/page-view write failed: {e}")
    return {"ok": True}


def _upsert_session(body: PageViewEvent) -> None:
    """Create session on first visit, increment page_count on subsequent ones."""
    existing = (
        db.table("visitor_sessions")
        .select("id, page_count")
        .eq("session_id", body.session_id)
        .limit(1)
        .execute()
    )
    now = datetime.now(timezone.utc).isoformat()

    if existing.data:
        db.table("visitor_sessions").update({
            "last_seen_at": now,
            "page_count":   existing.data[0]["page_count"] + 1,
        }).eq("session_id", body.session_id).execute()
    else:
        db.table("visitor_sessions").insert({
            "session_id":   body.session_id,
            "referrer":     body.referrer,
            "device_type":  body.device_type,
            "utm_source":   body.utm_source,
            "utm_medium":   body.utm_medium,
            "utm_campaign": body.utm_campaign,
        }).execute()


def _insert_page_view(body: PageViewEvent) -> None:
    db.table("page_views").insert({
        "session_id": body.session_id,
        "path":       body.path,
        "referrer":   body.referrer,
    }).execute()


# ── Public: record a cart / funnel event ─────────────────────────────────────

class CartEvent(BaseModel):
    session_id:    str     = Field(..., min_length=8, max_length=128)
    event_type:    Literal["add_to_cart", "remove_from_cart", "checkout_started", "checkout_completed"]
    product_id:    Optional[str]   = Field(None, max_length=128)
    product_title: Optional[str]   = Field(None, max_length=300)
    quantity:      Optional[int]   = Field(None, ge=1)
    value_kes:     Optional[float] = Field(None, ge=0)


@router.post("/cart-event", status_code=200)
def record_cart_event(body: CartEvent):
    """
    Called by the client on cart and checkout funnel actions.
    Never returns an error — analytics must not break user flows.
    """
    try:
        db.table("cart_events").insert({
            "session_id":    body.session_id,
            "event_type":    body.event_type,
            "product_id":    body.product_id,
            "product_title": body.product_title,
            "quantity":      body.quantity,
            "value_kes":     body.value_kes,
        }).execute()
    except Exception as e:
        logger.warning(f"analytics/cart-event write failed: {e}")
    return {"ok": True}


# ── Public: record a service wishlist event ──────────────────────────────────

class WishlistEvent(BaseModel):
    session_id:   str            = Field(..., min_length=8, max_length=128)
    event_type:   Literal["saved", "removed"]
    service_id:   str            = Field(..., max_length=128)
    service_name: Optional[str]  = Field(None, max_length=300)
    category:     Optional[str]  = Field(None, max_length=200)


@router.post("/wishlist-event", status_code=200)
def record_wishlist_event(body: WishlistEvent):
    """
    Called by the client when a user saves or removes a service from their wishlist.
    Fire-and-forget — never returns an error.
    """
    try:
        db.table("service_wishlist_events").insert({
            "session_id":   body.session_id,
            "event_type":   body.event_type,
            "service_id":   body.service_id,
            "service_name": body.service_name,
            "category":     body.category,
        }).execute()
    except Exception as e:
        logger.warning(f"analytics/wishlist-event write failed: {e}")
    return {"ok": True}


# ── Public: request a callback ────────────────────────────────────────────────

class CallbackRequest(BaseModel):
    session_id: str           = Field(..., min_length=8, max_length=128)
    phone:      str           = Field(..., min_length=9, max_length=20)
    note:       Optional[str] = Field(None, max_length=500)


@router.post("/callback-request", status_code=200)
def request_callback(body: CallbackRequest):
    """
    Called when a visitor requests a callback.
    Stores the request; admin sees it in Daily Ops Leads tab.
    Fire-and-forget on error.
    """
    try:
        db.table("callback_requests").insert({
            "session_id": body.session_id,
            "phone":      body.phone,
            "note":       body.note,
        }).execute()
    except Exception as e:
        logger.warning(f"analytics/callback-request write failed: {e}")
    return {"ok": True}


@router.get("/callbacks/today")
def get_today_callbacks(admin: dict = Depends(get_current_admin)):
    """Today's callback requests for the Daily Ops Leads view."""
    try:
        today     = date.today()
        day_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
        day_end   = day_start + timedelta(days=1)
        resp = (
            db.table("callback_requests")
            .select("id, phone, note, status, requested_at")
            .gte("requested_at", day_start.isoformat())
            .lt("requested_at",  day_end.isoformat())
            .order("requested_at", desc=True)
            .execute()
        )
        return {"data": resp.data or []}
    except Exception as e:
        logger.error(f"analytics/callbacks/today error: {e}")
        return {"data": []}


@router.patch("/callbacks/{callback_id}")
def update_callback_status(callback_id: str, body: dict, admin: dict = Depends(get_current_admin)):
    """Mark a callback as called or dismissed."""
    status = body.get("status")
    if status not in ("called", "dismissed", "pending"):
        from fastapi import HTTPException
        raise HTTPException(400, "Invalid status")
    try:
        db.table("callback_requests").update({"status": status}).eq("id", callback_id).execute()
        return {"ok": True}
    except Exception as e:
        logger.error(f"analytics/callbacks patch error: {e}")
        return {"ok": False}


# ── Admin: today's visitor summary ───────────────────────────────────────────

@router.get("/today")
def get_today_summary(admin: dict = Depends(get_current_admin)):
    """
    Returns today's visitor metrics for the Daily Ops Traffic tab.
    All times in UTC; the client formats to local.
    """
    try:
        today   = date.today()
        day_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
        day_end   = day_start + timedelta(days=1)

        sessions_resp = (
            db.table("visitor_sessions")
            .select("session_id, started_at, last_seen_at, referrer, utm_source, device_type, page_count")
            .gte("started_at", day_start.isoformat())
            .lt("started_at",  day_end.isoformat())
            .execute()
        )
        sessions = sessions_resp.data or []

        views_resp = (
            db.table("page_views")
            .select("session_id, path, viewed_at")
            .gte("viewed_at", day_start.isoformat())
            .lt("viewed_at",  day_end.isoformat())
            .execute()
        )
        views = views_resp.data or []

        # Cart / funnel events
        cart_resp = (
            db.table("cart_events")
            .select("session_id, event_type, product_id, product_title, quantity, value_kes, occurred_at")
            .gte("occurred_at", day_start.isoformat())
            .lt("occurred_at",  day_end.isoformat())
            .execute()
        )
        cart_events = cart_resp.data or []

        funnel = _funnel_summary(cart_events, len(sessions))

        # Service wishlist events
        wishlist_resp = (
            db.table("service_wishlist_events")
            .select("session_id, event_type, service_id, service_name, category, occurred_at")
            .gte("occurred_at", day_start.isoformat())
            .lt("occurred_at",  day_end.isoformat())
            .execute()
        )
        wishlist_events = wishlist_resp.data or []
        wishlist_summary = _wishlist_summary(wishlist_events)

        return {
            "date":            today.isoformat(),
            "unique_sessions": len(sessions),
            "total_page_views": len(views),
            "avg_pages_per_session": (
                round(sum(s["page_count"] for s in sessions) / len(sessions), 1)
                if sessions else 0
            ),
            "device_breakdown": _count_field(sessions, "device_type"),
            "top_pages":        _top_paths(views, limit=10),
            "referrer_breakdown": _referrer_groups(sessions),
            "utm_sources":      _count_field(sessions, "utm_source"),
            "hourly_sessions":  _hourly_buckets(sessions, day_start),
            "funnel":           funnel,
            "top_cart_products": _top_cart_products(cart_events),
            "wishlist":         wishlist_summary,
        }
    except Exception as e:
        logger.error(f"analytics/today error: {e}")
        return {
            "date": date.today().isoformat(),
            "unique_sessions": 0,
            "total_page_views": 0,
            "avg_pages_per_session": 0,
            "device_breakdown": {},
            "top_pages": [],
            "referrer_breakdown": {},
            "utm_sources": {},
            "hourly_sessions": [],
            "funnel": {"visitors": 0, "cart_adds": 0, "checkouts_started": 0, "checkouts_completed": 0, "cart_sessions": 0, "conversion_rate": 0},
            "top_cart_products": [],
            "wishlist": {"saves": 0, "removals": 0, "top_saved_services": []},
        }


def _count_field(rows: list, field: str) -> dict:
    out: dict = {}
    for r in rows:
        v = r.get(field) or "unknown"
        out[v] = out.get(v, 0) + 1
    return dict(sorted(out.items(), key=lambda x: -x[1]))


def _top_paths(views: list, limit: int = 10) -> list:
    counts: dict = {}
    for v in views:
        p = v.get("path", "/")
        counts[p] = counts.get(p, 0) + 1
    return [
        {"path": p, "views": c}
        for p, c in sorted(counts.items(), key=lambda x: -x[1])[:limit]
    ]


def _referrer_groups(sessions: list) -> dict:
    """
    Bucket raw referrers into named sources:
    google, instagram, facebook, tiktok, whatsapp, direct, other.
    """
    groups: dict = {}
    for s in sessions:
        ref = (s.get("referrer") or "").lower()
        utm = (s.get("utm_source") or "").lower()

        if utm:
            key = utm
        elif not ref:
            key = "direct"
        elif "google" in ref:
            key = "google"
        elif "instagram" in ref:
            key = "instagram"
        elif "facebook" in ref or "fb.com" in ref:
            key = "facebook"
        elif "tiktok" in ref:
            key = "tiktok"
        elif "whatsapp" in ref:
            key = "whatsapp"
        elif "youtube" in ref:
            key = "youtube"
        else:
            key = "other"

        groups[key] = groups.get(key, 0) + 1

    return dict(sorted(groups.items(), key=lambda x: -x[1]))


def _hourly_buckets(sessions: list, day_start: datetime) -> list:
    """Return 24-slot list: [{hour: 0, sessions: 3}, ...]"""
    buckets = [0] * 24
    for s in sessions:
        try:
            dt = datetime.fromisoformat(s["started_at"].replace("Z", "+00:00"))
            buckets[dt.hour] += 1
        except Exception:
            pass
    return [{"hour": h, "sessions": buckets[h]} for h in range(24)]


def _funnel_summary(events: list, total_visitors: int) -> dict:
    """
    Compute funnel counts from cart_events rows.
    cart_adds            — total add_to_cart events
    cart_sessions        — unique sessions that added anything
    checkouts_started    — unique sessions that reached checkout
    checkouts_completed  — unique sessions with a completed order
    conversion_rate      — checkouts_completed / total_visitors * 100
    """
    cart_adds    = sum(1 for e in events if e["event_type"] == "add_to_cart")
    cart_sess    = len({e["session_id"] for e in events if e["event_type"] == "add_to_cart"})
    started      = len({e["session_id"] for e in events if e["event_type"] == "checkout_started"})
    completed    = len({e["session_id"] for e in events if e["event_type"] == "checkout_completed"})
    conv         = round((completed / total_visitors * 100), 1) if total_visitors else 0

    return {
        "visitors":             total_visitors,
        "cart_adds":            cart_adds,
        "cart_sessions":        cart_sess,
        "checkouts_started":    started,
        "checkouts_completed":  completed,
        "conversion_rate":      conv,
    }


def _top_cart_products(events: list, limit: int = 8) -> list:
    """Products most frequently added to cart today."""
    counts: dict = {}
    for e in events:
        if e["event_type"] != "add_to_cart":
            continue
        title = e.get("product_title") or e.get("product_id") or "Unknown"
        if title not in counts:
            counts[title] = {"title": title, "adds": 0, "quantity": 0}
        counts[title]["adds"]     += 1
        counts[title]["quantity"] += e.get("quantity") or 1
    return sorted(counts.values(), key=lambda x: -x["adds"])[:limit]


def _wishlist_summary(events: list) -> dict:
    """Summarise service wishlist activity for today."""
    saves    = sum(1 for e in events if e["event_type"] == "saved")
    removals = sum(1 for e in events if e["event_type"] == "removed")
    counts: dict = {}
    for e in events:
        if e["event_type"] != "saved":
            continue
        name = e.get("service_name") or e.get("service_id") or "Unknown"
        counts[name] = counts.get(name, 0) + 1
    top = [{"name": k, "saves": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])[:8]]
    return {"saves": saves, "removals": removals, "top_saved_services": top}
