"""
customers/service.py — Customer 360 read layer.

Profiles are created automatically by DB triggers (see 032_customer_profiles.sql)
on insert into orders / bookings / contact_messages / daily_leads. This module
only READS them and computes aggregates on the fly. backfill_customers() is a
one-off to populate profiles from historical rows (run once after deploy).
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Optional

from core.db import db


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ser(obj):
    if isinstance(obj, list):
        return [_ser(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _ser(v) for k, v in obj.items()}
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return obj


def normalize_phone(raw: Optional[str]) -> Optional[str]:
    """Kenya phone -> 2547XXXXXXXX. Must match the SQL normalize_phone()."""
    if not raw:
        return None
    d = re.sub(r"\D", "", str(raw))
    if not d:
        return None
    if d.startswith("254"):
        d = d[3:]
    if d.startswith("0"):
        d = d[1:]
    if len(d) == 10 and d.startswith("0"):
        d = d[1:]
    if len(d) != 9:
        return None
    return "254" + d


def _variants(norm: Optional[str]) -> list:
    """Raw formats that map to a normalized phone, for matching source tables."""
    if not norm or not norm.startswith("254") or len(norm) != 12:
        return [norm] if norm else []
    local = norm[3:]                       # 712345678
    return [norm, "0" + local, "+254" + local, local]


def _count_by_phone(rows: list, col: str) -> dict:
    out: dict = {}
    for r in rows:
        n = normalize_phone(r.get(col))
        if n:
            out[n] = out.get(n, 0) + 1
    return out


def _spend_by_phone(rows: list, phone_col: str) -> dict:
    out: dict = {}
    for r in rows:
        n = normalize_phone(r.get(phone_col))
        if not n:
            continue
        if n not in out:
            out[n] = {"count": 0, "spend": 0.0}
        out[n]["count"] += 1
        if str(r.get("payment_status", "")).lower() == "paid":
            out[n]["spend"] += float(r.get("total_amount") or 0)
    return out


# ── List ─────────────────────────────────────────────────────────────────────

def list_customers(search: Optional[str] = None, page: int = 1, page_size: int = 25) -> dict:
    resp = db.table("customer_profiles").select("*").order("last_seen", desc=True).limit(2000).execute()
    profiles = resp.data or []

    if search:
        s = search.strip().lower()
        if s:
            profiles = [
                p for p in profiles
                if s in (p.get("phone") or "").lower()
                or s in (p.get("full_name") or "").lower()
                or s in (p.get("email") or "").lower()
            ]

    # Aggregates: fetch source rows once, group by normalized phone.
    orders = _spend_by_phone(
        db.table("orders").select("phone_number,total_amount,payment_status").execute().data or [],
        "phone_number",
    )
    bookings = _count_by_phone(
        db.table("bookings").select("phone_number").execute().data or [],
        "phone_number",
    )
    leads = _count_by_phone(
        db.table("daily_leads").select("phone").execute().data or [],
        "phone",
    )

    for p in profiles:
        n = p.get("phone")
        ov = orders.get(n, {})
        p["orders_count"] = ov.get("count", 0)
        p["total_spend"] = round(ov.get("spend", 0.0), 2)
        p["bookings_count"] = bookings.get(n, 0)
        p["leads_count"] = leads.get(n, 0)

    total = len(profiles)
    start = (page - 1) * page_size
    return {
        "items": profiles[start:start + page_size],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ── Detail ───────────────────────────────────────────────────────────────────

def get_customer(profile_id: str) -> Optional[dict]:
    resp = db.table("customer_profiles").select("*").eq("id", profile_id).limit(1).execute()
    if not resp.data:
        return None
    profile = resp.data[0] if isinstance(resp.data, list) else resp.data
    variants = _variants(profile.get("phone"))

    orders = bookings = contacts = leads = []
    if variants:
        orders = db.table("orders").select("*").in_("phone_number", variants).order("created_at", desc=True).execute().data or []
        bookings = db.table("bookings").select("*").in_("phone_number", variants).order("created_at", desc=True).execute().data or []
        contacts = db.table("contact_messages").select("*").in_("phone", variants).order("created_at", desc=True).execute().data or []
        leads = db.table("daily_leads").select("*").in_("phone", variants).order("created_at", desc=True).execute().data or []

    return {
        "profile": _ser(profile),
        "stats": {
            "orders_count": len(orders),
            "bookings_count": len(bookings),
            "leads_count": len(leads),
            "total_spend": round(sum(float(o.get("total_amount") or 0) for o in orders if str(o.get("payment_status", "")).lower() == "paid"), 2),
        },
        "orders": _ser(orders),
        "bookings": _ser(bookings),
        "contacts": _ser(contacts),
        "leads": _ser(leads),
    }


# ── One-off backfill for historical rows (run once after deploy) ──────────────

def backfill_customers() -> dict:
    """Scan existing orders/bookings/contacts/leads and ensure a profile exists
    for each phone. Safe to run repeatedly (uses ON CONFLICT via the DB trigger
    path? no — inserts directly with the normalize/insert pattern)."""
    seen: dict = {}
    sources = [
        ("orders", "phone_number", "email", "full_name"),
        ("bookings", "phone_number", None, "full_name"),
        ("contact_messages", "phone", "email", "name"),
        ("daily_leads", "phone", None, "customer_name"),
    ]
    for table, pcol, ecol, ncol in sources:
        resp = db.table(table).select(f"{pcol},{ecol},{ncol}" if ecol else f"{pcol},{ncol}").execute()
        for r in (resp.data or []):
            n = normalize_phone(r.get(pcol))
            if not n:
                continue
            if n not in seen:
                seen[n] = {"phone": n, "email": r.get(ecol), "full_name": r.get(ncol), "ts": []}
            if ecol and r.get(ecol) and not seen[n]["email"]:
                seen[n]["email"] = r.get(ecol)
            if ncol and r.get(ncol) and not seen[n]["full_name"]:
                seen[n]["full_name"] = r.get(ncol)

    created = 0
    for n, info in seen.items():
        resp = db.table("customer_profiles").select("id").eq("phone", n).limit(1).execute()
        if resp.data:
            continue
        ins = db.table("customer_profiles").insert({
            "phone": n, "email": info.get("email"), "full_name": info.get("full_name"),
            "first_seen": datetime.utcnow().isoformat(), "last_seen": datetime.utcnow().isoformat(),
        }).execute()
        if ins.data:
            created += 1
    return {"profiles_seen": len(seen), "created": created}
