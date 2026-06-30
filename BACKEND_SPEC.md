# Blue Technology Backend Architecture Specification

## 1. Technology Stack

- **Backend Platform**: Supabase (PostgreSQL + REST API + Storage + Real-time)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **API**: Auto-generated Supabase REST API + PostgREST
- **Storage**: Supabase Storage buckets for product images
- **Authentication**: Simple phone-based lookup (no Supabase Auth for MVP)
- **Admin Interface**: Supabase Dashboard + Custom admin endpoints
- **Client SDK**: @supabase/supabase-js for frontend integration

## 2. Database Schema Definition

```sql
TABLE: users
├── id (UUID, PRIMARY KEY)
├── full_name (VARCHAR 255, NOT NULL)
├── phone_number (VARCHAR 20, UNIQUE, NOT NULL, INDEX)
├── email (VARCHAR 255, NULLABLE)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

TABLE: products
├── id (UUID, PRIMARY KEY)
├── title (VARCHAR 255, NOT NULL)
├── description (TEXT)
├── price (DECIMAL 12,2, NOT NULL)
├── stock_quantity (INTEGER, DEFAULT 0)
├── specifications (JSONB)
├── image_url (VARCHAR 512)
├── is_active (BOOLEAN, DEFAULT TRUE)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

TABLE: bookings (repair requests)
├── id (UUID, PRIMARY KEY)
├── user_id (UUID, FOREIGN KEY → users.id, NULLABLE)
├── full_name (VARCHAR 255, NOT NULL)
├── phone_number (VARCHAR 20, NOT NULL, INDEX)
├── device_type (VARCHAR 50, NOT NULL)
├── device_model (VARCHAR 100)
├── issue_description (TEXT, NOT NULL)
├── fulfillment_type (ENUM: 'dropoff', 'pickup')
├── pickup_address (TEXT, NULLABLE)
├── status (ENUM: 'pending', 'confirmed', 'picked_up', 'in_diagnosis', 
│          'in_repair', 'ready', 'completed', 'cancelled')
├── estimated_cost (DECIMAL 12,2, NULLABLE)
├── final_cost (DECIMAL 12,2, NULLABLE)
├── notes (TEXT, NULLABLE)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

TABLE: orders
├── id (UUID, PRIMARY KEY)
├── user_id (UUID, FOREIGN KEY → users.id, NULLABLE)
├── full_name (VARCHAR 255, NOT NULL)
├── phone_number (VARCHAR 20, NOT NULL, INDEX)
├── email (VARCHAR 255, NULLABLE)
├── delivery_address (TEXT, NOT NULL)
├── delivery_zone (VARCHAR 100, NOT NULL)
├── delivery_fee (DECIMAL 10,2, NOT NULL)
├── subtotal (DECIMAL 12,2, NOT NULL)
├── total_amount (DECIMAL 12,2, NOT NULL)
├── status (ENUM: 'pending', 'confirmed', 'processing', 
│          'dispatched', 'delivered', 'cancelled')
├── payment_method (VARCHAR 50, DEFAULT 'cash_on_delivery')
├── payment_status (ENUM: 'unpaid', 'paid')
├── notes (TEXT, NULLABLE)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

TABLE: order_items
├── id (UUID, PRIMARY KEY)
├── order_id (UUID, FOREIGN KEY → orders.id, ON DELETE CASCADE)
├── product_id (UUID, FOREIGN KEY → products.id)
├── product_title (VARCHAR 255, NOT NULL)
├── quantity (INTEGER, NOT NULL)
├── unit_price (DECIMAL 12,2, NOT NULL)
├── total_price (DECIMAL 12,2, NOT NULL)
└── created_at (TIMESTAMP)

TABLE: delivery_zones
├── id (UUID, PRIMARY KEY)
├── zone_name (VARCHAR 100, NOT NULL, UNIQUE)
├── delivery_fee (DECIMAL 10,2, NOT NULL)
├── is_active (BOOLEAN, DEFAULT TRUE)
└── created_at (TIMESTAMP)
```

## 3. Supabase API Structure

Supabase auto-generates REST endpoints based on database tables. We'll use direct Supabase client calls.

**Supabase Project URL**: `https://your-project.supabase.co`  
**API Key**: Use `anon` public key for client, `service_role` for admin operations

### Auto-Generated Table Endpoints

All tables get automatic CRUD via Supabase REST API:

```javascript
// Example usage from frontend
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('is_active', true)
```

