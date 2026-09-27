"""
admin_auth/dependencies.py — FastAPI dependencies for admin authentication.

Two dependencies:
  get_current_admin   — requires a valid admin JWT, raises 401 if missing/invalid
  require_superadmin  — additionally enforces role == 'superadmin'

The type='admin' check blocks client tokens from being used on admin
endpoints — a client JWT will always be rejected here even if valid.
"""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.security import decode_token

_security = HTTPBearer()


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> dict:
    """
    Require a valid admin JWT. Returns the full token payload dict.
    Raises HTTP 401 if:
      - No Authorization header
      - Token is invalid or expired
      - Token type is not 'admin' (blocks client tokens from admin endpoints)
    """
    payload = decode_token(credentials.credentials)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired admin token")

    if payload.get("type") != "admin":
        raise HTTPException(status_code=401, detail="Not an admin token")

    if "admin_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid admin token payload")

    return payload


def require_superadmin(
    admin: dict = Depends(get_current_admin),
) -> dict:
    """
    Require the admin to have role == 'superadmin'.
    Regular admins calling superadmin-only endpoints get HTTP 403.
    """
    if admin.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return admin
