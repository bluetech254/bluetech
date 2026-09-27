"""
auth/dependencies.py — FastAPI dependencies for client authentication.

Two dependencies:
  get_current_user    — requires a valid client JWT, raises 401 if missing/invalid
  get_optional_user   — returns user_id if token present, None for guest requests

Import these in any router that needs to know who the client is.
Never re-define auth logic in individual routers.
"""
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.security import decode_token

_security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> str:
    """
    Require a valid client JWT. Returns the user_id (str UUID).
    Raises HTTP 401 if:
      - No Authorization header
      - Token is invalid or expired
      - Token type is not 'client' (blocks admin tokens from client endpoints)
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = decode_token(credentials.credentials)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if payload.get("type") != "client":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return user_id


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> Optional[str]:
    """
    Return user_id if a valid client token is present, otherwise None.
    Use on endpoints that support both authenticated and guest access
    (e.g. order creation — guests can order, logged-in users earn points).
    Never raises.
    """
    if not credentials:
        return None

    payload = decode_token(credentials.credentials)

    if not payload or payload.get("type") != "client":
        return None

    return payload.get("sub")
