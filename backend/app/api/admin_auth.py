from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from app.database import supabase_admin
from app.utils.auth import verify_password, hash_password, create_access_token, decode_token, generate_verification_code
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(prefix="/api/v1/admin/auth", tags=["Admin Authentication"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=2)
    password: str = Field(..., min_length=6)

class AdminChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class AdminCreateRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: str
    full_name: str = Field(..., min_length=2)
    password: str = Field(..., min_length=8)
    role: str = "admin"  # admin | superadmin


# ── Dependency: verify admin JWT ─────────────────────────────────────────────

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or "admin_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired admin token")
    return payload

def require_superadmin(admin: dict = Depends(get_current_admin)) -> dict:
    if admin.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return admin


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login")
def admin_login(body: AdminLoginRequest):
    """
    Admin-only login. Returns JWT with role claim.
    Rate limit: handled at nginx/gateway level.
    """
    resp = supabase_admin.table("admins").select("*").eq("username", body.username).eq("is_active", True).execute()

    # Generic error — never reveal whether username exists
    if not resp.data or not verify_password(body.password, resp.data[0].get("password", "")):
        logger.warning(f"Failed admin login attempt for username: {body.username}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    admin = resp.data[0]

    # Update last_login timestamp
    supabase_admin.table("admins").update({
        "last_login": datetime.utcnow().isoformat()
    }).eq("id", admin["id"]).execute()

    token = create_access_token({
        "admin_id": admin["id"],
        "username": admin["username"],
        "role": admin["role"],
    })

    logger.info(f"Admin login: {admin['username']} ({admin['id']})")

    return {
        "access_token": token,
        "token_type": "bearer",
        "admin": {
            "id": admin["id"],
            "username": admin["username"],
            "full_name": admin["full_name"],
            "email": admin["email"],
            "role": admin["role"],
        }
    }


@router.get("/me")
def get_admin_profile(admin: dict = Depends(get_current_admin)):
    """Return current admin profile from token + DB."""
    resp = supabase_admin.table("admins").select(
        "id, username, full_name, email, role, is_active, created_at, last_login"
    ).eq("id", admin["admin_id"]).single().execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="Admin account not found")

    return resp.data


@router.post("/logout")
def admin_logout(admin: dict = Depends(get_current_admin)):
    """
    Stateless JWT logout — client must discard the token.
    Logs the event server-side.
    """
    logger.info(f"Admin logout: {admin.get('username')} ({admin.get('admin_id')})")
    return {"message": "Logged out successfully"}


@router.post("/change-password")
def change_password(body: AdminChangePasswordRequest, admin: dict = Depends(get_current_admin)):
    """Change admin password. Requires current password verification."""
    resp = supabase_admin.table("admins").select("password").eq("id", admin["admin_id"]).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Admin not found")

    if not verify_password(body.current_password, resp.data["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    supabase_admin.table("admins").update({
        "password": hash_password(body.new_password),
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", admin["admin_id"]).execute()

    logger.info(f"Admin password changed: {admin.get('username')}")
    return {"message": "Password updated successfully"}


@router.post("/create-admin")
def create_admin(body: AdminCreateRequest, admin: dict = Depends(require_superadmin)):
    """
    Create a new admin account. Superadmin only.
    """
    # Check uniqueness
    existing = supabase_admin.table("admins").select("id").or_(
        f"username.eq.{body.username},email.eq.{body.email}"
    ).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    new_admin = supabase_admin.table("admins").insert({
        "username": body.username,
        "email": body.email,
        "full_name": body.full_name,
        "password": hash_password(body.password),
        "role": body.role,
        "is_active": True,
    }).execute()

    created = new_admin.data[0]
    created.pop("password", None)

    logger.info(f"New admin created: {body.username} by {admin.get('username')}")
    return {"message": "Admin created successfully", "admin": created}


@router.put("/deactivate/{admin_id}")
def deactivate_admin(admin_id: str, admin: dict = Depends(require_superadmin)):
    """Deactivate an admin account. Superadmin only. Cannot deactivate self."""
    if admin_id == admin["admin_id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    supabase_admin.table("admins").update({
        "is_active": False,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", admin_id).execute()

    logger.info(f"Admin deactivated: {admin_id} by {admin.get('username')}")
    return {"message": "Admin account deactivated"}


@router.get("/list")
def list_admins(admin: dict = Depends(require_superadmin)):
    """List all admin accounts. Superadmin only."""
    resp = supabase_admin.table("admins").select(
        "id, username, full_name, email, role, is_active, created_at, last_login"
    ).order("created_at", desc=True).execute()
    return {"data": resp.data, "count": len(resp.data)}
