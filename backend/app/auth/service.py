"""
auth/service.py — All client authentication business logic.

Security fixes applied here:
- Passwords hashed with bcrypt (via core/security)
- verify_and_rehash() for transparent SHA-256 → bcrypt migration
- OTPs stored as SHA-256 hash (never plain text)
- OTP expiry enforced server-side
- Generic error messages (no user enumeration on login/forgot-password)
- Referral code resolution on signup
"""
from core.logging import get_logger
from datetime import datetime, timedelta

from auth.models import (
    ForgotPassword,
    ResetPassword,
    UserLogin,
    UserSignup,
    VerifyPhone,
)
from core.db import db
from core.exceptions import AuthException
from core.security import (
    create_client_token,
    generate_otp,
    hash_otp,
    hash_password,
    verify_and_rehash,
    verify_otp,
)
from notifications.sms import send_sms

logger = get_logger(__name__)

# OTP expiry windows
_VERIFY_OTP_EXPIRE_MINUTES = 30
_RESET_OTP_EXPIRE_MINUTES  = 60


# ── Signup ────────────────────────────────────────────────────────────────────

def signup_user(data: UserSignup) -> dict:
    """
    Register a new client user.
    - Checks phone + email uniqueness
    - Hashes password with bcrypt
    - Generates referral code
    - Resolves referrer if referral_code provided
    - Sends OTP via SMS (stored as hash)
    - Returns JWT + user object
    """
    # Uniqueness checks
    existing_phone = db.table("users").select("id").eq("phone_number", data.phone_number).execute()
    if existing_phone.data:
        raise AuthException("Phone number already registered")

    if data.email:
        existing_email = db.table("users").select("id").eq("email", data.email).execute()
        if existing_email.data:
            raise AuthException("Email already registered")

    # Resolve referral
    referred_by = None
    if data.referral_code:
        referred_by = _resolve_referral_code(data.referral_code)

    # Generate referral code for this new user
    new_referral_code = _generate_referral_code()

    # OTP — generate plain, store hash
    otp_plain = generate_otp()
    otp_hash  = hash_otp(otp_plain)
    otp_expiry = (datetime.utcnow() + timedelta(minutes=_VERIFY_OTP_EXPIRE_MINUTES)).isoformat()

    user_data = {
        "full_name":          data.full_name,
        "phone_number":       data.phone_number,
        "email":              data.email,
        "password":           hash_password(data.password),
        "is_verified":        False,
        "phone_verified":     False,
        "email_verified":     False,
        "verification_code":  otp_hash,      # stored as hash
        "otp_expires_at":     otp_expiry,
        "referral_code":      new_referral_code,
        "referred_by":        referred_by,
        "points":             0,
    }

    resp = db.table("users").insert(user_data).execute()
    user = resp.data[0]

    # Award instant signup points to referrer (fire-and-forget)
    if referred_by:
        try:
            _award_referral_signup_points(referred_by, data.full_name)
        except Exception as e:
            logger.warning(f"Referral signup points failed: {e}")

    # Send OTP via SMS
    send_sms(data.phone_number, f"Your BlueTech verification code is: {otp_plain}. Valid for {_VERIFY_OTP_EXPIRE_MINUTES} minutes.")

    # Strip sensitive fields before returning
    user = _sanitize_user(user)
    token = create_client_token(user["id"], user["phone_number"])

    return {"access_token": token, "token_type": "bearer", "user": user}


# ── Login ─────────────────────────────────────────────────────────────────────

def login_user(data: UserLogin) -> dict:
    """
    Authenticate a client user.
    - Generic error message (no user enumeration)
    - Account lockout: 5 failed attempts → 15 min lock
    - verify_and_rehash() transparently upgrades SHA-256 → bcrypt on first login
    - Updates last_login timestamp
    """
    resp = db.table("users").select("*").eq("phone_number", data.phone_number).execute()

    # Same error for wrong phone OR wrong password — no enumeration
    if not resp.data:
        raise AuthException("Invalid phone number or password")

    user = resp.data[0]

    # ── Account lockout check ─────────────────────────────────────────────────
    failed_attempts = user.get("failed_login_attempts") or 0
    locked_until    = user.get("locked_until")

    if locked_until:
        try:
            lock_expiry = datetime.fromisoformat(locked_until.replace("Z", "+00:00"))
            # Compare naive datetimes
            if datetime.utcnow() < lock_expiry.replace(tzinfo=None):
                raise AuthException(
                    "Account temporarily locked due to too many failed attempts. "
                    "Try again in 15 minutes."
                )
            else:
                # Lock expired — reset counters
                db.table("users").update({
                    "failed_login_attempts": 0,
                    "locked_until": None,
                }).eq("id", user["id"]).execute()
                failed_attempts = 0
        except AuthException:
            raise
        except Exception:
            pass

    # ── Password check ────────────────────────────────────────────────────────
    if not verify_and_rehash(data.password, user.get("password", ""), user["id"], "users"):
        # Increment failure counter
        new_attempts = failed_attempts + 1
        update = {"failed_login_attempts": new_attempts}
        if new_attempts >= 5:
            from datetime import timezone
            update["locked_until"] = (
                datetime.now(timezone.utc) + timedelta(minutes=15)
            ).isoformat()
            logger.warning(f"Account locked after {new_attempts} failed attempts: {user['id']}")
        db.table("users").update(update).eq("id", user["id"]).execute()
        raise AuthException("Invalid phone number or password")

    # ── Successful login — reset failure counter ──────────────────────────────
    try:
        db.table("users").update({
            "last_login":             datetime.utcnow().isoformat(),
            "failed_login_attempts":  0,
            "locked_until":           None,
        }).eq("id", user["id"]).execute()
    except Exception:
        pass  # non-critical

    logger.info(f"Client login: {user['id']}")

    user = _sanitize_user(user)
    token = create_client_token(user["id"], user["phone_number"])

    return {"access_token": token, "token_type": "bearer", "user": user}


