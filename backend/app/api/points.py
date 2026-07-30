from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
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


class RedeemRequest(BaseModel):
    points: int = Field(..., ge=1000, description="Points to redeem (minimum 1000)")


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


@router.post("/redeem")
def redeem_points(body: RedeemRequest, user: dict = Depends(get_current_user)):
    """
    Redeem points for a discount on next order.
    - Minimum 1000 points
    - 1 point = KES 1 discount
    - Delivery fee is always charged separately
    Returns a discount_amount to apply at checkout.
    """
    try:
        result = points_service.redeem_points(user["user_id"], body.points)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


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
    points_service._add_points(user_id, points, "admin_award", reason)
    return {"message": f"Awarded {points} points", "new_balance": points_service.get_user_points(user_id)}
