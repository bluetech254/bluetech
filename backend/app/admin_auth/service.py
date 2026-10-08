"""
admin_auth/service.py — Admin authentication business logic.

Security fixes applied:
- verify_and_rehash() transparently upgrades SHA-256 → bcrypt on first login
- create_admin_token() issues 8-hour tokens (not 30-day)
- Generic error on login — no username enumeration
- Superadmin required to create or deactivate other admins
- Cannot deactivate own account
"""
import logging
from datetime import datetime

from admin_auth.models import (
    AdminChangePasswordRequest,
    AdminCreateRequest,
    AdminLoginRequest,
)
from core.audit import log_action
from core.db import db
from core.exceptions import AuthException
from core.security import create_admin_token, hash_password, verify_and_rehash

logger = logging.getLogger(__name__)


# ── Login ─────────────────────────────────────────────────────────────────────

def admin_login(data: AdminLoginRequest) -> dict:
    """
    Authenticate an admin.
    - Only active accounts can log in (is_active=True filter)
    - Generic 'Invalid credentials' — never reveals if username exists
    - verify_and_rehash() upgrades old SHA-256 hashes to bcrypt silently
    - Updates last_login timestamp
    - Returns 8-hour admin JWT
    """
    resp = db.table("admins").select("*") \
        .eq("username", data.username) \
        .eq("is_active", True) \
        .execute()

    # Generic error — same for wrong username OR wrong password
    if not resp.data:
        logger.warning(f"Failed admin login — username not found: {data.username}")
        raise AuthException("Invalid credentials")

    admin = resp.data[0]

    if not verify_and_rehash(data.password, admin.get("password", ""), admin["id"], "admins"):
        logger.warning(f"Failed admin login — bad password: {data.username}")
        raise AuthException("Invalid credentials")

    # Update last_login
    try:
        db.table("admins").update({
            "last_login": datetime.utcnow().isoformat()
        }).eq("id", admin["id"]).execute()
    except Exception:
        pass  # non-critical

    logger.info(f"Admin login: {admin['username']} ({admin['id']})")

    token = create_admin_token(admin["id"], admin["username"], admin["role"])

    return {
        "access_token": token,
        "token_type":   "bearer",
        "admin": {
            "id":        admin["id"],
            "username":  admin["username"],
            "full_name": admin["full_name"],
            "email":     admin["email"],
            "role":      admin["role"],
        }
    }


# ── Profile ───────────────────────────────────────────────────────────────────

def get_admin_profile(admin_id: str) -> dict:
    """Fetch current admin's profile from DB (source of truth over token)."""
    resp = db.table("admins").select(
        "id, username, full_name, email, role, is_active, created_at, last_login"
    ).eq("id", admin_id).single().execute()

    if not resp.data:
        raise AuthException("Admin account not found")

    return resp.data


# ── Change password ───────────────────────────────────────────────────────────

def change_password(admin_id: str, data: AdminChangePasswordRequest, admin_payload: dict) -> dict:
    """Change admin password after verifying the current one."""
    resp = db.table("admins").select("password").eq("id", admin_id).single().execute()
    if not resp.data:
        raise AuthException("Admin not found")

    if not verify_and_rehash(data.current_password, resp.data["password"], admin_id, "admins"):
        raise AuthException("Current password is incorrect")

    db.table("admins").update({
        "password":   hash_password(data.new_password),
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", admin_id).execute()

    log_action(admin_payload, "admin.password_changed", f"admin:{admin_id}")
    logger.info(f"Admin password changed: {admin_payload.get('username')}")
    return {"message": "Password updated successfully"}


# ── Create admin (superadmin only) ────────────────────────────────────────────

def create_admin(data: AdminCreateRequest, acting_admin: dict) -> dict:
    """Create a new admin account. Superadmin only."""
    # Check username and email uniqueness
    existing = db.table("admins").select("id").or_(
        f"username.eq.{data.username},email.eq.{data.email}"
    ).execute()
    if existing.data:
        raise AuthException("Username or email already exists")

    if data.role not in ("admin", "superadmin"):
        raise AuthException("Role must be 'admin' or 'superadmin'")

    result = db.table("admins").insert({
        "username":  data.username,
        "email":     data.email,
        "full_name": data.full_name,
        "password":  hash_password(data.password),
        "role":      data.role,
        "is_active": True,
    }).execute()

    created = result.data[0]
    created.pop("password", None)   # never return password hash

    log_action(acting_admin, "admin.created", f"admin:{created['id']}", {
        "username": data.username, "role": data.role
    })
    logger.info(f"New admin created: {data.username} by {acting_admin.get('username')}")
    return {"message": "Admin created successfully", "admin": created}


# ── Deactivate admin (superadmin only) ────────────────────────────────────────

def deactivate_admin(target_admin_id: str, acting_admin: dict) -> dict:
    """Deactivate an admin account. Cannot deactivate own account."""
    if target_admin_id == acting_admin["admin_id"]:
        raise AuthException("Cannot deactivate your own account")

    db.table("admins").update({
        "is_active":  False,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", target_admin_id).execute()

    log_action(acting_admin, "admin.deactivated", f"admin:{target_admin_id}")
    logger.info(f"Admin deactivated: {target_admin_id} by {acting_admin.get('username')}")
    return {"message": "Admin account deactivated"}


# ── List admins (superadmin only) ─────────────────────────────────────────────

def list_admins() -> dict:
    """Return all admin accounts (without password hashes)."""
    resp = db.table("admins").select(
        "id, username, full_name, email, role, is_active, created_at, last_login"
    ).order("created_at", desc=True).execute()
    return resp.data or []


# ── Toggle client user active state ──────────────────────────────────────────

def toggle_user_active(user_id: str, is_active: bool, acting_admin: dict) -> dict:
    """Activate or deactivate a client user account."""
    db.table("users").update({
        "is_active":  is_active,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", user_id).execute()

    action = "activated" if is_active else "deactivated"
    log_action(acting_admin, f"user.{action}", f"user:{user_id}")
    logger.info(f"User {user_id} {action} by {acting_admin.get('username')}")
    return {"message": f"User {action} successfully"}
