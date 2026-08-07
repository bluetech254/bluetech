from typing import List
from uuid import UUID
from decimal import Decimal
from app.database import supabase, supabase_admin
from app.models.order import OrderCreate, OrderItemCreate
from app.utils.exceptions import ProductNotFoundException, InsufficientStockException, DeliveryZoneNotFoundException, OrderNotFoundException
from app.services import points_service
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

def create_order(order_data: OrderCreate, user_id: str = None) -> dict:
    """Create new order with items. Handles points redemption and referral linking."""
    # Check stock
    check_stock_availability(order_data.items)

    # Calculate totals
    calc = calculate_order_totals(order_data.items)
    delivery_fee = get_delivery_fee(order_data.delivery_zone)
    subtotal = calc["subtotal"]

    # Points redemption — 10 pts = KES 1, no minimum, capped at subtotal
    points_discount = Decimal(0)
    if order_data.redeem_points and user_id:
        current_pts = points_service.get_user_points(user_id)
        if current_pts < order_data.redeem_points:
            raise ValueError(f"Insufficient points. You have {current_pts}")
        kes_value = Decimal(str(round(order_data.redeem_points * points_service.POINTS_TO_KES, 2)))
        points_discount = min(kes_value, subtotal)  # never discount more than subtotal

    total_amount = subtotal - points_discount + delivery_fee

    # If paying entirely with points, validate balance covers full amount (excl. delivery)
    if order_data.payment_method == "points_only":
        if not user_id:
            raise ValueError("You must be logged in to pay with points")
        if not order_data.redeem_points:
            raise ValueError("redeem_points must be set when using points_only payment")
        if points_discount < subtotal:
            pts_needed = math.ceil(float(subtotal) / points_service.POINTS_TO_KES)
            raise ValueError(f"Need {pts_needed} points to cover subtotal of KES {float(subtotal):.2f}")

    # Resolve referral code → store referrer_id on order for later awarding
    referrer_id = None
    if order_data.referral_code and user_id:
        referrer_id = points_service.resolve_referral_code(order_data.referral_code)
        if referrer_id == user_id:
            referrer_id = None

    # Fallback: if no referral code at checkout, use referred_by from user profile
    if not referrer_id and user_id:
        user_r = supabase_admin.table("users").select("referred_by").eq("id", user_id).single().execute()
        if user_r.data and user_r.data.get("referred_by"):
            referrer_id = user_r.data["referred_by"]

    order_insert = {
        "full_name": order_data.full_name,
        "phone_number": order_data.phone_number,
        "email": order_data.email,
        "delivery_address": order_data.delivery_address,
        "delivery_zone": order_data.delivery_zone,
        "delivery_fee": float(delivery_fee),
        "subtotal": float(subtotal),
        "points_discount": float(points_discount),
        "total_amount": float(total_amount),
        "status": "pending",
        "payment_method": order_data.payment_method,
        "payment_status": "paid" if order_data.payment_method == "points_only" else "unpaid",
        "notes": order_data.notes,
        "user_id": user_id,
        "referrer_id": referrer_id,
        "points_redeemed": int(points_discount),
    }

    order_response = supabase.table("orders").insert(order_insert).execute()
    order = order_response.data[0]
    order_id = order["id"]

    # Create order items
    order_items = [{
        "order_id": order_id,
        "product_id": item["product_id"],
        "product_title": item["product_title"],
        "quantity": item["quantity"],
        "unit_price": float(item["unit_price"]),
        "total_price": float(item["total_price"])
    } for item in calc["line_items"]]
    supabase.table("order_items").insert(order_items).execute()

    # Decrement stock
    for item in order_data.items:
        product = supabase.table("products").select("stock_quantity").eq("id", str(item.product_id)).single().execute()
        new_stock = product.data["stock_quantity"] - item.quantity
        supabase_admin.table("products").update({"stock_quantity": new_stock}).eq("id", str(item.product_id)).execute()

    # Deduct redeemed points immediately
    if points_discount > 0 and user_id:
        points_service._add_points(user_id, -int(points_discount), "redemption",
                                   f"Redeemed {int(points_discount)} points on order #{order_id[:8].upper()}", order_id)

    # SMS confirmation
    try:
        from app.utils.sms_service import send_sms
        short_id = order_id[:8].upper()
        items_summary = ", ".join(f"{i['product_title']} x{i['quantity']}" for i in calc["line_items"])
        msg = (
            f"BlueTech Order Confirmed!\n"
            f"Order #{short_id}\n"
            f"Items: {items_summary}\n"
            f"Subtotal: KES {float(subtotal):,.0f}\n"
            f"Delivery: KES {float(delivery_fee):,.0f}\n"
            f"Total: KES {float(total_amount):,.0f}\n"
            f"Payment: {order_data.payment_method.replace('_', ' ').title()}\n"
            f"Deliver to: {order_data.delivery_address}\n"
            f"Thank you for shopping with BlueTech!"
        )
        send_sms(order_data.phone_number, msg)
    except Exception:
        pass

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
    """Update order status. Awards points + referral bonus on delivery."""
    response = supabase_admin.table("orders").update({"status": status}).eq("id", str(order_id)).execute()
    if not response.data:
        raise OrderNotFoundException(f"Order {order_id} not found")
    order = response.data[0]

    if status == "delivered":
        user_id = order.get("user_id")
        subtotal = float(order.get("subtotal", 0))

        # Award earn points to buyer
        if user_id and subtotal > 0:
            points_service.award_order_points(user_id, subtotal, str(order_id))

        # Award referral bonus to referrer (only on first order)
        referrer_id = order.get("referrer_id")
        if referrer_id and user_id:
            # Check if this is the user's first delivered order
            prev = supabase_admin.table("orders")\
                .select("id")\
                .eq("user_id", user_id)\
                .eq("status", "delivered")\
                .neq("id", str(order_id))\
                .execute()
            if not prev.data:
                buyer = supabase_admin.table("users").select("full_name").eq("id", user_id).single().execute()
                buyer_name = buyer.data.get("full_name", "A user") if buyer.data else "A user"
                points_service.award_referral_points(referrer_id, buyer_name)

    return order

def track_orders_by_phone(phone: str) -> List[dict]:
    """Track orders by phone"""
    response = supabase.table("orders").select("*").eq("phone_number", phone).order("created_at", desc=True).execute()
    return response.data