# ── Phone verification ────────────────────────────────────────────────────────

def verify_phone(data: VerifyPhone) -> dict:
    """Verify a phone number with the 6-digit OTP sent at signup."""
    resp = db.table("users").select("*").eq("phone_number", data.phone_number).execute()
    if not resp.data:
        raise AuthException("User not found")

    user = resp.data[0]

    if user.get("phone_verified"):
        return {"message": "Phone already verified"}

    # Check OTP hash
    if not verify_otp(data.verification_code, user.get("verification_code", "")):
        raise AuthException("Invalid verification code")

    # Check expiry
    _check_otp_expiry(user.get("otp_expires_at"))

    db.table("users").update({
        "phone_verified":    True,
        "is_verified":       True,
        "verification_code": None,
        "otp_expires_at":    None,
    }).eq("id", user["id"]).execute()

    return {"message": "Phone verified successfully"}


# ── Resend OTP ────────────────────────────────────────────────────────────────

def resend_verification_code(phone_number: str) -> dict:
    """Issue a fresh OTP for phone verification."""
    resp = db.table("users").select("id, phone_verified").eq("phone_number", phone_number).execute()
    if not resp.data:
        raise AuthException("User not found")

    user = resp.data[0]
    if user.get("phone_verified"):
        return {"message": "Phone already verified"}

    otp_plain  = generate_otp()
    otp_hash   = hash_otp(otp_plain)
    otp_expiry = (datetime.utcnow() + timedelta(minutes=_VERIFY_OTP_EXPIRE_MINUTES)).isoformat()

    db.table("users").update({
        "verification_code": otp_hash,
        "otp_expires_at":    otp_expiry,
    }).eq("id", user["id"]).execute()

    send_sms(phone_number, f"Your BlueTech verification code is: {otp_plain}. Valid for {_VERIFY_OTP_EXPIRE_MINUTES} minutes.")
    return {"message": "Verification code sent"}


# ── Forgot password ───────────────────────────────────────────────────────────

def forgot_password(data: ForgotPassword) -> dict:
    """
    Send a password reset OTP.
    Always returns the same message — no user enumeration.
    """
    _GENERIC = "If this number is registered, a reset code has been sent"

    resp = db.table("users").select("id, phone_number").eq("phone_number", data.phone_number).execute()
    if not resp.data:
        return {"message": _GENERIC}

    user = resp.data[0]

    otp_plain  = generate_otp()
    otp_hash   = hash_otp(otp_plain)
    otp_expiry = (datetime.utcnow() + timedelta(minutes=_RESET_OTP_EXPIRE_MINUTES)).isoformat()

    db.table("users").update({
        "reset_code":         otp_hash,
        "reset_code_expires": otp_expiry,
    }).eq("id", user["id"]).execute()

    send_sms(data.phone_number, f"Your BlueTech password reset code is: {otp_plain}. Valid for {_RESET_OTP_EXPIRE_MINUTES} minutes.")
    return {"message": _GENERIC}


# ── Reset password ────────────────────────────────────────────────────────────

def reset_password(data: ResetPassword) -> dict:
    """Reset a password using the OTP sent via forgot_password."""
    resp = db.table("users").select("*").eq("phone_number", data.phone_number).execute()
    if not resp.data:
        raise AuthException("Invalid phone number or reset code")

    user = resp.data[0]

    if not verify_otp(data.reset_code, user.get("reset_code", "")):
        raise AuthException("Invalid reset code")

    _check_otp_expiry(user.get("reset_code_expires"))

    db.table("users").update({
        "password":           hash_password(data.new_password),
        "reset_code":         None,
        "reset_code_expires": None,
    }).eq("id", user["id"]).execute()

    logger.info(f"Password reset for user: {user['id']}")
    return {"message": "Password reset successfully"}


# ── Private helpers ───────────────────────────────────────────────────────────

def _sanitize_user(user: dict) -> dict:
    """Remove all sensitive fields before returning user data to client."""
    for field in ("password", "verification_code", "otp_expires_at", "reset_code", "reset_code_expires"):
        user.pop(field, None)
    return user


def _check_otp_expiry(expires_at: str | None) -> None:
    """Raise AuthException if the OTP expiry timestamp has passed."""
    if not expires_at:
        return
    try:
        expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if datetime.utcnow() > expiry.replace(tzinfo=None):
            raise AuthException("Code expired. Please request a new one.")
    except AuthException:
        raise
    except Exception:
        pass  # unparseable expiry — treat as not expired, let OTP hash check catch it


def _generate_referral_code() -> str:
    import secrets
    import string
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(8))


def _resolve_referral_code(code: str) -> str | None:
    """Return user_id of the referral code owner, or None if not found."""
    resp = db.table("users").select("id").eq("referral_code", code.upper()).execute()
    return resp.data[0]["id"] if resp.data else None


def _award_referral_signup_points(referrer_id: str, referee_name: str) -> None:
    """Award instant 10 points to referrer when their referee signs up."""
    current = db.table("users").select("points").eq("id", referrer_id).single().execute()
    current_pts = current.data.get("points", 0) if current.data else 0
    db.table("users").update({"points": current_pts + 10}).eq("id", referrer_id).execute()
    db.table("points_ledger").insert({
        "user_id":     referrer_id,
        "points":      10,
        "type":        "referral_signup",
        "description": f"Referral signup bonus — {referee_name} joined using your code",
    }).execute()
