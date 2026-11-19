"""
link_tracking/service.py — click tracking for outbound "our links".
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

from core.db import db


def get_destination(slug: str) -> Optional[dict]:
    """Return the active destination row for a slug, or None."""
    resp = db.table("link_destinations").select("*").eq("slug", slug).eq("is_active", True).limit(1).execute()
    if not resp.data:
        return None
    return resp.data[0] if isinstance(resp.data, list) else resp.data


def record_click(slug: str, destination: str, referrer: Optional[str], user_agent: Optional[str], ip: Optional[str]) -> None:
    """Persist a single click event."""
    db.table("link_clicks").insert({
        "slug": slug,
        "destination": destination,
        "referrer": (referrer[:500] if referrer else None),
        "user_agent": (user_agent[:300] if user_agent else None),
        "ip_address": ip,
    }).execute()


def get_clicks_for_date(report_date: date) -> list:
    """Click counts per active destination for the given date."""
    start = datetime.combine(report_date, datetime.min.time())
    end = start + timedelta(days=1)

    resp = db.table("link_clicks").select("slug").gte("clicked_at", start).lt("clicked_at", end).execute()
    counts: dict = {}
    for row in (resp.data or []):
        s = row.get("slug")
        counts[s] = counts.get(s, 0) + 1

    dests = db.table("link_destinations").select("slug,label,destination").eq("is_active", True).execute()
    return [
        {
            "slug": d.get("slug"),
            "label": d.get("label"),
            "destination": d.get("destination"),
            "clicks": counts.get(d.get("slug"), 0),
        }
        for d in (dests.data or [])
    ]
