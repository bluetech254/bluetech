"""
auth/models.py — Pydantic schemas for client authentication.

All input validation lives here. Phone normalization is applied at schema
level so services always receive a clean 254XXXXXXXXX format number.
"""
import re
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional


# ── Phone normalizer (reused across schemas) ──────────────────────────────────

def _normalize_kenya_phone(phone: str) -> str:
    """
    Normalize a Kenya phone number to 254XXXXXXXXX format.
    Accepts: 0712345678, +254712345678, 254712345678
    """
    phone = re.sub(r"[\s\-\(\)]", "", phone)
    if phone.startswith("+"):
        phone = phone[1:]
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    if not re.match(r"^254[0-9]{9}$", phone):
        raise ValueError(f"Invalid Kenya phone number: {phone}. Use format 0712345678 or 254712345678")
    return phone


# ── Request schemas ───────────────────────────────────────────────────────────

class UserSignup(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    phone_number: str
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=6)
    referral_code: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        return _normalize_kenya_phone(v)


class UserLogin(BaseModel):
    phone_number: str
    password: str

    @field_validator("phone_number")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        return _normalize_kenya_phone(v)


class ForgotPassword(BaseModel):
    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        return _normalize_kenya_phone(v)


class ResetPassword(BaseModel):
    phone_number: str
    reset_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)

    @field_validator("phone_number")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        return _normalize_kenya_phone(v)


class VerifyPhone(BaseModel):
    phone_number: str
    verification_code: str = Field(..., min_length=6, max_length=6)

    @field_validator("phone_number")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        return _normalize_kenya_phone(v)


class VerifyEmail(BaseModel):
    email: EmailStr
    verification_code: str = Field(..., min_length=6, max_length=6)


class ResendCode(BaseModel):
    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        return _normalize_kenya_phone(v)


# ── Response schemas ──────────────────────────────────────────────────────────

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class MessageResponse(BaseModel):
    message: str
