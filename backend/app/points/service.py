"""
points/service.py — Loyalty points and referrals business logic.

Constants:
  EARN_RATE       = 10% of order subtotal → points (KES 100 = 10 pts)
  REFERRAL_POINTS = 50 pts to referrer on referee's first delivered order
  POINTS_TO_KES   = 0.10  (10 pts = KES 1)
"""
import logging
import math
import secrets
import string

from core.database import supabase, supabase_admin
from core.exceptions import InsufficientPointsException

logger = logging.getLogger(__name__)

EARN_RATE       = 0.10
REFERRAL_POINTS = 50
POINTS_TO_KES   = 0.10
REDEEM_MINIMUM  = 1     # any positive amount can be redeemed


# ── Read ──────────────────────────────────────────────────────────────────────

def get_user_points(user_id: str) -> int:
    resp = supabase_admin.table("users").select("points").eq("id", user_id).single().execute()
    return resp.data.get("points", 0) if resp.data else 0


def get_points_history(user_id: str) -> list:
    resp = supabase_admin.table("points_ledger")\
        .select("*").eq("user_id", user_id)\
        .order("created_at", desc=True).execute()
    return resp.data or []


def get_or_create_referral_code(user_id: str) -> str:
    resp = supabase_admin.table("users").select("referral_code").eq("id", user_id).single().execute()
    code = resp.data.get("referral_code") if resp.data else None
    if not code:
        code = _generate_referral_code()
        supabase_admin.table("users").update({"referral_code": code}).eq("id", user_id).execute()
    return code


# ── Write ─────────────────────────────────────────────────────────────────────

def add_points(user_id: str, points: int, type_: str, description: str, order_id: str = None) -> None:
    """Add (positive) or subtract (negative) points and write ledger entry."""
    u       = supabase_admin.table("users").select("points").eq("id", user_id).single().execute()
    current = u.data.get("points", 0) if u.data else 0
    supabase_admin.table("users").update({"points": current + points}).eq("id", user_id).execute()
    entry = {"user_id": user_id, "points": points, "type": type_, "description": description}
    if order_id:
        entry["order_id"] = order_id
    supabase_admin.table("points_ledger").insert(entry).execute()


def award_order_points(user_id: str, subtotal: float, order_id: str) -> None:
    """Award 10% of subtotal as points when order is delivered."""
    earned = math.floor(subtotal * EARN_RATE)
    if earned > 0:
        add_points(user_id, earned, "order_earn",
                   f"Earned {earned} pts on order #{order_id[:8].upper()}", order_id)


def award_referral_points(referrer_id: str, referee_name: str) -> None:
    """Award 50 points to referrer when their referee's first order is delivered."""
    add_points(referrer_id, REFERRAL_POINTS, "referral_earn",
               f"Referral bonus — {referee_name}'s first order delivered")


def award_referral_signup_points(referrer_id: str, referee_name: str) -> None:
    """Award 10 instant points to referrer when referee registers."""
    add_points(referrer_id, 10, "referral_signup",
               f"Referral signup bonus — {referee_name} joined using your code")


def redeem_points(user_id: str, points_to_redeem: int) -> dict:
    """
    Redeem points for a KES discount. 10 pts = KES 1.
    Returns discount_amount and remaining_points.
    """
    current = get_user_points(user_id)
    if current < points_to_redeem:
        raise InsufficientPointsException(
            f"Insufficient points. You have {current}, requested {points_to_redeem}"
        )
    discount = round(points_to_redeem * POINTS_TO_KES, 2)
    add_points(user_id, -points_to_redeem, "redemption",
               f"Redeemed {points_to_redeem} pts for KES {discount:.2f} discount")
    return {"discount_amount": discount, "remaining_points": current - points_to_redeem}


def admin_award_points(user_id: str, points: int, reason: str) -> dict:
    """Admin manually awards points (compensation, promotion, etc.)."""
    add_points(user_id, points, "admin_award", reason)
    return {"message": f"Awarded {points} points", "new_balance": get_user_points(user_id)}


# ── Helpers ───────────────────────────────────────────────────────────────────

def resolve_referral_code(code: str) -> str | None:
    """Return user_id of the referral code owner, or None."""
    resp = supabase.table("users").select("id").eq("referral_code", code.upper()).execute()
    return resp.data[0]["id"] if resp.data else None


def _generate_referral_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(8))