### 📦 PRODUCTS (E-COMMERCE)

| Operation | Supabase Query | Description |
|-----------|----------------|-------------|
| List products | `.from('products').select('*').eq('is_active', true)` | Get all active products |
| Search products | `.from('products').select('*').ilike('title', '%query%')` | Search by title |
| Get product | `.from('products').select('*').eq('id', uuid)` | Single product |
| Create product | `.from('products').insert({...})` | Admin: Add product |
| Update product | `.from('products').update({...}).eq('id', uuid)` | Admin: Update |
| Upload image | `.storage.from('products').upload(path, file)` | Admin: Upload image |

### 🛒 ORDERS (E-COMMERCE CHECKOUT)

| Operation | Supabase Query | Description |
|-----------|----------------|-------------|
| Create order | `.from('orders').insert({...})` then `.from('order_items').insert([...])` | Place order |
| Get order | `.from('orders').select('*, order_items(*)').eq('id', uuid)` | Order with items |
| Track by phone | `.from('orders').select('*').eq('phone_number', phone)` | Customer tracking |
| Update status | `.from('orders').update({status}).eq('id', uuid)` | Admin: Update status |
| List all orders | `.from('orders').select('*, order_items(*)')` | Admin: View all |

### 🔧 BOOKINGS (REPAIR SERVICE)

| Operation | Supabase Query | Description |
|-----------|----------------|-------------|
| Create booking | `.from('bookings').insert({...})` | Submit repair request |
| Get booking | `.from('bookings').select('*').eq('id', uuid)` | Booking details |
| Track by phone | `.from('bookings').select('*').eq('phone_number', phone)` | Customer tracking |
| Update status | `.from('bookings').update({status}).eq('id', uuid)` | Admin: Update status |
| Update cost | `.from('bookings').update({estimated_cost, final_cost}).eq('id', uuid)` | Admin: Set price |

### 📍 DELIVERY ZONES

| Operation | Supabase Query | Description |
|-----------|----------------|-------------|
| List zones | `.from('delivery_zones').select('*').eq('is_active', true)` | Get active zones |
| Create zone | `.from('delivery_zones').insert({...})` | Admin: Add zone |
| Update zone | `.from('delivery_zones').update({...}).eq('id', uuid)` | Admin: Update |

### 📊 TRACKING (UNIFIED)

| Operation | Supabase Query | Description |
|-----------|----------------|-------------|
| Track all | Parallel queries on `orders` and `bookings` by phone | Combined tracking |

### 🔐 ADMIN

Admin operations use the same queries with `service_role` key for bypassing RLS.

## 4. Customer Journey Maps

### JOURNEY A: REPAIR SERVICE BOOKING

```
STEP 1: Customer Visits Homepage
   └─> Views split hero, clicks "Book a Repair"

STEP 2: Fill Repair Form (/book-repair)
   ├─> Select device type
   ├─> Enter device model
   ├─> Describe issue
   ├─> Choose fulfillment (dropoff/pickup)
   ├─> Enter name & phone
   └─> Submit form

STEP 3: API Call
   POST /api/v1/bookings
   {
     "full_name": "John Doe",
     "phone_number": "254712345678",
     "device_type": "Laptop",
     "device_model": "MacBook Pro M1",
     "issue_description": "Screen cracked, won't turn on",
     "fulfillment_type": "pickup",
     "pickup_address": "Westlands, Nairobi"
   }

STEP 4: Confirmation Screen
   ├─> Shows booking ID
   ├─> "We'll call you in 30 minutes"
   └─> WhatsApp backup button

STEP 5: Admin Reviews (Backend Portal)
   GET /api/v1/admin/bookings/pending
   └─> Admin calls customer, confirms pickup

STEP 6: Status Updates (Admin)
   PUT /api/v1/bookings/{id}/status
   {"status": "picked_up"} → "in_diagnosis" → "in_repair" → "ready"

STEP 7: Customer Tracks Progress
   GET /api/v1/bookings/track/254712345678
   └─> Shows current status timeline
```

### JOURNEY B: E-COMMERCE PURCHASE FLOW

