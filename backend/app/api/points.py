from fastapi import APIRouter, HTTPException, Depends
from app.api.admin_auth import get_current_admin
from app.services import points_service
from app.utils.auth import decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/api/v1/points", tags=["Loyalty & Referrals"])
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(credentials.credentials)
    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


# ── Client endpoints ──────────────────────────────────────────────────────────

@router.get("/me")
def my_points(user: dict = Depends(get_current_user)):
    """
    Get current user's points balance, referral code, and redemption eligibility.
    """
    user_id = user["user_id"]
    balance = points_service.get_user_points(user_id)
    code = points_service.get_or_create_referral_code(user_id)
    return {
        "points_balance": balance,
        "referral_code": code,
        "can_redeem": balance >= points_service.REDEEM_MINIMUM,
        "redeem_minimum": points_service.REDEEM_MINIMUM,
        "earn_rate": f"{int(points_service.EARN_RATE * 100)}% of order subtotal",
        "referral_bonus": points_service.REFERRAL_POINTS,
    }


@router.get("/history")
def points_history(user: dict = Depends(get_current_user)):
    """Get full points earn/redeem history for the current user."""
    return {"data": points_service.get_points_history(user["user_id"])}


# Points are redeemed exclusively at checkout via order_service (redeem_points field on OrderCreate).
# There is no standalone /redeem endpoint — all redemptions are tied to an order_id in the ledger.


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/user/{user_id}")
def admin_get_user_points(user_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: view a user's points balance and history."""
    return {
        "points_balance": points_service.get_user_points(user_id),
        "history": points_service.get_points_history(user_id),
    }


@router.post("/admin/award/{user_id}")
def admin_award_points(user_id: str, points: int, reason: str, admin: dict = Depends(get_current_admin)):
    """Admin: manually award points to a user (e.g. compensation, promotion)."""
    from uuid import UUID as _UUID
    try:
        _UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID — must be a full UUID (e.g. from the Users page)")
    try:
        points_service._add_points(user_id, points, "admin_award", reason)
        return {"message": f"Awarded {points} points", "new_balance": points_service.get_user_points(user_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
