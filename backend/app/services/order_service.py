from typing import List
from uuid import UUID
from decimal import Decimal
from app.database import supabase, supabase_admin
from app.models.order import OrderCreate, OrderItemCreate
from app.utils.exceptions import ProductNotFoundException, InsufficientStockException, DeliveryZoneNotFoundException, OrderNotFoundException

def calculate_order_totals(items: List[OrderItemCreate]) -> dict:
    """Calculate order totals"""
    product_ids = [str(item.product_id) for item in items]
    
    # Fetch products
    response = supabase.table("products").select("*").in_("id", product_ids).execute()
    products = {p["id"]: p for p in response.data}
    
    # Check all products exist
    for item in items:
        if str(item.product_id) not in products:
            raise ProductNotFoundException(f"Product {item.product_id} not found")
    
    # Calculate line totals
    line_items = []
    subtotal = Decimal(0)
    
    for item in items:
        product = products[str(item.product_id)]
        unit_price = Decimal(str(product["price"]))
        total_price = unit_price * item.quantity
        
        line_items.append({
            "product_id": str(item.product_id),
            "product_title": product["title"],
            "quantity": item.quantity,
            "unit_price": unit_price,
            "total_price": total_price
        })
        
        subtotal += total_price
    
    return {"subtotal": subtotal, "line_items": line_items}

def get_delivery_fee(zone_name: str) -> Decimal:
    """Get delivery fee for zone"""
    response = supabase.table("delivery_zones").select("delivery_fee").eq("zone_name", zone_name).eq("is_active", True).single().execute()
    if not response.data:
        raise DeliveryZoneNotFoundException(f"Delivery zone '{zone_name}' not found")
    return Decimal(str(response.data["delivery_fee"]))

def check_stock_availability(items: List[OrderItemCreate]):
    """Check if products have sufficient stock"""
    product_ids = [str(item.product_id) for item in items]
    response = supabase.table("products").select("id, title, stock_quantity").in_("id", product_ids).execute()
    products = {p["id"]: p for p in response.data}
    
    for item in items:
        product = products.get(str(item.product_id))
        if not product:
            raise ProductNotFoundException(f"Product {item.product_id} not found")
        if product["stock_quantity"] < item.quantity:
            raise InsufficientStockException(
                f"Insufficient stock for {product['title']}. Available: {product['stock_quantity']}, Requested: {item.quantity}"
            )

def create_order(order_data: OrderCreate) -> dict:
    """Create new order with items"""
    # Check stock
    check_stock_availability(order_data.items)
    
    # Calculate totals
    calc = calculate_order_totals(order_data.items)
    
    # Get delivery fee
    delivery_fee = get_delivery_fee(order_data.delivery_zone)
    
    # Calculate total
    total_amount = calc["subtotal"] + delivery_fee
    
    # Create order
    order_insert = {
        "full_name": order_data.full_name,
        "phone_number": order_data.phone_number,
        "email": order_data.email,
        "delivery_address": order_data.delivery_address,
        "delivery_zone": order_data.delivery_zone,
        "delivery_fee": float(delivery_fee),
        "subtotal": float(calc["subtotal"]),
        "total_amount": float(total_amount),
        "status": "pending",
        "payment_status": "unpaid",
        "notes": order_data.notes
    }
    
    order_response = supabase.table("orders").insert(order_insert).execute()
    order = order_response.data[0]
    
    # Create order items
    order_items = []
    for item in calc["line_items"]:
        order_items.append({
            "order_id": order["id"],
            "product_id": item["product_id"],
            "product_title": item["product_title"],
            "quantity": item["quantity"],
            "unit_price": float(item["unit_price"]),
            "total_price": float(item["total_price"])
        })
    
    supabase.table("order_items").insert(order_items).execute()
    
    # Decrement stock
    for item in order_data.items:
        product = supabase.table("products").select("stock_quantity").eq("id", str(item.product_id)).single().execute()
        new_stock = product.data["stock_quantity"] - item.quantity
        supabase_admin.table("products").update({"stock_quantity": new_stock}).eq("id", str(item.product_id)).execute()
    
    return order

def get_order_by_id(order_id: UUID) -> dict:
    """Get order with items"""
    response = supabase.table("orders").select("*, order_items(*)").eq("id", str(order_id)).single().execute()
    if not response.data:
        raise OrderNotFoundException(f"Order {order_id} not found")
    return response.data

def get_orders(status: str = None) -> List[dict]:
    """Get all orders"""
    query = supabase_admin.table("orders").select("*, order_items(*)")
    if status:
        query = query.eq("status", status)
    response = query.order("created_at", desc=True).execute()
    return response.data

def update_order_status(order_id: UUID, status: str) -> dict:
    """Update order status"""
    response = supabase_admin.table("orders").update({"status": status}).eq("id", str(order_id)).execute()
    if not response.data:
        raise OrderNotFoundException(f"Order {order_id} not found")
    return response.data[0]

def track_orders_by_phone(phone: str) -> List[dict]:
    """Track orders by phone"""
    response = supabase.table("orders").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
    return response.data
