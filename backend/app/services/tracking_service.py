from app.services import order_service, booking_service

def track_by_phone(phone: str) -> dict:
    """Track all orders and bookings by phone number"""
    orders = order_service.track_orders_by_phone(phone)
    bookings = booking_service.track_bookings_by_phone(phone)
    
    return {
        "phone_number": phone,
        "orders": orders,
        "bookings": bookings,
        "total_orders": len(orders),
        "total_bookings": len(bookings)
    }
