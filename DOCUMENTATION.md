# BlueTech System Documentation

**Blue Technology Ltd** — Nairobi, Kenya  
Electronics e-commerce platform + device repair booking system.

---

## System Architecture Overview

The system is composed of **three separate applications** that work together:

```
┌─────────────────────┐     HTTPS/REST      ┌──────────────────────────┐
│   CLIENT (React)    │ ──────────────────► │   BACKEND (FastAPI)      │
│   Vercel (SPA)      │                     │   Render.com             │
└─────────────────────┘                     │   /api/v1/...            │
                                            └──────────┬───────────────┘
┌─────────────────────┐     HTTPS/REST               │
│   ADMIN (Next.js)   │ ──────────────────►          │ Supabase (PostgreSQL)
│   Vercel (SSR)      │   via /api/proxy/             │ Row Level Security
└─────────────────────┘                              │
                                            ┌─────────┴──────────────┐
                                            │   Supabase             │
                                            │   - PostgreSQL DB      │
                                            │   - Storage (images)   │
                                            └────────────────────────┘
```

### How They Connect

- **Client → Backend**: Direct HTTPS calls to `https://bluetechnology-y1f8.onrender.com/api/v1/`. Auth via Bearer JWT stored in `sessionStorage`.
- **Admin → Backend**: All requests go through a Next.js proxy at `/api/proxy/[...path]` which forwards to the backend with the admin session token from an httpOnly cookie (`admin_session`).
- **Backend → Supabase**: Two clients — `supabase` (anon key, respects RLS) for public ops, `supabase_admin` (service role key, bypasses RLS) for admin ops.
- **Backend → SMS**: TextPie API for OTP codes and booking status notifications.
- **Backend → M-Pesa**: Safaricom Daraja API for STK push payments.

---

## 1. Backend (FastAPI)

**URL**: `https://bluetechnology-y1f8.onrender.com`  
**Docs**: `/docs` (Swagger), `/redoc` (ReDoc)  
**Stack**: FastAPI, Supabase Python SDK, python-jose (JWT), TextPie SMS, Safaricom Daraja

### Authentication Model

Two completely separate auth systems:

| System | Table | Token | Used By |
|--------|-------|-------|---------|
| Client Auth | `users` | JWT (30 days) | Customer-facing app |
| Admin Auth | `admins` | JWT (30 days) | Admin panel |

JWT secret loaded from `JWT_SECRET` env var. Passwords hashed with SHA256+salt.

---

### API Endpoints

#### Client Authentication — `/api/v1/auth`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/signup` | Register new user. Accepts `full_name`, `phone_number`, `email`, `password`, optional `referral_code`. Sends OTP via SMS. Awards 10 referral signup points to referrer instantly. |
| POST | `/login` | Login with `phone_number` + `password`. Returns JWT + user object. |
| POST | `/verify-phone` | Verify phone with 6-digit OTP code. |
| POST | `/forgot-password` | Request password reset code sent via SMS. |
| POST | `/reset-password` | Reset password with `phone_number`, `reset_code`, `new_password`. |
| POST | `/resend-code` | Resend OTP verification code. |

#### Admin Authentication — `/api/v1/admin/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login` | None | Admin login with `username` + `password`. Returns JWT with role claim. |
| GET | `/me` | Admin | Get current admin profile. |
| POST | `/logout` | Admin | Stateless logout (client discards token). |
| POST | `/change-password` | Admin | Change own password. |
| POST | `/create-admin` | Superadmin | Create new admin account. |
| PUT | `/deactivate/{id}` | Superadmin | Deactivate admin account. Cannot deactivate self. |
| GET | `/list` | Superadmin | List all admin accounts. |
| PUT | `/users/{id}/toggle-active` | Admin | Activate/deactivate a client user. |

