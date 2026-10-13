#!/usr/bin/env python3
"""
Test script to create a sample order to test admin polling
"""
import sys
sys.path.append('/home/m/Documents/GitHub/bluetech/backend')

from app.database import supabase_admin
from datetime import datetime

# Create a test order
test_order = {
    "full_name": "Test Customer",
    "phone_number": "254712345678",
    "delivery_address": "Test Address, Nairobi",
    "delivery_zone": "Westlands",
    "subtotal": 5000,
    "total_amount": 5300,
    "status": "pending",
    "payment_status": "paid",
    "notes": "Test order for polling system",
    "created_at": datetime.utcnow().isoformat()
}

try:
    result = supabase_admin.table("orders").insert(test_order).execute()
    print("✅ Test order created successfully!")
    print(f"Order ID: {result.data[0]['id']}")
    print("\nThe admin panel should detect this new order within 2 minutes")
    print("or immediately if you click the refresh button!")
except Exception as e:
    print(f"❌ Error creating test order: {e}")
