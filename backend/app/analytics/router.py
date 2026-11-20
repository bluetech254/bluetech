"""
analytics/router.py — Visitor & funnel tracking endpoints.

Public endpoints (no auth):
  POST /api/v1/analytics/page-view   — called on every client page navigation

Admin endpoints (JWT required):
  GET  /api/v1/analytics/today       — today's visitor summary for Daily Ops

All public endpoints are fire-and-forget: they always return 200 and swallow
errors silently so a tracking failure can never break a user's page load.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

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
