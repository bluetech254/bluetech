from fastapi import APIRouter, HTTPException
from app.models.auth import (UserSignup, UserLogin, AdminLogin, ForgotPassword, 
                              ResetPassword, VerifyPhone, VerifyEmail, ResendCode,
                              AuthResponse, MessageResponse)
from app.services.auth_service import (signup_user, login_user, admin_login, 
                                       forgot_password, reset_password, verify_phone,
                                       verify_email, resend_verification_code, AuthException)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/signup", response_model=AuthResponse)
def signup(user: UserSignup):
    """
    Register a new user
    
    - **full_name**: User's full name
    - **phone_number**: Kenya phone number (254XXXXXXXXX format)
    - **email**: Optional email address
    - **password**: Minimum 6 characters
    
    Returns JWT token and verification code (sent via SMS in production)
    """
    try:
        result = signup_user(user)
        return result
    except AuthException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login", response_model=AuthResponse)
def login(credentials: UserLogin):
    """
    Login with phone number and password
    
    - **phone_number**: Kenya phone number (254XXXXXXXXX format)
    - **password**: User's password
    """
    try:
        result = login_user(credentials)
        return result
    except AuthException as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/login", response_model=AuthResponse)
def admin_login_endpoint(credentials: AdminLogin):
    """
    Admin login with username and password
    
    - **username**: Admin username
    - **password**: Admin password
    """
    try:
        result = admin_login(credentials)
        return result
    except AuthException as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password_endpoint(data: ForgotPassword):
    """
    Request password reset code
    
    - **phone_number**: User's phone number
    
    Sends 6-digit reset code via SMS (code shown in response for MVP testing)
    """
    try:
        result = forgot_password(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset-password", response_model=MessageResponse)
def reset_password_endpoint(data: ResetPassword):
    """
    Reset password with code
    
    - **phone_number**: User's phone number
    - **reset_code**: 6-digit code from forgot-password
    - **new_password**: New password (min 6 characters)
    """
    try:
        result = reset_password(data)
        return result
    except AuthException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-phone", response_model=MessageResponse)
def verify_phone_endpoint(data: VerifyPhone):
    """
    Verify phone number with code
    
    - **phone_number**: User's phone number
    - **verification_code**: 6-digit code from signup
    """
    try:
        result = verify_phone(data)
        return result
    except AuthException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-email", response_model=MessageResponse)
def verify_email_endpoint(data: VerifyEmail):
    """
    Verify email with code
    
    - **email**: User's email
    - **verification_code**: 6-digit code sent to email
    """
    try:
        result = verify_email(data)
        return result
    except AuthException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/resend-code", response_model=MessageResponse)
def resend_code_endpoint(data: ResendCode):
    """
    Resend verification code
    
    - **phone_number**: User's phone number
    
    Sends new 6-digit verification code via SMS
    """
    try:
        result = resend_verification_code(data.phone_number)
        return result
    except AuthException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
