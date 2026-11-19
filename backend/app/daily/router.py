"""
daily/router.py — Daily Ops & EOD endpoints.

All routes require admin auth.
Write routes return 403 if the day is locked (status = 'closed').
"""
from __future__ import annotations

import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from admin_auth.dependencies import get_current_admin
from daily import service
from daily.models import (
    DailyReportUpdate,
    ExpenseCreate,
    LeadCreate,
    LeadStatusUpdate,
    LogisticsCreate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/daily", tags=["daily"])


def _date(date_str: str) -> date:
    try:
        return date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}. Use YYYY-MM-DD.")


# ── Report ────────────────────────────────────────────────────────────────────

@router.get("/report/{date_str}")
def get_report(date_str: str, admin: dict = Depends(get_current_admin)):
    """Get or auto-create the daily report for a date."""
    try:
        return service.get_or_create_report(_date(date_str))
    except Exception as e:
        logger.error(f"get_report failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/report/{date_str}")
def update_report(date_str: str, payload: DailyReportUpdate, admin: dict = Depends(get_current_admin)):
    """Update opening_cash or counted_cash for a date."""
    try:
        return service.update_report(_date(date_str), payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"update_report failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report/{date_str}/lock")
def lock_report(date_str: str, admin: dict = Depends(get_current_admin)):
    """Lock (close) a day. Admin only."""
    try:
        return service.lock_report(_date(date_str), admin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"lock_report failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── EOD Snapshot ──────────────────────────────────────────────────────────────

@router.get("/report/{date_str}/eod")
def get_eod(date_str: str, admin: dict = Depends(get_current_admin)):
    """Full EOD aggregation snapshot for a date."""
    try:
        return service.get_eod_snapshot(_date(date_str))
    except Exception as e:
        logger.error(f"get_eod failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report/{date_str}/clicks")
def get_clicks(date_str: str, admin: dict = Depends(get_current_admin)):
    """Link-click counts per source for the date (Phase 2)."""
    try:
        from link_tracking import service as lt_service
        return lt_service.get_clicks_for_date(_date(date_str))
    except Exception as e:
        logger.error(f"get_clicks failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Leads ─────────────────────────────────────────────────────────────────────

@router.get("/report/{date_str}/leads")
def list_leads(date_str: str, admin: dict = Depends(get_current_admin)):
    try:
        return service.list_leads(_date(date_str))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report/{date_str}/leads")
def add_leads(date_str: str, payload: LeadCreate, admin: dict = Depends(get_current_admin)):
    try:
        return service.add_leads(_date(date_str), payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"add_leads failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/leads/{lead_id}")
def update_lead(lead_id: str, payload: LeadStatusUpdate, date_str: str, admin: dict = Depends(get_current_admin)):
    """Update a lead's status. Pass ?date_str=YYYY-MM-DD to identify the report."""
    try:
        return service.update_lead(lead_id, payload, _date(date_str))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"update_lead failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/leads/{lead_id}")
def delete_lead(lead_id: str, date_str: str, admin: dict = Depends(get_current_admin)):
    try:
        service.delete_lead(lead_id, _date(date_str))
        return {"status": "deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Logistics ─────────────────────────────────────────────────────────────────

@router.get("/report/{date_str}/logistics")
def list_logistics(date_str: str, admin: dict = Depends(get_current_admin)):
    try:
        return service.list_logistics(_date(date_str))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report/{date_str}/logistics")
def add_logistics(date_str: str, payload: LogisticsCreate, admin: dict = Depends(get_current_admin)):
    try:
        return service.add_logistics(_date(date_str), payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"add_logistics failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/logistics/{entry_id}")
def delete_logistics(entry_id: str, date_str: str, admin: dict = Depends(get_current_admin)):
    try:
        service.delete_logistics(entry_id, _date(date_str))
        return {"status": "deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Expenses ──────────────────────────────────────────────────────────────────

@router.get("/report/{date_str}/expenses")
def list_expenses(date_str: str, admin: dict = Depends(get_current_admin)):
    try:
        return service.list_expenses(_date(date_str))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report/{date_str}/expenses")
def add_expense(date_str: str, payload: ExpenseCreate, admin: dict = Depends(get_current_admin)):
    try:
        return service.add_expense(_date(date_str), payload, admin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"add_expense failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id: str, date_str: str, admin: dict = Depends(get_current_admin)):
    try:
        service.delete_expense(expense_id, _date(date_str))
        return {"status": "deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
