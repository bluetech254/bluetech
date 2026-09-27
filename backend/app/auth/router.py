"""
auth/router.py — All client authentication HTTP routes.

Rate limiting applied on every sensitive endpoint:
  - signup:          5/minute
  - login:           10/minute
  - forgot-password: 3/minute
  - resend-code:     3/minute

All business logic delegated to auth/service.py — this file only
handles HTTP concerns (request parsing, response shaping, error mapping).
"""
import logging
from fastapi import APIRouter, HTTPException, Request, Depends

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.exceptions import AuthException
from auth.models import (
    UserSignup,
    UserLogin,
    ForgotPassword,
    ResetPassword,
    VerifyPhone,
    VerifyEmail,
    ResendCode,
    AuthResponse,
    MessageResponse,
)
from auth.dependencies import get_current_user as get_current_user_dep
from auth import service

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/v1/auth", tags=["Client Authentication"])


# ── Signup ────────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=AuthResponse)
@limiter.limit("5/minute")
def signup(request: Request, body: UserSignup):
    """
    Register a new client account.

    - Phone number normalized to 254XXXXXXXXX
    - Password hashed with bcrypt
    - OTP sent via SMS for phone verification
    - Supports optional referral code
    """
    try:
        return service.signup_user(body)
    except AuthException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
def login(request: Request, body: UserLogin):
    """
    Login with phone number and password.

    - Returns JWT (7-day expiry) on success
    - Generic error message — does not reveal if phone exists
    """
    try:
        return service.login_user(body)
    except AuthException as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")


# ── Phone verification ────────────────────────────────────────────────────────

@router.post("/verify-phone", response_model=MessageResponse)
def verify_phone(body: VerifyPhone):
    """Verify phone number with the 6-digit OTP sent at signup."""
    try:
        return service.verify_phone(body)
    except AuthException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Phone verification error: {e}")
        raise HTTPException(status_code=500, detail="Verification failed.")


# ── Resend OTP ────────────────────────────────────────────────────────────────

@router.post("/resend-code", response_model=MessageResponse)
@limiter.limit("3/minute")
def resend_code(request: Request, body: ResendCode):
    """Resend phone verification OTP."""
    try:
        return service.resend_verification_code(body.phone_number)
    except AuthException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Resend OTP error: {e}")
        raise HTTPException(status_code=500, detail="Failed to resend code.")


# ── Forgot password ───────────────────────────────────────────────────────────

@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("3/minute")
def forgot_password(request: Request, body: ForgotPassword):
    """
    Request a password reset OTP via SMS.
    Always returns the same response — no user enumeration.
    """
    try:
        return service.forgot_password(body)
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        # Return generic message even on error
        return {"message": "If this number is registered, a reset code has been sent"}


# ── Reset password ────────────────────────────────────────────────────────────

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPassword):
    """Reset password using the OTP received via SMS."""
    try:
        return service.reset_password(body)
    except AuthException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail="Password reset failed.")


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout", response_model=MessageResponse)
def logout():
    """
    Stateless logout — instructs the client to discard the token.
    Client must delete the token from sessionStorage on receipt.
    """
    return {"message": "Logged out successfully"}


# ── User profile (client self-service) ────────────────────────────────────────

@router.get("/users/me")
def get_current_user(user_id: str = Depends(get_current_user_dep)):
    """Return the authenticated user's profile."""
    from core.database import supabase_admin
    resp = supabase_admin.table("users").select(
        "id, full_name, email, phone_number, points, referral_code, created_at"
    ).eq("id", user_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="User not found")
    return resp.data


@router.put("/users/me")
def update_profile(body: dict, user_id: str = Depends(get_current_user_dep)):
    """Update the authenticated user's profile (full_name, email)."""
    from core.database import supabase_admin
    allowed = {k: v for k, v in body.items() if k in ("full_name", "email")}
    if not allowed:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    resp = supabase_admin.table("users").update(allowed).eq("id", user_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = resp.data[0]
    for f in ("password", "verification_code", "reset_code"):
        user.pop(f, None)
    return user


@router.put("/users/me/password", response_model=MessageResponse)
def change_own_password(body: dict, user_id: str = Depends(get_current_user_dep)):
    """Change the authenticated user's own password."""
    from core.database import supabase_admin
    from core.security import verify_and_rehash, hash_password
    current_pw = body.get("current_password")
    new_pw     = body.get("new_password")
    if not current_pw or not new_pw:
        raise HTTPException(status_code=400, detail="current_password and new_password required")
    if len(new_pw) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    resp = supabase_admin.table("users").select("password").eq("id", user_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_and_rehash(current_pw, resp.data["password"], user_id, "users"):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    supabase_admin.table("users").update({"password": hash_password(new_pw)}).eq("id", user_id).execute()
    return {"message": "Password updated successfully"}