```
STEP 1: Browse Products
   GET /api/v1/products
   └─> Customer sees catalog grid

STEP 2: View Product Details
   GET /api/v1/products/{id}
   └─> See specs, price, images

STEP 3: Add to Cart (Frontend localStorage)
   └─> No backend call, stored in browser

STEP 4: Proceed to Checkout
   ├─> Cart items displayed
   ├─> Select delivery zone
   └─> Delivery fee auto-calculated

STEP 5: Submit Order
   POST /api/v1/orders
   {
     "full_name": "Jane Kamau",
     "phone_number": "254723456789",
     "email": "jane@example.com",
     "delivery_address": "123 Moi Ave, Nairobi CBD",
     "delivery_zone": "Nairobi CBD",
     "items": [
       {"product_id": "uuid-123", "quantity": 2},
       {"product_id": "uuid-456", "quantity": 1}
     ]
   }

STEP 6: Backend Processing
   ├─> Calculate subtotal from product prices
   ├─> Add delivery fee from zone
   ├─> Create order record
   ├─> Create order_items records
   └─> Return order ID

STEP 7: Order Confirmation
   ├─> Shows order summary
   ├─> Payment: "Cash on Delivery"
   └─> WhatsApp confirmation button

STEP 8: Admin Fulfillment
   GET /api/v1/admin/orders/pending
   └─> Prepare items, assign rider

STEP 9: Status Updates
   PUT /api/v1/orders/{id}/status
   {"status": "dispatched"} → "delivered"

STEP 10: Customer Tracking
   GET /api/v1/orders/track/254723456789
   └─> Shows delivery status
```

## 5. Supabase Project Structure

### Database Tables (SQL Migrations)
Create these tables in Supabase SQL Editor:

```
/supabase
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_products.sql
│   ├── 003_create_bookings.sql
│   ├── 004_create_orders.sql
│   ├── 005_create_order_items.sql
│   └── 006_create_delivery_zones.sql
│
└── seed/
    └── delivery_zones.sql
```

### Storage Buckets
- `products` - For product images (public bucket)

### Row Level Security (RLS) Policies

**Products Table:**
- Public: SELECT where is_active = true
- Admin: All operations

**Orders & Order Items:**
- Public: INSERT (place orders)
- Public: SELECT where phone_number matches (tracking)
- Admin: All operations

**Bookings:**
- Public: INSERT (create bookings)
- Public: SELECT where phone_number matches (tracking)
- Admin: All operations

**Delivery Zones:**
- Public: SELECT where is_active = true
- Admin: All operations

### Frontend Integration Structure

```
/frontend
├── lib/
│   ├── supabase.ts              # Supabase client initialization
│   └── types.ts                 # TypeScript interfaces
│
├── services/
│   ├── productService.ts        # Product CRUD operations
│   ├── bookingService.ts        # Booking operations
│   ├── orderService.ts          # Order operations
│   └── trackingService.ts       # Tracking queries
│
└── .env.local
    ├── NEXT_PUBLIC_SUPABASE_URL
    └── NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 6. Supabase Integration Examples

### Initialize Supabase Client

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For admin operations (use server-side only)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Create Repair Booking

```typescript
// Frontend call
const { data, error } = await supabase
  .from('bookings')
  .insert({
    full_name: "John Kamau",
    phone_number: "254712345678",
    device_type: "Laptop",
    device_model: "HP EliteBook 840",
    issue_description: "Laptop won't charge, battery drains fast",
    fulfillment_type: "pickup",
    pickup_address: "Westlands Mall, 3rd Floor",
    status: "pending"
  })
  .select()
  .single()

// Response: data = { id: "uuid", full_name: "John Kamau", ... }
```

### Create Order with Items

```typescript
// Step 1: Create order
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert({
    full_name: "Jane Wanjiku",
    phone_number: "254723456789",
    email: "jane@example.com",
    delivery_address: "123 Kimathi Street, Nairobi CBD",
    delivery_zone: "Nairobi CBD",
    delivery_fee: 200.00,
    subtotal: 15000.00,
    total_amount: 15200.00,
    status: "pending",
    payment_status: "unpaid"
  })
  .select()
  .single()

// Step 2: Create order items
const { data: items, error: itemsError } = await supabase
  .from('order_items')
  .insert([
    {
      order_id: order.id,
      product_id: "a1b2c3d4",
      product_title: "Anker 65W Charger",
      quantity: 2,
      unit_price: 3500.00,
      total_price: 7000.00
    },
    {
      order_id: order.id,
      product_id: "e5f6g7h8",
      product_title: "USB-C Cable 2m",
      quantity: 1,
      unit_price: 8000.00,
      total_price: 8000.00
    }
  ])
