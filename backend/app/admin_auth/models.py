"""
admin_auth/models.py — Pydantic schemas for admin authentication.
"""
from pydantic import BaseModel, Field
from typing import Optional


class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)


class AdminChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class AdminCreateRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: str
    full_name: str = Field(..., min_length=2)
    password: str = Field(..., min_length=8)
    role: str = "admin"   # "admin" | "superadmin"


class AdminResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: dict


class MessageResponse(BaseModel):
    message: str