#### Products — `/api/v1/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `` | None | List products. Supports `search`, `category`, `featured`, `limit`, `offset`. |
| GET | `/categories` | None | List all unique product categories. |
| GET | `/{id}` | None | Get single product by UUID. |
| POST | `` | Admin | Create product. |
| PUT | `/{id}` | Admin | Update product. |
| DELETE | `/{id}` | Admin | Deactivate product (soft delete). |

#### Orders — `/api/v1/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `` | Client | Place order. Accepts items, delivery zone, address, optional `points_to_redeem`, `referral_code`. |
| GET | `` | Client | Get own orders. |
| GET | `/{id}` | Client | Get order detail with items. |
| PUT | `/{id}/status` | Admin | Update order status (`pending → confirmed → processing → shipped → delivered → cancelled`). Awarding points happens on `delivered`. |
| POST | `/{id}/cancel` | Client | Cancel own order (only if `pending`). |

#### Repair Bookings — `/api/v1/bookings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `` | Client | Create booking. Accepts `service_id`, `device_brand`, `device_model`, `issue_description`, `preferred_date`, `preferred_time`, `customer_name`, `phone_number`, `delivery_zone_id`. |
| GET | `` | Client | Get own bookings. |
| GET | `/{id}` | Client | Get booking detail. |
| PUT | `/{id}/status` | Admin | Update booking status. Triggers SMS to customer at key stages. |
| PUT | `/{id}/cost` | Admin | Set final repair cost. |
| GET | `/track/{phone}` | None | Track bookings by phone number. |

#### Payments — `/api/v1/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/mpesa/initiate` | Client | Initiate M-Pesa STK push for an order. |
| POST | `/mpesa/callback` | None (Safaricom) | Safaricom webhook — updates payment status. |
| GET | `/mpesa/status/{order_id}` | Client | Poll payment status. |
| POST | `/mpesa/booking/initiate` | Client | Initiate commitment deposit for a booking. |
| POST | `/mpesa/booking/{id}/request-final-payment` | Admin | Request final payment after repair. |
| GET | `/mpesa/booking/status/{id}` | Client | Poll booking payment status. |

#### Loyalty & Points — `/api/v1/points`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Client | Get own points balance + referral code. |
| GET | `/history` | Client | Get points ledger history. |
| POST | `/redeem` | Client | Redeem points at checkout (1 pt = KES 0.10). |
| GET | `/admin/user/{id}` | Admin | Get user's points + ledger. |
| POST | `/admin/award/{id}` | Admin | Manually award points to a user. |

**Points Rules:**
- Earn 10% of order subtotal as points on delivery
- Referrer earns 10 points when referee registers
- Referrer earns 50 points when referee places first order
- 10 points = KES 1 discount

#### Repair Services — `/api/v1/repair-services`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `` | None | List services. Supports `category`, `search`, `limit`. |
| GET | `/categories` | None | List all service categories. |
| GET | `/{id}` | None | Get single service. |
| GET | `/{id}/price` | None | Get pricing for service + device combo. |

#### Devices — `/api/v1/devices`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/brands` | None | List device brands. |
| GET | `/brands/{id}/models` | None | List models for a brand. |
| GET | `/categories` | None | List device categories. |

#### Admin Operations — `/api/v1/admin`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard` | Admin | Stats: orders, bookings, revenue, users, stock alerts. |
| GET | `/transactions` | Admin | All transactions with filters. |
| GET | `/stock/alerts` | Admin | Products below low-stock threshold. |
| PUT | `/stock/{id}/threshold` | Admin | Set low-stock threshold for a product. |
| GET | `/export/orders` | Admin | Export orders as CSV. |
| GET | `/export/bookings` | Admin | Export bookings as CSV. |
| POST | `/orders/bulk-status` | Admin | Bulk update order statuses. |
| GET | `/referrals` | Admin | All referral relationships. |
| GET | `/referrals/user/{id}` | Admin | Referrals for a specific user. |
| GET | `/customers/{id}/history` | Admin | Full customer history (orders, bookings, points). |
| GET | `/search` | Admin | Global search across orders, bookings, users. |
| GET | `/audit-log` | Admin | Admin action audit log. |
| GET | `/devices/brands` | Admin | Manage device brands. |
| POST | `/devices/brands` | Admin | Create brand. |
| PUT | `/devices/brands/{id}` | Admin | Update brand. |
| DELETE | `/devices/brands/{id}` | Admin | Delete brand. |
| GET | `/devices/models` | Admin | List device models. |
| POST | `/devices/models` | Admin | Create model. |
| PUT | `/devices/models/{id}` | Admin | Update model. |
| DELETE | `/devices/models/{id}` | Admin | Delete model. |
| GET | `/devices/pricing` | Admin | List service pricing rules. |
| POST | `/devices/pricing` | Admin | Upsert pricing rule (service + brand + model combo). |
| DELETE | `/devices/pricing/{id}` | Admin | Delete pricing rule. |

