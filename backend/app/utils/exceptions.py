class BlueTechException(Exception):
    """Base exception for Blue Technology"""
    pass

class ProductNotFoundException(BlueTechException):
    """Product not found"""
    pass

class InsufficientStockException(BlueTechException):
    """Not enough stock available"""
    pass

class OrderNotFoundException(BlueTechException):
    """Order not found"""
    pass

class BookingNotFoundException(BlueTechException):
    """Booking not found"""
    pass

class DeliveryZoneNotFoundException(BlueTechException):
    """Delivery zone not found"""
    pass
