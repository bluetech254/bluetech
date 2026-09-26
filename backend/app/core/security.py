"""
core/security.py — All cryptographic operations for the entire backend.

Covers:
- Password hashing (bcrypt) with SHA-256 migration fallback
- JWT creation and decoding (separate client vs admin tokens)
- OTP generation and hashing
"""
import hashlib
import secrets
import random
import os
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import settings

# ── bcrypt context ────────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── JWT config ────────────────────────────────────────────────────────────────
ALGORITHM = "HS256"
CLIENT_TOKEN_EXPIRE_MINUTES = 7 * 24 * 60   # 7 days
ADMIN_TOKEN_EXPIRE_MINUTES  = 8 * 60         # 8 hours


# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Hash a password with bcrypt. Use this for all new passwords."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a bcrypt password hash."""
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def _sha256_verify(plain: str, stored: str) -> bool:
    """
    Verify a legacy SHA-256+salt hash (format: '<salt>$<hex_digest>').
    Only used during the migration window — never for new passwords.
    """
    try:
        salt, digest = stored.split("$", 1)
        return hashlib.sha256((plain + salt).encode()).hexdigest() == digest
    except Exception:
        return False


def verify_and_rehash(plain: str, stored_hash: str, user_id: str, table: str) -> bool:
    """
    Try bcrypt first. If that fails, try the old SHA-256 format.
    On a successful legacy match, transparently re-hash with bcrypt and
    write the new hash back to the database.

    This gives zero-downtime password migration — users log in once and
    their hash is silently upgraded. No forced password resets needed.
    """
    # Fast path — already bcrypt
    if verify_password(plain, stored_hash):
        return True

    # Legacy SHA-256 fallback
    if _sha256_verify(plain, stored_hash):
        # Re-hash with bcrypt immediately
        new_hash = hash_password(plain)
        try:
            from core.database import supabase_admin
            supabase_admin.table(table).update({"password": new_hash}).eq("id", user_id).execute()
        except Exception:
            pass  # non-critical — will retry on next login
        return True

    return False


# ── JWT tokens ────────────────────────────────────────────────────────────────

def create_client_token(user_id: str, phone: str) -> str:
    """
    Create a JWT for a client (customer).
    Expires in 7 days. Contains 'type': 'client' to prevent use on admin endpoints.
    """
    payload = {
        "sub": user_id,
        "phone": phone,
        "type": "client",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=CLIENT_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_admin_token(admin_id: str, username: str, role: str) -> str:
    """
    Create a JWT for an admin.
    Expires in 8 hours. Contains 'type': 'admin' to prevent use on client endpoints.
    """
    payload = {
        "admin_id": admin_id,
        "username": username,
        "role": role,
        "type": "admin",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=ADMIN_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT. Returns the payload dict or None if invalid/expired.
    Never raises — callers check for None.
    """
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ── OTP utilities ─────────────────────────────────────────────────────────────

def generate_otp() -> str:
    """Generate a 6-digit numeric OTP code."""
    return "".join([str(random.randint(0, 9)) for _ in range(6)])


def hash_otp(code: str) -> str:
    """
    Hash an OTP before storing in the database.
    SHA-256 is acceptable here — OTPs are short-lived (minutes) and
    the plaintext is only 6 digits, so we pair with expiry enforcement.
    """
    return hashlib.sha256(code.encode()).hexdigest()


def verify_otp(submitted: str, stored_hash: str) -> bool:
    """Verify a submitted OTP against its stored hash."""
    return hashlib.sha256(submitted.encode()).hexdigest() == stored_hash
