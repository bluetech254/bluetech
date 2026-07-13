from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from starlette.authentication import AuthCredentials
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import jwt

load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="Blue Technology API",
    description="Backend API for electronics repair booking and e-commerce platform",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

def verify_token(credentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, os.getenv("SUPABASE_ANON_KEY"), algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
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
    return response.data[0]

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
    response = supabase.table("repair_services").select("*").eq("service_id", service_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Service not found")
    return response.data

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
    response = supabase.table("repair_services").select("*").eq("service_id", service_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Service not found")
    return response.data

# ==================== AUTHENTICATION ====================

@app.post("/api/v1/auth/register")
def register_user(request: RegisterRequest):
    """Register new user"""
    # Check if user already exists
    existing = supabase.table("customers").select("*").or_(f"email.eq.{request.email},phone_number.eq.{request.phone_number}").execute()
    
    if existing.data:
        raise HTTPException(status_code=400, detail="User with this email or phone already exists")
    
    # Create user (in production, hash the password!)
    user_data = {
        "full_name": request.full_name,
        "email": request.email,
        "phone_number": request.phone_number,
        "password_hash": request.password,  # In production: use bcrypt/argon2
        "is_active": True
    }
    
    response = supabase.table("customers").insert(user_data).execute()
    user = response.data[0]
    
    # Generate simple token (in production: use JWT)
    token = f"token_{user['id']}"
    
    return {
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "phone_number": user["phone_number"],
            "created_at": user["created_at"]
        },
        "token": token
    }

@app.post("/api/v1/auth/login")
def login_user(request: LoginRequest):
    """Login user"""
    # Find user by email or phone
    response = supabase.table("customers").select("*").or_(f"email.eq.{request.username},phone_number.eq.{request.username}").execute()
    
    if not response.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = response.data[0]
    
    # Check password (in production: use bcrypt.verify)
    if user["password_hash"] != request.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate simple token (in production: use JWT)
    token = f"token_{user['id']}"
    
    return {
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "phone_number": user["phone_number"],
            "created_at": user["created_at"]
        },
        "token": token
    }

@app.post("/api/v1/auth/logout")
def logout_user():
    """Logout user"""
    return {"message": "Logged out successfully"}

# ==================== USER ENDPOINTS ====================

@app.get("/api/v1/users/me")
def get_current_user(authorization: Optional[str] = None):
    """Get current user (requires token)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    user_id = token.replace("token_", "")
    
    response = supabase.table("customers").select("*").eq("id", user_id).single().execute()
    
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
