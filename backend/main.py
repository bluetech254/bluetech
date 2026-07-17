from fastapi import FastAPI, HTTPException, Depends, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from starlette.authentication import AuthCredentials
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from typing import List, Optional
from pydantic import BaseModel, EmailStr, validator
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
import re
import logging

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="Blue Technology API",
    description="Backend API for electronics repair booking and e-commerce platform",
    version="1.0.0"
)
app.state.limiter = limiter

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173", "https://bluetechadmin.vercel.app", "https://bluetech-client.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY")
)

# Auth
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_EXPIRE_MINUTES", 60))

def create_access_token(user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": exp, "iat": datetime.utcnow()}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(credentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== SCHEMAS ====================

class ProductCreate(BaseModel):
    title: str
    description: str
    price: float
    stock_quantity: int = 10
    specifications: dict = {}
    image_url: Optional[str] = None
    is_active: bool = True

class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int

class OrderCreate(BaseModel):
    full_name: str
    phone_number: str
    email: Optional[str] = None
    delivery_address: str
    delivery_zone: str
    items: List[OrderItemCreate]
    notes: Optional[str] = None

class BookingCreate(BaseModel):
    full_name: str
    phone_number: str
    device_type: str
    device_model: Optional[str] = None
    issue_description: str
    fulfillment_type: str  # 'dropoff' or 'pickup'
    pickup_address: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str

class LoginRequest(BaseModel):
    username: str  # email or phone
    password: str

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    phone_number: str
    password: str
    
    @validator('full_name')
    def validate_full_name(cls, v):
        if len(v) < 2 or len(v) > 100:
            raise ValueError('Full name must be 2-100 characters')
        if not re.match(r'^[a-zA-Z\s\-\']+$', v):
            raise ValueError('Full name contains invalid characters')
        return v.strip()
    
    @validator('email')
    def validate_email(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Invalid email format')
        return v.lower().strip()
    
    @validator('phone_number')
    def validate_phone(cls, v):
        if not re.match(r'^\+?[0-9]{10,15}$', v):
            raise ValueError('Invalid phone number format')
        return v.strip()
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain number')
        if not re.search(r'[!@#$%^&*]', v):
            raise ValueError('Password must contain special character (!@#$%^&*)')
        return v

# ==================== PRODUCTS ====================

@app.get("/")
def root():
    return {"message": "Blue Technology API", "docs": "/docs"}

@app.get("/api/v1/products")
def get_products(search: Optional[str] = None, active_only: bool = True):
    """Get all products with optional search"""
    query = supabase.table("products").select("*")
    
    if active_only:
        query = query.eq("is_active", True)
    
    if search:
        query = query.ilike("title", f"%{search}%")
    
    response = query.order("created_at", desc=True).execute()
    return {"data": response.data, "count": len(response.data)}

@app.get("/api/v1/products/{product_id}")
def get_product(product_id: str):
    """Get single product by ID"""
    response = supabase.table("products").select("*").eq("id", product_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return response.data

@app.post("/api/v1/products")
def create_product(product: ProductCreate):
    """Create new product (Admin)"""
    response = supabase.table("products").insert(product.dict()).execute()
    return response.data[0]

@app.put("/api/v1/products/{product_id}")
def update_product(product_id: str, product: ProductCreate):
    """Update product (Admin)"""
    response = supabase.table("products").update(product.dict()).eq("id", product_id).execute()
    return response.data[0]

@app.delete("/api/v1/products/{product_id}")
def delete_product(product_id: str):
    """Deactivate product (Admin)"""
    response = supabase.table("products").update({"is_active": False}).eq("id", product_id).execute()
    return {"message": "Product deactivated", "data": response.data[0]}

# ==================== ORDERS ====================

@app.post("/api/v1/orders")
def create_order(order: OrderCreate, user_id: str = Depends(verify_token)):
    """Create new order with items"""
    # Get products to calculate prices
    product_ids = [item.product_id for item in order.items]
    products_response = supabase.table("products").select("*").in_("id", product_ids).execute()
    products = {p["id"]: p for p in products_response.data}
    
    # Calculate totals
    subtotal = sum(products[item.product_id]["price"] * item.quantity for item in order.items)
    
    # Get delivery fee
    zone_response = supabase.table("delivery_zones").select("delivery_fee").eq("zone_name", order.delivery_zone).single().execute()
    delivery_fee = zone_response.data["delivery_fee"]
    
    total_amount = subtotal + delivery_fee
    
    # Create order
    order_data = {
        "full_name": order.full_name,
        "phone_number": order.phone_number,
        "email": order.email,
        "delivery_address": order.delivery_address,
        "delivery_zone": order.delivery_zone,
        "delivery_fee": delivery_fee,
        "subtotal": subtotal,
        "total_amount": total_amount,
        "status": "pending",
        "payment_status": "unpaid",
        "notes": order.notes
    }
    
    order_response = supabase.table("orders").insert(order_data).execute()
    order_id = order_response.data[0]["id"]
    
    # Create order items
    order_items = []
    for item in order.items:
        product = products[item.product_id]
        order_items.append({
            "order_id": order_id,
            "product_id": item.product_id,
            "product_title": product["title"],
            "quantity": item.quantity,
            "unit_price": product["price"],
            "total_price": product["price"] * item.quantity
        })
    
    supabase.table("order_items").insert(order_items).execute()

    # SMS confirmation
    try:
        from app.utils.sms_service import send_sms
        short_id = order_id[:8].upper()
        items_summary = ", ".join(f"{item.quantity}x {products[item.product_id]['title']}" for item in order.items)
        msg = (
            f"BlueTech Order Confirmed!\n"
            f"Order ID: {short_id}\n"
            f"Items: {items_summary}\n"
            f"Subtotal: KES {subtotal:,.0f}\n"
            f"Delivery: KES {delivery_fee:,.0f}\n"
            f"Total: KES {total_amount:,.0f}\n"
            f"Delivery to: {order.delivery_address}\n"
            f"We'll contact you to confirm delivery. Thank you!"
        )
        send_sms(order.phone_number, msg)
    except Exception as e:
        logger.warning(f"Order SMS failed: {e}")

    return order_response.data[0]

@app.get("/api/v1/orders")
def get_orders(status: Optional[str] = None, user_id: str = Depends(verify_token)):
    """Get user's orders"""
    query = supabase.table("orders").select("*, order_items(*)").eq("user_id", user_id)
    
    if status:
        query = query.eq("status", status)
    
    response = query.order("created_at", desc=True).execute()
    return {"data": response.data, "count": len(response.data)}

@app.get("/api/v1/orders/{order_id}")
def get_order(order_id: str):
    """Get single order with items"""
    response = supabase.table("orders").select("*, order_items(*)").eq("id", order_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return response.data

@app.get("/api/v1/orders/track/{phone}")
def track_orders(phone: str):
    """Track orders by phone number"""
    response = supabase.table("orders").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
    return {"data": response.data, "count": len(response.data)}

@app.put("/api/v1/orders/{order_id}/status")
def update_order_status(order_id: str, status_update: StatusUpdate):
    """Update order status (Admin)"""
    response = supabase.table("orders").update({"status": status_update.status}).eq("id", order_id).execute()
    return response.data[0]

# ==================== BOOKINGS ====================

@app.post("/api/v1/bookings")
def create_booking(booking: BookingCreate, user_id: str = Depends(verify_token)):
    """Create new repair booking"""
    booking_data = booking.dict()
    booking_data["status"] = "pending"
    
    response = supabase.table("bookings").insert(booking_data).execute()
    created = response.data[0]

    # SMS confirmation
    try:
        from app.utils.sms_service import send_sms
        short_id = created["id"][:8].upper()
        location = f"Pickup from: {booking.pickup_address}" if booking.fulfillment_type == "pickup" else "Drop-off at our shop"
        msg = (
            f"BlueTech Repair Booked!\n"
            f"Booking ID: {short_id}\n"
            f"Device: {booking.device_type}{' - ' + booking.device_model if booking.device_model else ''}\n"
            f"Issue: {booking.issue_description[:60]}\n"
            f"Type: {booking.fulfillment_type.capitalize()} | {location}\n"
            f"Our team will reach out to confirm your appointment. Thank you!"
        )
        send_sms(booking.phone_number, msg)
    except Exception as e:
        logger.warning(f"Booking SMS failed: {e}")

    return created

@app.get("/api/v1/bookings")
def get_bookings(status: Optional[str] = None, user_id: str = Depends(verify_token)):
    """Get user's bookings"""
    query = supabase.table("bookings").select("*").eq("user_id", user_id)
    
    if status:
        query = query.eq("status", status)
    
    response = query.order("created_at", desc=True).execute()
    return {"data": response.data, "count": len(response.data)}

@app.get("/api/v1/bookings/{booking_id}")
def get_booking(booking_id: str):
    """Get single booking"""
    response = supabase.table("bookings").select("*").eq("id", booking_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return response.data

@app.get("/api/v1/bookings/track/{phone}")
def track_bookings(phone: str):
    """Track bookings by phone number"""
    response = supabase.table("bookings").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
    return {"data": response.data, "count": len(response.data)}

@app.put("/api/v1/bookings/{booking_id}/status")
def update_booking_status(booking_id: str, status_update: StatusUpdate):
    """Update booking status (Admin)"""
    response = supabase.table("bookings").update({"status": status_update.status}).eq("id", booking_id).execute()
    return response.data[0]

# ==================== DELIVERY ZONES ====================

@app.get("/api/v1/delivery-zones")
def get_delivery_zones():
    """Get all active delivery zones"""
    response = supabase.table("delivery_zones").select("*").eq("is_active", True).execute()
    return {"data": response.data, "count": len(response.data)}

# ==================== REPAIR SERVICES ====================

@app.get("/api/v1/repair-services")
def get_repair_services(category: Optional[str] = None, active_only: bool = True):
    """Get all repair services with optional category filter"""
    query = supabase.table("repair_services").select("*")
    
    if active_only:
        query = query.eq("is_active", True)
    
    if category:
        query = query.eq("service_category", category)
    
    response = query.order("service_name").execute()
    return {"data": response.data, "count": len(response.data)}

@app.get("/api/v1/repair-services/categories")
def get_repair_service_categories():
    """Get unique service categories"""
    response = supabase.table("repair_services").select("service_category").eq("is_active", True).execute()
    categories = list(set([item["service_category"] for item in response.data if item.get("service_category")]))
    return {"data": categories, "count": len(categories)}

@app.get("/api/v1/repair-services/{service_id}")
def get_repair_service(service_id: str):
    """Get single repair service by ID"""
    response = supabase.table("repair_services").select("*").eq("id", service_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Service not found")
    return response.data[0]

# ==================== REPAIR SERVICES ====================

@app.get("/api/v1/repair-services")
def get_repair_services(category: Optional[str] = None, active_only: bool = True):
    """Get all repair services with optional category filter"""
    query = supabase.table("repair_services").select("*")
    
    if active_only:
        query = query.eq("is_active", True)
    
    if category:
        query = query.eq("service_category", category)
    
    response = query.order("service_name").execute()
    return {"data": response.data, "count": len(response.data)}

@app.get("/api/v1/repair-services/categories")
def get_repair_service_categories():
    """Get unique service categories"""
    response = supabase.table("repair_services").select("service_category").eq("is_active", True).execute()
    categories = list(set([item["service_category"] for item in response.data if item.get("service_category")]))
    return {"data": categories, "count": len(categories)}

@app.get("/api/v1/repair-services/{service_id}")
def get_repair_service_2(service_id: str):
    """Get single repair service by ID"""
    response = supabase.table("repair_services").select("*").eq("id", service_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Service not found")
    return response.data[0]

# ==================== AUTHENTICATION ====================

@app.post("/api/v1/auth/register")
@limiter.limit("5/minute")
def register_user(request: Request, body: RegisterRequest, response: Response):
    """Register new user"""
    try:
        from app.utils.sms_service import send_sms
        from app.utils.auth import generate_verification_code

        # Check if user already exists
        existing = supabase.table("users").select("*").or_(f"email.eq.{body.email},phone_number.eq.{body.phone_number}").execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="User with this email or phone already exists")
        
        hashed_password = pwd_context.hash(body.password)
        verification_code = generate_verification_code()

        user_data = {
            "full_name": body.full_name,
            "email": body.email,
            "phone_number": body.phone_number,
            "password": hashed_password,
            "phone_verified": False,
            "verification_code": verification_code,
        }
        
        resp = supabase.table("users").insert(user_data).execute()
        user = resp.data[0]

        send_sms(body.phone_number, f"Your BlueTech verification code is: {verification_code}")
        
        token = create_access_token(user["id"])
        
        response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="strict", max_age=86400)
        
        return {
            "user": {
                "id": user["id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "phone_number": user["phone_number"],
                "phone_verified": False,
            },
            "access_token": token,
            "token_type": "bearer", "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "message": "Registration successful. Please verify your phone number."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise

@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")
def login_user(request: Request, body: LoginRequest, response: Response):
    """Login user"""
    try:
        # Find user by email or phone
        resp = supabase.table("users").select("*").or_(f"email.eq.{body.username},phone_number.eq.{body.username}").execute()
        
        if not resp.data:
            logger.warning(f"Login attempt with non-existent user: {body.username}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user = resp.data[0]
        
        # Verify password with bcrypt
        if not pwd_context.verify(body.password, user["password"]):
            logger.warning(f"Failed login attempt for user: {user['id']}")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Block unverified users and resend OTP
        if not user.get("phone_verified"):
            from app.utils.sms_service import send_sms
            from app.utils.auth import generate_verification_code
            new_code = generate_verification_code()
            supabase.table("users").update({"verification_code": new_code}).eq("id", user["id"]).execute()
            send_sms(user["phone_number"], f"Your BlueTech verification code is: {new_code}")
            raise HTTPException(
                status_code=403,
                detail={"message": "Phone not verified. A new code has been sent.", "phone_number": user["phone_number"]}
            )
        
        # Generate JWT token
        token = create_access_token(user["id"])
        
        # Audit log
        logger.info(f"User logged in: {user['id']} ({user['email']})")
        
        # Set httpOnly cookie
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=False,  # set True in production (HTTPS)
            samesite="lax",
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        return {
            "user": {
                "id": user["id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "phone_number": user["phone_number"],
                "created_at": user["created_at"]
            },
            "access_token": token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")

@app.post("/api/v1/auth/logout")
def logout_user(response: Response):
    """Logout user"""
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}

@app.post("/api/v1/auth/resend-verification")
def resend_verification(phone_number: str):
    """Resend phone verification OTP"""
    from app.utils.sms_service import send_sms
    from app.utils.auth import generate_verification_code
    resp = supabase.table("users").select("id, phone_verified").eq("phone_number", phone_number).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="User not found")
    if resp.data[0].get("phone_verified"):
        raise HTTPException(status_code=400, detail="Phone already verified")
    code = generate_verification_code()
    supabase.table("users").update({"verification_code": code}).eq("id", resp.data[0]["id"]).execute()
    send_sms(phone_number, f"Your BlueTech verification code is: {code}")
    return {"message": "Verification code resent"}

@app.post("/api/v1/auth/verify-phone")
def verify_phone_endpoint(phone_number: str, verification_code: str):
    """Verify phone number with OTP"""
    resp = supabase.table("users").select("*").eq("phone_number", phone_number).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = resp.data[0]
    if user.get("verification_code") != verification_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    supabase.table("users").update({
        "phone_verified": True,
        "verification_code": None
    }).eq("id", user["id"]).execute()

    token = create_access_token(user["id"])
    return {
        "message": "Phone verified successfully",
        "access_token": token,
        "token_type": "bearer", "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "phone_number": user["phone_number"],
            "phone_verified": True,
        }
    }

@app.post("/api/v1/auth/password-reset")
@limiter.limit("3/minute")
def request_password_reset(request: Request, phone_number: str):
    """Request password reset via SMS OTP"""
    from app.utils.sms_service import send_sms
    from app.utils.auth import generate_verification_code

    resp = supabase.table("users").select("id, phone_number").eq("phone_number", phone_number).execute()
    if not resp.data:
        return {"message": "If this number exists, a reset code has been sent"}
    
    user = resp.data[0]
    reset_code = generate_verification_code()
    expires = (datetime.utcnow() + timedelta(hours=1)).isoformat()

    supabase.table("users").update({
        "reset_code": reset_code,
        "reset_code_expires": expires
    }).eq("id", user["id"]).execute()

    send_sms(phone_number, f"Your BlueTech password reset code is: {reset_code}")

    return {"message": "If this number exists, a reset code has been sent"}

@app.post("/api/v1/auth/reset-password")
def reset_password(phone_number: str, reset_code: str, new_password: str):
    """Reset password with SMS OTP code"""
    resp = supabase.table("users").select("*").eq("phone_number", phone_number).execute()
    if not resp.data:
        raise HTTPException(status_code=400, detail="Invalid phone number or code")
    
    user = resp.data[0]

    if user.get("reset_code") != reset_code:
        raise HTTPException(status_code=400, detail="Invalid reset code")

    if user.get("reset_code_expires"):
        expires = datetime.fromisoformat(user["reset_code_expires"].replace("Z", "+00:00"))
        if datetime.utcnow() > expires.replace(tzinfo=None):
            raise HTTPException(status_code=400, detail="Reset code expired")

    hashed_password = pwd_context.hash(new_password)
    supabase.table("users").update({
        "password_hash": hashed_password,
        "reset_code": None,
        "reset_code_expires": None
    }).eq("id", user["id"]).execute()

    return {"message": "Password reset successfully"}

@app.post("/api/v1/auth/send-verification")
@limiter.limit("3/minute")
def send_verification_email(request: Request, email: str):
    """Send email verification link"""
    resp = supabase.table("users").select("*").eq("email", email).execute()
    
    if not resp.data:
        return {"message": "If email exists, verification link sent"}
    
    user = resp.data[0]
    
    if user.get("email_verified"):
        return {"message": "Email already verified"}
    
    # Generate verification token (valid for 24 hours)
    verify_token = jwt.encode(
        {"sub": user["id"], "type": "verify", "exp": datetime.utcnow() + timedelta(hours=24)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    # In production: send email with verification link
    return {"message": "If email exists, verification link sent", "verify_token": verify_token}

@app.post("/api/v1/auth/verify-email")
def verify_email(verify_token: str):
    """Verify email with token"""
    try:
        payload = jwt.decode(verify_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "verify":
            raise HTTPException(status_code=400, detail="Invalid token")
        
        user_id = payload.get("sub")
        supabase.table("users").update({"email_verified": True}).eq("id", user_id).execute()
        
        return {"message": "Email verified successfully"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Verification token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid token")

# ==================== USER ENDPOINTS ====================

@app.get("/api/v1/users/me")
def get_current_user(authorization: Optional[str] = None):
    """Get current user (requires token)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    user_id = token.replace("token_", "")
    
    response = supabase.table("users").select("*").eq("id", user_id).single().execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = response.data
    return {
        "id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "phone_number": user["phone_number"],
        "created_at": user["created_at"]
    }

# ==================== TRACKING ====================

@app.get("/api/v1/track/{phone}")
def track_all(phone: str):
    """Track all orders and bookings by phone number"""
    orders = supabase.table("orders").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
    bookings = supabase.table("bookings").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
    
    return {
        "phone_number": phone,
        "orders": orders.data,
        "bookings": bookings.data
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
