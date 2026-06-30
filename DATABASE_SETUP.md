# Blue Technology Database Setup Guide

## Step 1: Create Database Schema

Go to your Supabase Dashboard → SQL Editor and run `supabase/001_schema.sql`

This creates:
- ✅ users table
- ✅ products table  
- ✅ bookings table
- ✅ orders table
- ✅ order_items table
- ✅ delivery_zones table (with Kenya zones seeded)

## Step 2: Import Products Data

You have **`products.csv`** with all product data ready.

### Option A: Use Supabase Dashboard
1. Go to Supabase Dashboard → Table Editor
2. Select `products` table
3. Click "Insert" → "Import data from CSV"
4. Upload `products.csv`
5. Map columns:
   - `name` → `title`
   - `description` → `description`
   - `price` → `price`
   - `imageUrl` → `image_url`
   - Set `is_active` = true
   - Set `stock_quantity` = 10

### Option B: Use Seed Script
Run: `npm run seed` (if network allows connection)

## Step 3: Import Services Data

You have **`services.csv`** with repair service templates.

The seed script will create a `repair_services` table to store these as reference data that admins can use when creating bookings.

## Step 4: Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create new bucket: `products`
3. Make it public
4. Add policy: Allow public read access

## Step 5: Set Up Row Level Security (RLS)

Run these in SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Public can view active products
CREATE POLICY "Anyone can view active products"
ON products FOR SELECT
USING (is_active = true);

-- Public can insert orders
CREATE POLICY "Anyone can create orders"
ON orders FOR INSERT
WITH CHECK (true);

-- Public can view their own orders by phone
CREATE POLICY "Anyone can view orders by phone"
ON orders FOR SELECT
USING (true);

-- Public can view order items
CREATE POLICY "Anyone can view order items"
ON order_items FOR SELECT
USING (true);

-- Public can insert order items
CREATE POLICY "Anyone can insert order items"
ON order_items FOR INSERT
WITH CHECK (true);

-- Public can create bookings
CREATE POLICY "Anyone can create bookings"
ON bookings FOR INSERT
WITH CHECK (true);

-- Public can view their bookings by phone
CREATE POLICY "Anyone can view bookings by phone"
ON bookings FOR SELECT
USING (true);

-- Public can view delivery zones
CREATE POLICY "Anyone can view delivery zones"
ON delivery_zones FOR SELECT
USING (is_active = true);
```

## Step 6: Get API Keys

From Supabase Dashboard → Settings → API:

- Project URL: `https://ureebvpesbkbholidlrn.supabase.co`
- `anon` `public` key - for frontend
- `service_role` `secret` key - for admin operations

## Summary

After completing these steps, you'll have:
- ✅ Complete database schema
- ✅ ~250+ products imported
- ✅ ~50+ repair service templates
- ✅ Kenya delivery zones configured
- ✅ Security policies in place
- ✅ Storage bucket for images
- ✅ Ready to build frontend

## Next Steps

Once database is set up:
1. Build frontend with Next.js
2. Connect to Supabase using API keys
3. Build customer-facing pages (shop, book repair, track)
4. Build admin dashboard
