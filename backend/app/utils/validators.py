import re

def validate_kenya_phone(phone: str) -> str:
    """Validate and normalize Kenya phone number"""
    # Remove spaces and special characters
    phone = re.sub(r'[\s\-\(\)]', '', phone)
    
    # Convert +254 to 254
    if phone.startswith('+'):
        phone = phone[1:]
    
    # Convert 0712... to 254712...
    if phone.startswith('0'):
        phone = '254' + phone[1:]
    
    # Validate format: 254XXXXXXXXX (12 digits total)
    if not re.match(r'^254[0-9]{9}$', phone):
        raise ValueError(f"Invalid Kenya phone number format: {phone}")
    
    return phone

def format_phone_display(phone: str) -> str:
    """Format phone for display: 0712 345 678"""
    if phone.startswith('254'):
        phone = '0' + phone[3:]
    
    # Format as 0712 345 678
    if len(phone) == 10:
        return f"{phone[:4]} {phone[4:7]} {phone[7:]}"
    return phone
