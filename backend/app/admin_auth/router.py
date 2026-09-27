"""
admin_auth/router.py — All admin authentication HTTP routes.

Rate limiting on /login (5/minute).
All business logic delegated to admin_auth/service.py.
Superadmin-only endpoints enforce role via require_superadmin dependency.
"""
import logging
from fastapi import APIRouter, HTTPException, Request, Depends

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.exceptions import AuthException
from admin_auth.models import (
    AdminLoginRequest,
    AdminChangePasswordRequest,
    AdminCreateRequest,
)
from admin_auth.dependencies import get_current_admin, require_superadmin
from admin_auth import service

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/v1/admin/auth", tags=["Admin Authentication"])


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login")
@limiter.limit("5/minute")
def admin_login(request: Request, body: AdminLoginRequest):
    """
    Admin-only login. Returns 8-hour JWT with role claim.
    Generic error — does not reveal whether username exists.
    """
    try:
        return service.admin_login(body)
    except AuthException as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")


# ── Profile ───────────────────────────────────────────────────────────────────

@router.get("/me")
def get_me(admin: dict = Depends(get_current_admin)):
    """Return current admin's profile from the database."""
    try:
        return service.get_admin_profile(admin["admin_id"])
    except AuthException as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout")
def logout(admin: dict = Depends(get_current_admin)):
    """
    Stateless JWT logout — instructs the client to discard the token.
    Logs the event server-side for audit purposes.
    """
    logger.info(f"Admin logout: {admin.get('username')} ({admin.get('admin_id')})")
    return {"message": "Logged out successfully"}


# ── Change password ───────────────────────────────────────────────────────────

@router.post("/change-password")
def change_password(body: AdminChangePasswordRequest, admin: dict = Depends(get_current_admin)):
    """Change own admin password. Requires current password verification."""
    try:
        return service.change_password(admin["admin_id"], body, admin)
    except AuthException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Change password error: {e}")
        raise HTTPException(status_code=500, detail="Failed to change password.")


# ── Create admin (superadmin only) ────────────────────────────────────────────

@router.post("/create-admin")
def create_admin(body: AdminCreateRequest, admin: dict = Depends(require_superadmin)):
    """Create a new admin account. Superadmin only."""
    try:
        return service.create_admin(body, admin)
    except AuthException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Create admin error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create admin.")


# ── Deactivate admin (superadmin only) ────────────────────────────────────────

@router.put("/deactivate/{admin_id}")
def deactivate_admin(admin_id: str, admin: dict = Depends(require_superadmin)):
    """Deactivate an admin account. Superadmin only. Cannot deactivate self."""
    try:
        return service.deactivate_admin(admin_id, admin)
    except AuthException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Deactivate admin error: {e}")
        raise HTTPException(status_code=500, detail="Failed to deactivate admin.")


# ── List admins (superadmin only) ─────────────────────────────────────────────

@router.get("/list")
def list_admins(admin: dict = Depends(require_superadmin)):
    """List all admin accounts. Superadmin only."""
    try:
        return service.list_admins()
    except Exception as e:
        logger.error(f"List admins error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch admins.")


# ── Toggle client user active (any admin) ────────────────────────────────────

@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(user_id: str, is_active: bool, admin: dict = Depends(get_current_admin)):
    """Activate or deactivate a client user account."""
    try:
        return service.toggle_user_active(user_id, is_active, admin)
    except Exception as e:
        logger.error(f"Toggle user error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user.")
