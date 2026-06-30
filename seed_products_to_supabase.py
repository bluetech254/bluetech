#!/usr/bin/env python3
"""
Seed all products from SQL file to Supabase
"""
import sys
sys.path.append('/home/m/Documents/GitHub/bluetech/backend')

from app.database import supabase_admin
import re

# Read the SQL file
with open('/home/m/Documents/GitHub/bluetech/supabase/003_seed_products.sql', 'r') as f:
    content = f.read()

# Parse products using regex
pattern = r'\((.*?)\)(?:,|\;)'
matches = re.findall(pattern, content, re.DOTALL)

products = []
for match in matches:
    if 'title' in match.lower() or 'description' in match.lower():
        continue  # Skip header
    
    # Parse each field
    parts = []
    current = ""
    in_quotes = False
    escape_next = False
    
    for char in match:
        if escape_next:
            current += char
            escape_next = False
            continue
            
        if char == '\\':
            escape_next = True
            current += char
            continue
            
        if char == "'" and not escape_next:
            in_quotes = not in_quotes
            current += char
            continue
            
        if char == ',' and not in_quotes:
            parts.append(current.strip())
            current = ""
            continue
            
        current += char
    
    if current:
        parts.append(current.strip())
    
    if len(parts) >= 7:
        # Clean up the values
        def clean(s):
            s = s.strip()
            if s.startswith("'") and s.endswith("'"):
                s = s[1:-1]
            # Unescape single quotes
            s = s.replace("''", "'")
            return s
        
        try:
            product = {
                "title": clean(parts[0]),
                "description": clean(parts[1]),
                "price": float(clean(parts[2])),
                "image_url": clean(parts[3]),
                "specifications": clean(parts[4]),
                "is_active": parts[5].strip().lower() == 'true',
                "stock_quantity": int(clean(parts[6]))
            }
            products.append(product)
        except Exception as e:
            print(f"Error parsing product: {e}")
            continue

print(f"Parsed {len(products)} products from SQL file")

# First, check current count and clear if needed
try:
    current = supabase_admin.table("products").select("id").execute()
    if len(current.data) > 0:
        print(f"Found {len(current.data)} existing products. Clearing...")
        # Delete all existing products
        for p in current.data:
            supabase_admin.table("products").delete().eq('id', p['id']).execute()
        print("✅ Cleared existing products")
except Exception as e:
    print(f"Note: {e}")

# Insert in batches of 10
batch_size = 10
for i in range(0, len(products), batch_size):
    batch = products[i:i+batch_size]
    try:
        result = supabase_admin.table("products").insert(batch).execute()
        print(f"✅ Inserted batch {i//batch_size + 1}: {len(result.data)} products")
    except Exception as e:
        print(f"❌ Error inserting batch {i//batch_size + 1}: {e}")
        # Try one by one
        for product in batch:
            try:
                supabase_admin.table("products").insert(product).execute()
                print(f"  ✅ {product['title']}")
            except Exception as e2:
                print(f"  ❌ {product['title']}: {e2}")

# Verify
try:
    final_count = supabase_admin.table("products").select("id").execute()
    print(f"\n🎉 Final count: {len(final_count.data)} products in Supabase!")
except Exception as e:
    print(f"Error verifying: {e}")
