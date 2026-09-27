"""points/router.py — Loyalty points and referrals routes."""
import logging

from admin_auth.dependencies import get_current_admin
from auth.dependencies import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from points import service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/points", tags=["Loyalty & Referrals"])


@router.get("/me")
def my_points(user_id: str = Depends(get_current_user)):
    """Get current user's points balance, referral code, and redemption info."""
    balance = service.get_user_points(user_id)
    code    = service.get_or_create_referral_code(user_id)
    return {
        "points_balance": balance,
        "referral_code":  code,
        "can_redeem":     balance >= service.REDEEM_MINIMUM,
        "redeem_minimum": service.REDEEM_MINIMUM,
        "earn_rate":      f"{int(service.EARN_RATE * 100)}% of order subtotal",
        "referral_bonus": service.REFERRAL_POINTS,
        "points_to_kes":  service.POINTS_TO_KES,
    }


@router.get("/history")
def points_history(user_id: str = Depends(get_current_user)):
    """Get current user's full points earn/redeem history."""
    return {"data": service.get_points_history(user_id)}


@router.get("/admin/user/{user_id}")
def admin_get_user_points(user_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: view any user's points balance and history."""
    return {
        "points_balance": service.get_user_points(user_id),
        "history":        service.get_points_history(user_id),
    }


@router.post("/admin/award/{user_id}")
def admin_award_points(user_id: str, points: int, reason: str, admin: dict = Depends(get_current_admin)):
    """Admin: manually award points to a user."""
    try:
        from uuid import UUID
        UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID — must be a UUID")
    try:
        return service.admin_award_points(user_id, points, reason)
    except Exception as e:
        logger.error(f"Admin award points error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
