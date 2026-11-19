"""
customers/router.py — Customer 360 admin endpoints (all require admin auth).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from admin_auth.dependencies import get_current_admin
from customers import service

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("")
def list_customers(
    search: str | None = None,
    page: int = 1,
    page_size: int = 25,
    admin: dict = Depends(get_current_admin),
):
    return service.list_customers(search=search, page=page, page_size=page_size)


@router.get("/{profile_id}")
def get_customer(profile_id: str, admin: dict = Depends(get_current_admin)):
    c = service.get_customer(profile_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c
