from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional
from app.utils.validators import validate_kenya_phone

class UserSignup(BaseModel):
    full_name: str = Field(..., min_length=2)
    phone_number: str
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=6)
    referral_code: Optional[str] = None   # referral code from an existing user

    @field_validator('phone_number')
    def normalize_phone(cls, v):
        return validate_kenya_phone(v)

class UserLogin(BaseModel):
    phone_number: str
    password: str
    
    @field_validator('phone_number')
    def normalize_phone(cls, v):
        return validate_kenya_phone(v)

class AdminLogin(BaseModel):
    username: str
    password: str

class ForgotPassword(BaseModel):
    phone_number: str
    
    @field_validator('phone_number')
    def normalize_phone(cls, v):
        return validate_kenya_phone(v)

class ResetPassword(BaseModel):
    phone_number: str
    reset_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)
    
    @field_validator('phone_number')
    def normalize_phone(cls, v):
        return validate_kenya_phone(v)

class VerifyPhone(BaseModel):
    phone_number: str
    verification_code: str = Field(..., min_length=6, max_length=6)
    
    @field_validator('phone_number')
    def normalize_phone(cls, v):
        return validate_kenya_phone(v)

class VerifyEmail(BaseModel):
    email: EmailStr
    verification_code: str = Field(..., min_length=6, max_length=6)

class ResendCode(BaseModel):
    phone_number: str
    
    @field_validator('phone_number')
    def normalize_phone(cls, v):
        return validate_kenya_phone(v)

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class MessageResponse(BaseModel):
    message: str
    code: Optional[str] = None  # For dev/testing only