```

### Track by Phone Number

```typescript
// Get both orders and bookings
const [ordersResult, bookingsResult] = await Promise.all([
  supabase
    .from('orders')
    .select('*')
    .eq('phone_number', '254712345678')
    .order('created_at', { ascending: false }),
  
  supabase
    .from('bookings')
    .select('*')
    .eq('phone_number', '254712345678')
    .order('created_at', { ascending: false })
])

// Response
const tracking = {
  phone_number: "254712345678",
  orders: ordersResult.data,
  bookings: bookingsResult.data
}
```

### Get Products (with search)

```typescript
// List all active products
const { data: products } = await supabase
  .from('products')
  .select('*')
  .eq('is_active', true)
  .order('created_at', { ascending: false })

// Search products
const { data: results } = await supabase
  .from('products')
  .select('*')
  .eq('is_active', true)
  .ilike('title', `%${searchQuery}%`)
```

### Upload Product Image

```typescript
// Upload to Supabase Storage
const { data, error } = await supabase
  .storage
  .from('products')
  .upload(`${productId}/${fileName}`, file)

// Get public URL
const { data: urlData } = supabase
  .storage
  .from('products')
  .getPublicUrl(`${productId}/${fileName}`)

// Update product with image URL
await supabase
  .from('products')
  .update({ image_url: urlData.publicUrl })
  .eq('id', productId)
```

### Admin: Update Status

```typescript
// Update booking status (use service role key server-side)
const { data, error } = await supabaseAdmin
  .from('bookings')
  .update({ status: 'in_repair' })
  .eq('id', bookingId)
  .select()
  .single()

// Update order status
const { data: order } = await supabaseAdmin
  .from('orders')
  .update({ status: 'dispatched' })
  .eq('id', orderId)
  .select()
  .single()
```

## 7. Supabase Data Flow

**E-Commerce Order Creation:**
```
Frontend Form
     ↓
Supabase Client
     ↓
1. Get product details & prices
2. Calculate totals
3. Insert into 'orders' table
4. Insert into 'order_items' table
     ↓
Return order object to frontend
     ↓
Show confirmation screen
```

**Repair Booking Flow:**
```
Frontend Form
     ↓
Supabase Client
     ↓
Insert into 'bookings' table (status: 'pending')
     ↓
Return booking object
     ↓
Show confirmation with booking ID
     ↓
Admin views in Supabase Dashboard
     ↓
Admin updates status via admin panel
```

## 8. MVP Features Summary

### What Backend WILL Handle:
- ✅ Product CRUD with image uploads
- ✅ Repair booking intake with status tracking
- ✅ Order placement with item management
- ✅ Phone-based tracking (no auth required)
- ✅ Admin endpoints for status updates
- ✅ Delivery zone management
- ✅ Auto-calculation of totals and fees
- ✅ Search/filter products
- ✅ Dashboard statistics

### What Backend Will NOT Handle (MVP):
- ❌ User authentication/login
- ❌ Payment gateway integration
- ❌ Email notifications (manual for now)
- ❌ SMS integration
- ❌ Complex inventory management
- ❌ Rating/review system

## 9. Supabase Setup Requirements

### Initial Setup Steps:

1. **Create Supabase Project**
   - Go to supabase.com
   - Create new project
   - Save project URL and API keys

2. **Environment Variables**

```env
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-side only (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. **Run SQL Migrations**
   - Open Supabase SQL Editor
   - Run table creation scripts (see section 2)
   - Seed delivery zones

4. **Create Storage Bucket**
   - Go to Storage in Supabase Dashboard
   - Create bucket: `products`
   - Set as public bucket
   - Configure policies for upload access

5. **Configure RLS Policies**
   - Enable RLS on all tables
   - Set public SELECT on active items
   - Set INSERT for public on orders/bookings
   - Full access for service role key

### Admin Dashboard Access

For MVP, use Supabase's built-in dashboard to manage data:
- View all orders, bookings
- Update statuses manually
- Upload products
- Monitor real-time activity

Later, build custom admin panel that uses `service_role` key for unrestricted access.

## 10. Delivery Zones (Kenya)

Default zones to seed in database:

| Zone Name | Delivery Fee (KES) |
|-----------|-------------------|
| Nairobi CBD | 200 |
| Westlands / Parklands | 250 |
| Kilimani / Ngong Road | 300 |
| Thika / Kiambu Outskirts | 450 |
| Mombasa / Kisumu / Upcountry | 600 |

---

**Ready for Development**: This specification provides complete backend architecture for the 7-day MVP sprint.
