"""
daily/service.py — Business logic for the Daily Ops & EOD module.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import uuid4

from core.db import db
from daily.models import (
    VALID_CHANNELS,
    VALID_SOURCES,
    VALID_STATUSES,
    DailyReportUpdate,
    ExpenseCreate,
    LeadCreate,
    LeadStatusUpdate,
    LogisticsCreate,
)

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize(obj):
    """Make DB rows JSON-safe."""
    if isinstance(obj, list):
        return [_serialize(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    return obj


def _assert_open(report: dict):
    if report.get("status") == "closed":
        raise ValueError("This day has been locked and cannot be modified.")


# ── Report: get or create ─────────────────────────────────────────────────────

def get_or_create_report(report_date: date) -> dict:
    """
    Fetch the daily_report for `report_date`. If none exists, create one,
    auto-filling opening_cash from yesterday's counted_cash.
    """
    resp = db.table("daily_reports").select("*").eq("report_date", str(report_date)).execute()

    if resp.data and (isinstance(resp.data, list) and len(resp.data) > 0):
        row = resp.data[0] if isinstance(resp.data, list) else resp.data
        return _serialize(row)

    # Auto carry-forward: check yesterday's counted_cash
    yesterday = report_date - timedelta(days=1)
    yresp = db.table("daily_reports").select("counted_cash").eq("report_date", str(yesterday)).execute()
    opening = 0.0
    if yresp.data:
        yrow = yresp.data[0] if isinstance(yresp.data, list) else yresp.data
        opening = float(yrow.get("counted_cash") or 0)

    new_resp = db.table("daily_reports").insert({
        "report_date":  str(report_date),
        "opening_cash": opening,
        "counted_cash": 0,
        "status":       "open",
    }).execute()

    if new_resp.error:
        raise RuntimeError(f"Failed to create daily report: {new_resp.error}")

    created = new_resp.data[0] if isinstance(new_resp.data, list) else new_resp.data
    return _serialize(created)


def update_report(report_date: date, payload: DailyReportUpdate) -> dict:
    report = get_or_create_report(report_date)
    _assert_open(report)

    updates = {}
    if payload.opening_cash is not None:
        updates["opening_cash"] = payload.opening_cash
    if payload.counted_cash is not None:
        updates["counted_cash"] = payload.counted_cash

    if not updates:
        return report

    updates["updated_at"] = datetime.utcnow().isoformat()
    db.table("daily_reports").update(updates).eq("report_date", str(report_date)).execute()
    return get_or_create_report(report_date)


def lock_report(report_date: date, admin: dict) -> dict:
    report = get_or_create_report(report_date)
    if report.get("status") == "closed":
        raise ValueError("Day is already locked.")

    db.table("daily_reports").update({
        "status":     "closed",
        "closed_by":  admin["admin_id"],
        "closed_at":  datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("report_date", str(report_date)).execute()

    return get_or_create_report(report_date)


# ── Leads ─────────────────────────────────────────────────────────────────────

def list_leads(report_date: date) -> list:
    report = get_or_create_report(report_date)
    resp = db.table("daily_leads").select("*").eq("daily_report_id", report["id"]).order("created_at").execute()
    return _serialize(resp.data or [])


def add_leads(report_date: date, payload: LeadCreate) -> list:
    report = get_or_create_report(report_date)
    _assert_open(report)

    if payload.channel not in VALID_CHANNELS:
        raise ValueError(f"Invalid channel. Must be one of: {VALID_CHANNELS}")
    if payload.source and payload.source not in VALID_SOURCES:
        raise ValueError(f"Invalid source. Must be one of: {VALID_SOURCES}")

    rows = []
    for _ in range(payload.quantity):
        rows.append({
            "daily_report_id": report["id"],
            "channel":         payload.channel,
            "source":          payload.source,
            "status":          "pending",
            "customer_name":   payload.customer_name,
            "phone":           payload.phone,
            "notes":           payload.notes,
        })

    created = []
    for row in rows:
        r = db.table("daily_leads").insert(row).execute()
        if r.data:
            created.append(r.data[0] if isinstance(r.data, list) else r.data)

    return _serialize(created)


def update_lead(lead_id: str, payload: LeadStatusUpdate, report_date: date) -> dict:
    report = get_or_create_report(report_date)
    _assert_open(report)

    if payload.status not in VALID_STATUSES:
        raise ValueError(f"Invalid status. Must be one of: {VALID_STATUSES}")

    updates: dict = {"status": payload.status}
    if payload.invoice_id:
        updates["invoice_id"] = payload.invoice_id
    if payload.phone:
        updates["phone"] = payload.phone

    db.table("daily_leads").update(updates).eq("id", lead_id).execute()

    resp = db.table("daily_leads").select("*").eq("id", lead_id).execute()
    row = resp.data[0] if isinstance(resp.data, list) else resp.data
    return _serialize(row)


def delete_lead(lead_id: str, report_date: date):
    report = get_or_create_report(report_date)
    _assert_open(report)
    db.table("daily_leads").delete().eq("id", lead_id).execute()


# ── Logistics ─────────────────────────────────────────────────────────────────

def list_logistics(report_date: date) -> list:
    report = get_or_create_report(report_date)
    resp = db.table("daily_logistics").select("*").eq("daily_report_id", report["id"]).order("created_at").execute()
    return _serialize(resp.data or [])


def add_logistics(report_date: date, payload: LogisticsCreate) -> dict:
    report = get_or_create_report(report_date)
    _assert_open(report)

    if payload.movement_type not in {"pickup", "delivery"}:
        raise ValueError("movement_type must be 'pickup' or 'delivery'")
    if payload.fulfillment_by not in {"us", "not_us"}:
        raise ValueError("fulfillment_by must be 'us' or 'not_us'")

    # Resolve zone name from delivery_zones table
    zresp = db.table("delivery_zones").select("zone_name").eq("id", payload.zone_id).execute()
    if not zresp.data:
        raise ValueError("Zone not found")
    zrow = zresp.data[0] if isinstance(zresp.data, list) else zresp.data
    zone_name = zrow["zone_name"]

    r = db.table("daily_logistics").insert({
        "daily_report_id": report["id"],
        "movement_type":   payload.movement_type,
        "fulfillment_by":  payload.fulfillment_by,
        "zone_id":         payload.zone_id,
        "zone_name":       zone_name,
        "quantity":        payload.quantity,
        "invoice_id":      payload.invoice_id,
        "notes":           payload.notes,
    }).execute()

    if r.error:
        raise RuntimeError(f"Failed to add logistics: {r.error}")

    return _serialize(r.data[0] if isinstance(r.data, list) else r.data)


def delete_logistics(entry_id: str, report_date: date):
    report = get_or_create_report(report_date)
    _assert_open(report)
    db.table("daily_logistics").delete().eq("id", entry_id).execute()


# ── Expenses ──────────────────────────────────────────────────────────────────

def list_expenses(report_date: date) -> list:
    report = get_or_create_report(report_date)
    resp = db.table("daily_expenses").select("*").eq("daily_report_id", report["id"]).order("created_at").execute()
    return _serialize(resp.data or [])


def add_expense(report_date: date, payload: ExpenseCreate, admin: dict) -> dict:
    report = get_or_create_report(report_date)
    _assert_open(report)

    if payload.payment_method not in {"cash", "card", "transfer"}:
        raise ValueError("payment_method must be 'cash', 'card', or 'transfer'")

    r = db.table("daily_expenses").insert({
        "daily_report_id": report["id"],
        "vendor":          payload.vendor,
        "reason":          payload.reason,
        "bill_ref":        payload.bill_ref,
        "payment_method":  payload.payment_method,
        "amount":          payload.amount,
        "recorded_by":     admin["admin_id"],
    }).execute()

    if r.error:
        raise RuntimeError(f"Failed to add expense: {r.error}")

    return _serialize(r.data[0] if isinstance(r.data, list) else r.data)


def delete_expense(expense_id: str, report_date: date):
    report = get_or_create_report(report_date)
    _assert_open(report)
    db.table("daily_expenses").delete().eq("id", expense_id).execute()


# ── EOD Aggregation ───────────────────────────────────────────────────────────

def get_eod_snapshot(report_date: date) -> dict:
    """
    Full EOD snapshot for a date. Aggregates from:
    - orders (sales, collection by method, unpaid)
    - daily_expenses
    - daily_leads
    - daily_logistics
    - daily_reports (cash drawer)
    """
    report = get_or_create_report(report_date)
    date_str = str(report_date)

    # ── Sales from orders ─────────────────────────────────────────────────────
    orders_resp = db.table("orders").select(
        "id, full_name, total_amount, payment_method, payment_status, payment_receipt, created_at, points_discount"
    ).execute()

    all_orders = orders_resp.data or []

    # Filter to today's orders
    today_orders = [
        o for o in all_orders
        if str(o.get("created_at", ""))[:10] == date_str
    ]

    paid_orders    = [o for o in today_orders if o.get("payment_status") == "paid"]
    unpaid_orders  = [o for o in today_orders if o.get("payment_status") != "paid"]

    total_sales    = sum(float(o.get("total_amount") or 0) for o in paid_orders)
    total_discount = sum(float(o.get("points_discount") or 0) for o in paid_orders)

    cash_in   = sum(float(o.get("total_amount") or 0) for o in paid_orders if o.get("payment_method") == "cash")
    card_in   = sum(float(o.get("total_amount") or 0) for o in paid_orders if o.get("payment_method") == "card")
    online_in = sum(float(o.get("total_amount") or 0) for o in paid_orders if o.get("payment_method") in ("mpesa", "transfer", "online"))

    # Also include booking payments for the day
    bookings_resp = db.table("bookings").select(
        "id, customer_name, final_cost, estimated_cost, final_payment_status, final_payment_method, final_payment_receipt, updated_at, commitment_fee"
    ).execute()

    all_bookings = bookings_resp.data or []
    today_paid_bookings = [
        b for b in all_bookings
        if str(b.get("updated_at", ""))[:10] == date_str
        and b.get("final_payment_status") == "paid"
    ]

    for b in today_paid_bookings:
        amt = float(b.get("final_cost") or b.get("estimated_cost") or 0)
        commitment = float(b.get("commitment_fee") or 0)
        balance = max(0.0, amt - commitment)
        total_sales += balance
        method = b.get("final_payment_method", "")
        if method == "cash":
            cash_in += balance
        elif method == "card":
            card_in += balance
        else:
            online_in += balance

    # ── Expenses ──────────────────────────────────────────────────────────────
    expenses = list_expenses(report_date)
    total_expenses     = sum(float(e.get("amount") or 0) for e in expenses)
    cash_expenses      = sum(float(e.get("amount") or 0) for e in expenses if e.get("payment_method") == "cash")
    card_expenses      = sum(float(e.get("amount") or 0) for e in expenses if e.get("payment_method") == "card")
    transfer_expenses  = sum(float(e.get("amount") or 0) for e in expenses if e.get("payment_method") == "transfer")

    # ── Cash drawer equation ──────────────────────────────────────────────────
    opening_cash  = float(report.get("opening_cash") or 0)
    counted_cash  = float(report.get("counted_cash") or 0)
    expected_cash = opening_cash + cash_in - cash_expenses
    variance      = counted_cash - expected_cash

    # ── Leads ─────────────────────────────────────────────────────────────────
    leads = list_leads(report_date)
    total_leads  = len(leads)
    closed_leads = [l for l in leads if l.get("status") == "closed"]
    pending_leads = [l for l in leads if l.get("status") == "pending"]
    nogo_leads   = [l for l in leads if l.get("status") == "no_go"]
    sched_leads  = [l for l in leads if l.get("status") == "scheduled"]
    conversion   = round((len(closed_leads) / total_leads * 100), 1) if total_leads > 0 else 0.0

    # Linked sales: closed leads that have an invoice_id
    linked_invoice_ids = [l["invoice_id"] for l in closed_leads if l.get("invoice_id")]
    linked_sales = sum(
        float(o.get("total_amount") or 0)
        for o in paid_orders
        if str(o.get("id")) in linked_invoice_ids
    )

    # Channel breakdown
    channel_breakdown: dict = {}
    for lead in leads:
        ch = lead.get("channel", "unknown")
        src = lead.get("source") or "direct"
        if ch not in channel_breakdown:
            channel_breakdown[ch] = {"total": 0, "sources": {}}
        channel_breakdown[ch]["total"] += 1
        channel_breakdown[ch]["sources"][src] = channel_breakdown[ch]["sources"].get(src, 0) + 1

    # ── Logistics ─────────────────────────────────────────────────────────────
    logistics = list_logistics(report_date)
    pickups    = [l for l in logistics if l.get("movement_type") == "pickup"]
    deliveries = [l for l in logistics if l.get("movement_type") == "delivery"]

    pickup_us     = sum(l.get("quantity", 1) for l in pickups if l.get("fulfillment_by") == "us")
    pickup_notus  = sum(l.get("quantity", 1) for l in pickups if l.get("fulfillment_by") == "not_us")
    delivery_us   = sum(l.get("quantity", 1) for l in deliveries if l.get("fulfillment_by") == "us")
    delivery_notus= sum(l.get("quantity", 1) for l in deliveries if l.get("fulfillment_by") == "not_us")

    # Zone breakdown
    zone_breakdown: dict = {}
    for entry in logistics:
        key = (entry.get("movement_type"), entry.get("zone_name"))
        zone_breakdown[str(key)] = zone_breakdown.get(str(key), 0) + entry.get("quantity", 1)

    return {
        "report":        report,
        "report_date":   date_str,
        # Sales
        "total_sales":   round(total_sales, 2),
        "total_discount":round(total_discount, 2),
        "bill_count":    len(paid_orders) + len(today_paid_bookings),
        "cash_in":       round(cash_in, 2),
        "card_in":       round(card_in, 2),
        "online_in":     round(online_in, 2),
        "grand_total":   round(cash_in + card_in + online_in, 2),
        # Payments ledger
        "paid_orders":   _serialize(paid_orders),
        "paid_bookings": _serialize(today_paid_bookings),
        # Unpaid
        "unpaid_orders": _serialize(unpaid_orders),
        # Expenses
        "expenses":           expenses,
        "total_expenses":     round(total_expenses, 2),
        "cash_expenses":      round(cash_expenses, 2),
        "card_expenses":      round(card_expenses, 2),
        "transfer_expenses":  round(transfer_expenses, 2),
        # Cash drawer
        "opening_cash":  round(opening_cash, 2),
        "counted_cash":  round(counted_cash, 2),
        "expected_cash": round(expected_cash, 2),
        "variance":      round(variance, 2),
        # Leads
        "leads": {
            "total":      total_leads,
            "closed":     len(closed_leads),
            "pending":    len(pending_leads),
            "no_go":      len(nogo_leads),
            "scheduled":  len(sched_leads),
            "conversion": conversion,
            "linked_sales": round(linked_sales, 2),
            "by_channel": channel_breakdown,
        },
        # Logistics
        "logistics": {
            "pickups_total":    sum(l.get("quantity", 1) for l in pickups),
            "pickups_us":       pickup_us,
            "pickups_not_us":   pickup_notus,
            "deliveries_total": sum(l.get("quantity", 1) for l in deliveries),
            "deliveries_us":    delivery_us,
            "deliveries_not_us":delivery_notus,
            "entries":          logistics,
        },
    }
