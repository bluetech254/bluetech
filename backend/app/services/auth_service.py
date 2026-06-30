from app.database import supabase, supabase_admin
from app.models.auth import UserSignup, UserLogin, AdminLogin, ForgotPassword, ResetPassword, VerifyPhone, VerifyEmail
from app.utils.auth import hash_password, verify_password, create_access_token, generate_verification_code
from app.utils.email_service import email_service
from app.utils.exceptions import BlueTechException
from datetime import datetime, timedelta

class AuthException(BlueTechException):
    pass

def signup_user(signup_data: UserSignup) -> dict:
    """Register new user"""
    # Check if phone exists
    existing_phone = supabase.table("users").select("id").eq("phone_number", signup_data.phone_number).execute()
    if existing_phone.data:
        raise AuthException("Phone number already registered")
    
    # Check if email exists
    if signup_data.email:
        existing_email = supabase.table("users").select("id").eq("email", signup_data.email).execute()
        if existing_email.data:
            raise AuthException("Email already registered")
    
    # Hash password
    hashed_password = hash_password(signup_data.password)
    
    # Create user - directly verified
    user_data = {
        "full_name": signup_data.full_name,
        "phone_number": signup_data.phone_number,
        "email": signup_data.email,
        "password": hashed_password,
        "is_verified": True,  # Auto-verified for now
        "phone_verified": True,  # Auto-verified for now
        "email_verified": True if signup_data.email else False
    }
    
    response = supabase.table("users").insert(user_data).execute()
    user = response.data[0]
    
    # Remove sensitive data
    user.pop("password", None)
    
    # Create token
    token = create_access_token({"user_id": user["id"], "phone": user["phone_number"]})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

def login_user(login_data: UserLogin) -> dict:
    """Login user"""
    response = supabase.table("users").select("*").eq("phone_number", login_data.phone_number).execute()
    if not response.data:
        raise AuthException("Invalid phone number or password")
    
    user = response.data[0]
    
    if not verify_password(login_data.password, user.get("password", "")):
        raise AuthException("Invalid phone number or password")
    
    # Update last login
    supabase_admin.table("users").update({"last_login": datetime.utcnow().isoformat()}).eq("id", user["id"]).execute()
    
    user.pop("password", None)
    user.pop("verification_code", None)
    user.pop("reset_code", None)
    
    token = create_access_token({"user_id": user["id"], "phone": user["phone_number"]})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

def admin_login(login_data: AdminLogin) -> dict:
    """Admin login"""
    response = supabase_admin.table("admins").select("*").eq("username", login_data.username).eq("is_active", True).execute()
    if not response.data:
        raise AuthException("Invalid credentials")
    
    admin = response.data[0]
    
    if not verify_password(login_data.password, admin.get("password", "")):
        raise AuthException("Invalid credentials")
    
    # Update last login
    supabase_admin.table("admins").update({"last_login": datetime.utcnow().isoformat()}).eq("id", admin["id"]).execute()
    
    admin.pop("password", None)
    
    token = create_access_token({"admin_id": admin["id"], "username": admin["username"], "role": admin["role"]})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": admin
    }

def forgot_password(data: ForgotPassword) -> dict:
    """Generate password reset code"""
    response = supabase.table("users").select("id, phone_number").eq("phone_number", data.phone_number).execute()
    if not response.data:
        # Don't reveal if user exists
        return {"message": "If this phone number exists, a reset code has been sent", "code": None}
    
    user = response.data[0]
    reset_code = generate_verification_code()
    expires = (datetime.utcnow() + timedelta(hours=1)).isoformat()
    
    supabase_admin.table("users").update({
        "reset_code": reset_code,
        "reset_code_expires": expires
    }).eq("id", user["id"]).execute()
    
    return {
        "message": "Reset code sent to your phone",
        "code": reset_code  # In production, send via SMS
    }

def reset_password(data: ResetPassword) -> dict:
    """Reset password with code"""
    response = supabase.table("users").select("*").eq("phone_number", data.phone_number).execute()
    if not response.data:
        raise AuthException("Invalid phone number or reset code")
    
    user = response.data[0]
    
    if user.get("reset_code") != data.reset_code:
        raise AuthException("Invalid reset code")
    
    if user.get("reset_code_expires"):
        expires = datetime.fromisoformat(user["reset_code_expires"].replace('Z', '+00:00'))
        if datetime.utcnow() > expires.replace(tzinfo=None):
            raise AuthException("Reset code expired")
    
    hashed_password = hash_password(data.new_password)
    
    supabase_admin.table("users").update({
        "password": hashed_password,
        "reset_code": None,
        "reset_code_expires": None
    }).eq("id", user["id"]).execute()
    
    return {"message": "Password reset successfully"}

def verify_phone(data: VerifyPhone) -> dict:
    """Verify phone number"""
    response = supabase.table("users").select("*").eq("phone_number", data.phone_number).execute()
    if not response.data:
        raise AuthException("User not found")
    
    user = response.data[0]
    
    if user.get("verification_code") != data.verification_code:
        raise AuthException("Invalid verification code")
    
    supabase_admin.table("users").update({
        "phone_verified": True,
        "is_verified": True,
        "verification_code": None
    }).eq("id", user["id"]).execute()
    
    return {"message": "Phone verified successfully"}

def verify_email(data: VerifyEmail) -> dict:
    """Verify email using Cognito"""
    response = supabase.table("users").select("*").eq("email", data.email).execute()
    if not response.data:
        raise AuthException("Email not found")
    
    user = response.data[0]
    
    # Verify with Cognito
    try:
        is_valid = cognito_service.verify_email_code(data.email, data.verification_code)
        if not is_valid:
            raise AuthException("Invalid verification code")
    except Exception as e:
        # Fallback to local verification
        if user.get("verification_code") != data.verification_code:
            raise AuthException("Invalid verification code")
    
    # Update local database
    supabase_admin.table("users").update({
        "email_verified": True,
        "verification_code": None
    }).eq("id", user["id"]).execute()
    
    return {"message": "Email verified successfully"}

def resend_verification_code(phone_number: str) -> dict:
    """Resend verification code"""
    response = supabase.table("users").select("id").eq("phone_number", phone_number).execute()
    if not response.data:
        raise AuthException("User not found")
    
    user = response.data[0]
    new_code = generate_verification_code()
    
    supabase_admin.table("users").update({"verification_code": new_code}).eq("id", user["id"]).execute()
    
    return {
        "message": "Verification code sent",
        "code": new_code  # In production, send via SMS
    }
