from uuid import UUID
from app.database import supabase, supabase_admin
import math
import secrets
import string

EARN_RATE              = 0.10   # 10% of subtotal → points
REFERRAL_POINTS        = 50     # points awarded to referrer on referee's first order
REFERRAL_SIGNUP_POINTS = 10     # instant points awarded to referrer when referee registers
REDEEM_MINIMUM         = 1000   # minimum points to redeem
# 1 point = KES 1; delivery fee always charged separately


def generate_referral_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(8))


def get_or_create_referral_code(user_id: str) -> str:
    resp = supabase_admin.table("users").select("referral_code").eq("id", user_id).single().execute()
    code = resp.data.get("referral_code") if resp.data else None
    if not code:
        code = generate_referral_code()
        supabase_admin.table("users").update({"referral_code": code}).eq("id", user_id).execute()
    return code


def get_user_points(user_id: str) -> int:
    resp = supabase_admin.table("users").select("points").eq("id", user_id).single().execute()
    return resp.data.get("points", 0) if resp.data else 0


def _add_points(user_id: str, points: int, type_: str, description: str, order_id: str = None):
    """Add or subtract points and log to ledger."""
    supabase_admin.table("users").update({"points": supabase_admin.table("users").select("points").eq("id", user_id).single().execute().data.get("points", 0) + points}).eq("id", user_id).execute()
    entry = {"user_id": user_id, "points": points, "type": type_, "description": description}
    if order_id:
        entry["order_id"] = order_id
    supabase_admin.table("points_ledger").insert(entry).execute()


def award_order_points(user_id: str, subtotal: float, order_id: str):
    """Award 10% of subtotal as points when order is delivered."""
    earned = math.floor(subtotal * EARN_RATE)
    if earned <= 0:
        return
    _add_points(user_id, earned, "order_earn",
                f"Earned {earned} points on order #{order_id[:8].upper()}", order_id)


def award_referral_signup_points(referrer_id: str, referee_name: str):
    """Award 10 instant points to referrer when their referee successfully registers."""
    _add_points(referrer_id, REFERRAL_SIGNUP_POINTS, "referral_signup",
                f"Referral signup bonus — {referee_name} joined using your code")


def award_referral_points(referrer_id: str, referee_name: str):
    """Award 50 points to referrer when their referee's first order is delivered."""
    _add_points(referrer_id, REFERRAL_POINTS, "referral_earn",
                f"Referral delivery bonus — {referee_name}'s first order was delivered")


def redeem_points(user_id: str, points_to_redeem: int) -> dict:
    """
    Redeem points toward an order discount.
    Returns { discount_amount, remaining_points } or raises ValueError.
    """
    if points_to_redeem < REDEEM_MINIMUM:
        raise ValueError(f"Minimum redemption is {REDEEM_MINIMUM} points")

    current = get_user_points(user_id)
    if current < points_to_redeem:
        raise ValueError(f"Insufficient points. You have {current}, requested {points_to_redeem}")

    discount = float(points_to_redeem)  # 1 point = KES 1 discount on order/booking
    _add_points(user_id, -points_to_redeem, "redemption",
                f"Redeemed {points_to_redeem} points for KES {discount:.0f} discount on order/booking")

    return {"discount_amount": discount, "remaining_points": current - points_to_redeem}


def get_points_history(user_id: str) -> list:
    resp = supabase_admin.table("points_ledger")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .execute()
    return resp.data


def resolve_referral_code(code: str) -> str | None:
    """Return user_id of the owner of a referral code, or None."""
    resp = supabase.table("users").select("id").eq("referral_code", code.upper()).execute()
    return resp.data[0]["id"] if resp.data else None