#### Other Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/delivery-zones` | List active delivery zones with fees. |
| GET | `/api/v1/track/{phone}` | Track all orders + bookings by phone. |
| POST | `/api/v1/contact` | Submit contact form message. |
| GET | `/api/v1/places/autocomplete` | Google Places autocomplete for address input. |
| GET | `/health` | API health check. |
| GET | `/health/db` | Database connectivity check. |

---

## 2. Client Application (React SPA)

**URL**: `https://bluetech-5xmc.vercel.app`  
**Stack**: React 18, TypeScript, Vite, Tailwind CSS, React Router, Axios, Zod, React Hook Form  
**Auth**: JWT in `sessionStorage`, auto-cleared on tab close

### Customer Journey

#### 1. Discovery (Unauthenticated)
User lands on the homepage and can browse freely without logging in.

**Homepage (`/`)**
- Hero carousel — cycles through product images with slide transition
- Product category grid — 8 popular categories (4×2 on mobile, 8×1 on desktop), clicking navigates to filtered products page
- Featured Products — horizontal scroll on mobile, grid on desktop
- Limited Time Deals carousel
- New Arrivals scroll
- Featured Services carousel
- Marketing posters
- How It Works section

**Products Page (`/products`)**
- Full product catalog with search, category filter, price range, brand, condition, in-stock, rating filters
- Filter sidebar on desktop, drawer on mobile
- Section carousels (Featured, Flash Sale, Hot Deals, New Arrivals, Best Sellers, Trending, Editor's Choice, Weekly Deals, Back in Stock, Clearance, Refurbished, Pre-Order, Coming Soon) shown when no filter active
- Paginated grid (4 cols desktop, 3 cols mobile)
- URL param `?category=` pre-filters on load (used by homepage category grid)

**Product Detail Page (`/products/:id`)**
- Image gallery with thumbnail selector
- Product specs, price, stock status
- Add to cart button
- Related products

**Services Page (`/services`)**
- Repair services catalog with category filter
- Service cards with estimated duration
- Book repair CTA

**Hot Deals Page (`/hot-deals`)**
- Dedicated deals listing

**Track Order Page (`/track-order`)**
- Track orders or bookings by phone number (no login required)
- Shows status timeline

#### 2. Registration & Login

**Register Page (`/register`)**
- Fields: full name, phone number (Kenya format), email (optional), password (min 8 chars), confirm password, optional referral code
- On submit: creates account, sends OTP via SMS, redirects to verify phone
- Referrer gets 10 instant points if referral code valid

**Verify Phone Page (`/verify-phone`)**
- Enter 6-digit OTP sent via SMS
- Resend code option
- On success: account activated, redirected to home

**Login Page (`/login`)**
- Phone number + password
- Forgot password link
- On success: JWT stored in sessionStorage, user context updated

**Forgot Password Page (`/forgot-password`)**
- Step 1: Enter phone → SMS reset code sent
- Step 2: Enter code + new password → password updated

#### 3. Shopping Journey (Authenticated)

**Cart (Drawer + `/cart`)**
- Persistent cart via React Context
- Add/remove/update quantity
- Delivery zone selector (pre-saved in sessionStorage)
- Points redemption toggle
- Order summary with delivery fee

**Checkout Page (`/checkout`)**
- Delivery address (Google Places autocomplete)
- Delivery zone selection
- Points redemption (shows available balance)
- Referral code field
- M-Pesa payment initiation
- Order placed → redirects to success page

**Order Success Page (`/order-success`)**
- Confirmation with order ID
- Links to track order and view orders

#### 4. Repair Booking Journey

**Book Repair Page (`/book-repair`)**
- Select service category → service
- Device brand → model selection (from DB)
- Issue description
- Preferred date + time
- Customer name + phone (pre-filled if logged in)
- Delivery zone (for pickup/dropoff)
- Submit → booking created, SMS confirmation sent

**Booking Success Page (`/booking-success`)**
- Booking reference
- Next steps info

#### 5. Account Management (Authenticated)

**Profile Page (`/profile`)**
- Edit name, email
- Change password
- View referral code + share link
- Loyalty points balance

**Orders Page (`/orders`)**
- List of all orders with status badges
- Click to view detail

**Order Detail Page (`/orders/:id`)**
- Full order with items, prices, delivery info
- Payment status
- Cancellation option (if pending)

**Booking Detail Page (`/bookings/:id`)**
- Booking status timeline
- Cost breakdown
- Payment status

**Points Page (`/points`)**
- Points balance
- Transaction history (earned, redeemed, awarded)
- Referral stats

#### 6. Static Pages
- `/about` — Company info
- `/contact` — Contact form
- `/blog` — Blog posts
- `/careers` — Job listings
- `/faqs` — Frequently asked questions
- `/privacy-policy` — Privacy policy
- `/terms-of-service` — Terms
- `/cookie-policy` — Cookie policy
- `/returns` — Returns policy
- `/warranty` — Warranty info

---

## 3. Admin Application (Next.js SSR)

**URL**: Separate Vercel deployment (root dir: `admin/`)  
**Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase Auth  
**Auth**: httpOnly cookie (`admin_session`) with JWT + expiry. Middleware protects all routes.

### Admin Proxy Architecture

All API calls from the admin go through `/api/proxy/[...path]`:
```
Admin UI → /api/proxy/admin/orders → Backend /api/v1/admin/orders
```
The proxy reads the `admin_session` cookie, extracts the token, and forwards it as `Authorization: Bearer <token>` to the backend. This keeps the token server-side only.

### Admin Pages

#### Dashboard (`/`)
- KPI cards: total orders, bookings, revenue, active users
- Recent orders table
- Low stock alerts
- Quick action buttons

#### Orders (`/orders`)
- Full orders list with search, status filter, date range
- Status update (single + bulk)
- CSV export
- Click to view order detail with items

#### Repair Bookings (`/repairs`)
- All bookings with status filter
- Update status (received → diagnosing → repairing → ready → completed)
- Set final repair cost
- Triggers SMS to customer on status change

#### Transactions (`/transactions`)
- All M-Pesa transactions
- Filter by type, status, date
- Shows order/booking reference

#### Products (`/products`)
- Full product catalog management
- Create/edit/deactivate products
- Stock quantity management
- Low stock threshold setting
- Image URL management

#### Devices & Pricing (`/devices`)
- **Brands tab**: Add/edit/delete device brands (name, type, logo, country of origin)
- **Models tab**: Add/edit/delete device models per brand
- **Service Pricing tab**: Set pricing rules per service + brand + model combination. Supports wildcard (any brand/model).

#### Delivery Zones (`/zones`)
- Create/edit/deactivate delivery zones
- Set zone name and delivery fee

#### Repair Services (`/services`)
- Create/edit/deactivate repair services
- Set category, description, estimated duration, warranty period

#### Users (`/users`)
- Full user list with search
- View verification status
- Activate/deactivate accounts
- Click to view customer history (orders, bookings, points)

#### Loyalty & Referrals (`/loyalty`)
- Points ledger overview
- Referral relationships
- Manual points award to users

#### Analytics (`/analytics`)
- Revenue charts
- Order volume trends
- Booking trends
- Category breakdown

#### Revenue (`/revenue`)
- Revenue breakdown by source (orders vs bookings)
- Confirmed vs pending revenue
- Date range filter

#### Notifications (`/notifications`)
- Send push/SMS notifications to users

#### Admin Accounts (`/admins`) — Superadmin only
- List all admin accounts
- Create new admin (username, email, full name, password, role)
- Deactivate admin accounts

#### Theme
- Light/Dark mode toggle in sidebar, persisted in `localStorage`

---

## Database Tables (Supabase/PostgreSQL)

| Table | Description |
|-------|-------------|
| `users` | Customer accounts. Fields: id, full_name, phone_number, email, password (hashed), is_verified, phone_verified, points, referral_code, referred_by, is_active |
| `admins` | Admin accounts. Fields: id, username, email, full_name, password (hashed), role (admin/superadmin), is_active, last_login |
| `products` | Product catalog. Fields: id, title, description, price, stock_quantity, low_stock_threshold, specifications (JSON), images (array), is_active, is_featured |
| `orders` | Customer orders. Fields: id, user_id, status, subtotal, delivery_fee, points_redeemed, total, delivery_address, delivery_zone_id, payment_status |
| `order_items` | Line items per order. Fields: order_id, product_id, quantity, unit_price |
| `bookings` | Repair bookings. Fields: id, user_id, service_id, device_brand, device_model, issue_description, status, commitment_paid, final_cost, preferred_date, preferred_time |
| `repair_services` | Service catalog. Fields: id, name, description, category, estimated_duration, warranty_period, image_url, is_active |
| `device_brands` | Device brands. Fields: id, name, device_type, logo_url, country_of_origin, is_popular, is_active |
| `device_models` | Device models per brand. Fields: id, brand_id, name, device_type, release_year, is_active |
| `service_pricing` | Pricing rules. Fields: id, service_id, brand_id (nullable), model_id (nullable), price. NULL brand/model = wildcard. |
| `delivery_zones` | Delivery zones. Fields: id, name, fee, is_active |
| `points_ledger` | Points transaction log. Fields: id, user_id, points, type, description, order_id |
| `payments` | M-Pesa payment records. Fields: id, order_id, phone, amount, status, mpesa_receipt |
| `contact_messages` | Contact form submissions |
| `admin_audit_log` | Admin action log. Fields: id, admin_id, action, target_type, target_id, details |

---

## Security

- **Client tokens**: JWT in `sessionStorage` (cleared on tab close)
- **Admin tokens**: JWT in httpOnly cookie (not accessible to JS)
- **Admin proxy**: Token never exposed to browser JS
- **Passwords**: SHA256 + random salt
- **CORS**: Restricted to known origins only
- **RLS**: Supabase Row Level Security on all tables
- **Admin bypass**: `supabase_admin` (service role) used only in backend, never in client
- **Route protection**: Next.js middleware validates session on every admin request
- **No secrets in git**: All `.env` files gitignored, `.next` build folder excluded

---

## Environment Variables

### Backend (`backend/.env`)
```
JWT_SECRET=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
TEXTPIE_API_KEY=
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=
DEBUG=False
CORS_ORIGINS=https://bluetech-5xmc.vercel.app,https://your-admin.vercel.app
```

### Client (`client/.env`)
```
VITE_API_BASE_URL=https://bluetechnology-y1f8.onrender.com/api/v1
VITE_APP_NAME=BlueTech
```

### Admin (`admin/.env.local`)
```
BACKEND_URL=https://bluetechnology-y1f8.onrender.com
```

---

## Deployment

| App | Platform | Trigger |
|-----|----------|---------|
| Backend | Render.com | Push to `main` (auto-deploy) |
| Client | Vercel | Push to `main`, root dir: `client/` |
| Admin | Vercel | Push to `main`, root dir: `admin/` |
