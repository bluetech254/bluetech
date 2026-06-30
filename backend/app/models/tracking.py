from pydantic import BaseModel
from typing import List
from app.models.order import OrderResponse
from app.models.booking import BookingResponse

class TrackingResponse(BaseModel):
    phone_number: str
    orders: List[OrderResponse]
    bookings: List[BookingResponse]
    total_orders: int
    total_bookings: int
