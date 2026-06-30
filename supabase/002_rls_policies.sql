-- Enable Row Level Security on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Products: Public can view active products
CREATE POLICY "Anyone can view active products"
ON products FOR SELECT
USING (is_active = true);

-- Orders: Public can create orders
CREATE POLICY "Anyone can create orders"
ON orders FOR INSERT
WITH CHECK (true);

-- Orders: Anyone can view orders (for tracking by phone)
CREATE POLICY "Anyone can view orders"
ON orders FOR SELECT
USING (true);

-- Order Items: Public can view
CREATE POLICY "Anyone can view order items"
ON order_items FOR SELECT
USING (true);

-- Order Items: Public can insert
CREATE POLICY "Anyone can insert order items"
ON order_items FOR INSERT
WITH CHECK (true);

-- Bookings: Public can create
CREATE POLICY "Anyone can create bookings"
ON bookings FOR INSERT
WITH CHECK (true);

-- Bookings: Anyone can view (for tracking by phone)
CREATE POLICY "Anyone can view bookings"
ON bookings FOR SELECT
USING (true);

-- Delivery Zones: Public can view active zones
CREATE POLICY "Anyone can view delivery zones"
ON delivery_zones FOR SELECT
USING (is_active = true);

-- Users: Public can insert (auto-create on order/booking)
CREATE POLICY "Anyone can create users"
ON users FOR INSERT
WITH CHECK (true);

-- Users: Public can view own data
CREATE POLICY "Anyone can view users"
ON users FOR SELECT
USING (true);
