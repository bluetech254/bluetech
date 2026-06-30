from decimal import Decimal
from datetime import datetime
import pytz

def format_currency(amount: Decimal) -> str:
    """Format amount as KES currency"""
    return f"KES {amount:,.2f}"

def format_datetime_kenya(dt: datetime) -> str:
    """Format datetime in Kenya timezone (EAT)"""
    eat = pytz.timezone('Africa/Nairobi')
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)
    dt_eat = dt.astimezone(eat)
    return dt_eat.strftime('%b %d, %Y %I:%M %p')
