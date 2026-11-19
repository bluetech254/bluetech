"""
daily/models.py — Pydantic models for the Daily Ops & EOD module.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Daily Report ──────────────────────────────────────────────────────────────

class DailyReportUpdate(BaseModel):
    opening_cash: Optional[float] = None
    counted_cash: Optional[float] = None


# ── Leads ─────────────────────────────────────────────────────────────────────

VALID_CHANNELS = {"call", "whatsapp", "walk_in"}
VALID_SOURCES  = {"google", "website", "instagram", "unknown"}
VALID_STATUSES = {"pending", "closed", "no_go", "scheduled"}


class LeadCreate(BaseModel):
    channel:       str
    source:        Optional[str] = None
    quantity:      int = Field(default=1, ge=1, le=50)
    customer_name: Optional[str] = None
    phone:         Optional[str] = None
    notes:         Optional[str] = None


class LeadStatusUpdate(BaseModel):
    status:     str
    invoice_id: Optional[str] = None
    phone:      Optional[str] = None


# ── Logistics ─────────────────────────────────────────────────────────────────

class LogisticsCreate(BaseModel):
    movement_type:  str
    fulfillment_by: str
    zone_id:        str
    quantity:       int = Field(default=1, ge=1, le=50)
    invoice_id:     Optional[str] = None
    notes:          Optional[str] = None


# ── Expenses ──────────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    vendor:         str
    reason:         str
    bill_ref:       Optional[str] = None
    payment_method: str
    amount:         float = Field(gt=0)
