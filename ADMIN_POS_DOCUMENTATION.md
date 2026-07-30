# BlueTech Admin POS — System Documentation

> **Stack:** React 18 + TypeScript · FastAPI · Supabase (PostgreSQL) · Tailwind CSS  
> **Version:** 2.0 · **Updated:** 2026-07-30

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Admin Authentication](#2-admin-authentication)
3. [Dashboard](#3-dashboard)
4. [Orders Management](#4-orders-management)
5. [Repairs / Bookings](#5-repairs--bookings)
6. [Product Management](#6-product-management)
7. [Delivery Zones](#7-delivery-zones)
8. [Service Management](#8-service-management)
9. [Users](#9-users)
10. [Data Layer — Supabase](#10-data-layer--supabase)
11. [Backend API Reference](#11-backend-api-reference)
12. [POS Workflows](#12-pos-workflows)
13. [Environment Variables](#13-environment-variables)
14. [Known Gaps & Build Priorities](#14-known-gaps--build-priorities)

---

## 1. System Overview

BlueTech Admin is a full **Point-of-Sale and operations management panel** for a Nairobi-based electronics shop running two business lines:

| Business Line | What it manages |
|---|---|
| **E-Commerce** | Product catalog, orders, delivery, M-Pesa payments |
| **Repair Services** | Device repair bookings, job queue, technician workflow, cost tracking |

**Architecture:**

```
Admin SPA (React)
    ├── Supabase JS client  →  Direct DB reads/writes (CRUD)
    └── FastAPI backend     →  Auth, M-Pesa, SMS, business logic
```

**Auto-polling:** Every 2 minutes the panel silently re-fetches all data. New orders/bookings trigger toast notifications. Session extends on each successful fetch.

---

## 2. Admin Authentication

### 2.1 Dedicated Admin Auth Endpoints

All admin auth lives under `/api/v1/admin/auth/` — completely separate from client auth.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/admin/auth/login` | Public | Login with username + password → JWT |
| `GET` | `/api/v1/admin/auth/me` | Admin JWT | Get own profile |
| `POST` | `/api/v1/admin/auth/logout` | Admin JWT | Server-side logout log |
| `POST` | `/api/v1/admin/auth/change-password` | Admin JWT | Change own password |
| `POST` | `/api/v1/admin/auth/create-admin` | Superadmin JWT | Create new admin account |
| `PUT` | `/api/v1/admin/auth/deactivate/{id}` | Superadmin JWT | Deactivate an admin |
| `GET` | `/api/v1/admin/auth/list` | Superadmin JWT | List all admins |

### 2.2 Login Request / Response

```json
// POST /api/v1/admin/auth/login
// Request
{ "username": "admin", "password": "YourPassword" }

// Response 200
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "admin": {
    "id": "uuid",
    "username": "admin",
    "full_name": "Admin Name",
    "email": "admin@bluetech.co.ke",
    "role": "admin"   // "admin" | "superadmin"
  }
}
```

### 2.3 JWT Token Claims

```json
{
  "admin_id": "uuid",
  "username": "admin",
  "role": "admin",
  "exp": 1234567890
}
```

### 2.4 Roles

| Role | Permissions |
|---|---|
| `admin` | Login, view profile, change own password, manage orders/bookings/products/zones/services |
| `superadmin` | All admin permissions + create/deactivate admins, list all admins |

### 2.5 Frontend Session (`admin/src/lib/auth.ts`)

| Function | Purpose |
|---|---|
| `isAuthenticated()` | Checks sessionStorage + 8-hour expiry |
| `createSession(username)` | Writes session after successful login |
| `clearSession()` | Destroys session on logout |
| `extendSession()` | Resets 8-hour timer on data fetch |

Token stored in `sessionStorage` as `bt_admin_token`. Login tries the backend API first, falls back to env credentials if API is unreachable.

### 2.6 `admins` Table Schema

```sql
CREATE TABLE admins (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username    VARCHAR(50) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    password    VARCHAR(255) NOT NULL,   -- SHA256 salted hash
    role        VARCHAR(50) DEFAULT 'admin',
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    last_login  TIMESTAMPTZ
);
```

---

## 3. Dashboard

**Component:** `DashboardView.tsx`  
**Data source:** Computed client-side from live `orders` + `bookings` arrays.

### 3.1 Metric Cards

| Card | Calculation |
|---|---|
| Orders Today | `orders` where `created_at` date = today |
| Repairs Booked Today | `bookings` where `created_at` date = today |
| Revenue Today | Sum of `total_amount` (paid, non-cancelled orders) + `final_cost` (completed bookings) for today |
| Active Queue | Orders in `pending/confirmed/processing` + bookings in `pending/confirmed/in_diagnosis/in_repair` |

### 3.2 Recent Activity Tables

- **Recent Orders** — last 10: ID, customer, total, status, "View Details"
- **Recent Bookings** — last 10: ID, customer, device, status, "View Details"

"View All" buttons navigate to the Orders / Repairs tabs.

---

## 4. Orders Management

**Component:** `OrdersView.tsx`

### 4.1 Filters

| Filter | Field |
|---|---|
| Search | `full_name` or `phone_number` |
| Status | `pending / confirmed / processing / dispatched / delivered / cancelled` |
| Date From | `created_at ≥ date` |
| Date To | `created_at ≤ date` |

### 4.2 Table Columns

| Column | Source |
|---|---|
| Order ID | `id` (first UUID segment) |
| Date Placed | `created_at` |
| Customer | `full_name` + WhatsApp + Call links |
| Delivery Zone | `delivery_zone` |
| Invoice Total | `total_amount` (KES) |
| Payment | `payment_status` badge (paid / unpaid) |
| Fulfillment Status | `status` — inline editable dropdown |
| Actions | "View Details" → modal |

Pagination: 20 per page.

### 4.3 Inline Status Update

Directly updates `status` without opening the modal.

```
databaseService.updateOrderStatus(orderId, newStatus)
→ Supabase: UPDATE orders SET status = ? WHERE id = ?
```

### 4.4 Order Detail Modal

**Section 1 — Customer & Delivery**
- Full name, phone (WhatsApp + Call links)
- Delivery zone, destination address

**Section 2 — Line Items**
- Product title, qty, unit price, line total
- Summary: subtotal + delivery fee + grand total

**Section 3 — Admin Controls**
- Fulfillment status dropdown
- Payment status toggle (PAID / UNPAID)
- Internal notes textarea

**Save:** `databaseService.saveOrderDetails(id, { status, payment_status, notes })`

### 4.5 Order Status Flow

```
pending → confirmed → processing → dispatched → delivered
                                              ↘ cancelled (any stage)
```

---

## 5. Repairs / Bookings

**Component:** `BookingsView.tsx`

### 5.1 Booking Status Lifecycle

```
pending → confirmed → picked_up → in_diagnosis → in_repair → ready → completed
                                                                    ↘ cancelled
```

### 5.2 Filters

| Filter | Field |
|---|---|
| Search | `full_name`, `phone_number`, `device_model` |
| Status | All 8 booking statuses |
| Device Type | Auto-derived from actual booking data |

### 5.3 Table Columns

| Column | Source |
|---|---|
| Booking ID | `id` |
| Date | `created_at` |
| Customer | `full_name` + WhatsApp + Call links |
| Device | `device_type` + `device_model` |
| Issue | `issue_description` (truncated) |
| Fulfillment | `fulfillment_type` (dropoff / pickup) |
| Status | Inline editable dropdown |
| Actions | "View Details" → modal |

### 5.4 Booking Detail Modal

- Customer info + contact links
- Device: type, model, issue, fulfillment type, pickup address
- Repair Services Catalog (loaded from DB for cost reference)
- Admin controls:
  - Status dropdown (all 8 states)
  - Estimated cost (KES)
  - Final cost (KES)
  - Internal notes

**Save:** `databaseService.saveBooking({ id, status, estimated_cost, final_cost, internal_notes })`

### 5.5 SMS Triggers on Status Change

| Status | SMS to Customer |
|---|---|
| `confirmed` | "Your repair booking #{id} is confirmed. We'll contact you shortly." |
| `in_diagnosis` | "Your device is being diagnosed. We'll send a cost estimate soon." |
| `ready` | "Your device is ready! Final cost: KES {final_cost}. Come collect it." |
| `completed` | "Repair complete. Thank you for choosing BlueTech!" |

---

## 6. Product Management

**Component:** `ProductManagementView.tsx`

### 6.1 Views

- Table view (default)
- Grid/card view

### 6.2 Filters

- Search by title
- Filter by category
- Toggle: Active only / All

### 6.3 Product Form Fields

| Field | Type | Required |
|---|---|---|
| Title | Text | ✅ |
| Description | Textarea | ✅ |
| Price (KES) | Number | ✅ |
| Stock Quantity | Number | ✅ |
| Category | Text | — |
| Brand | Text | — |
| Image | Upload → Supabase Storage | — |
| Is Active | Toggle | ✅ |
| Specifications | Key-value pairs (JSONB) | — |

### 6.4 Image Upload

Component: `ImageUpload.tsx`  
Uploads to Supabase Storage bucket `product-images`.  
Returns public URL → stored in `image_url`.

### 6.5 Category Management

Categories are derived from `specifications.category` on each product.  
Admin can rename a category (bulk-updates all products in that category).

### 6.6 Operations

| Action | Method |
|---|---|
| Create | `databaseService.saveProduct(product)` → INSERT |
| Update | `databaseService.saveProduct(product)` → UPDATE |
| Deactivate | `databaseService.deleteProduct(id)` → sets `is_active = false` |

---

## 7. Delivery Zones

**Component:** `DeliveryZonesView.tsx`

### 7.1 Table Columns

| Column | Field |
|---|---|
| Zone Name | `zone_name` |
| Delivery Fee | `delivery_fee` (KES) |
| Status | `is_active` toggle |
| Actions | Inline edit / Delete |

### 7.2 Operations

- **Add:** Modal → zone name + fee + active status
- **Inline edit:** Edit name and fee directly in the row
- **Toggle active:** Instant, no modal
- **Delete:** Hard delete from DB

### 7.3 Default Zones

| Zone | Fee |
|---|---|
| Nairobi CBD | KES 200 |
| Westlands / Parklands | KES 250 |
| Kilimani / Ngong Road | KES 300 |
| Thika / Kiambu Outskirts | KES 450 |
| Mombasa / Kisumu / Upcountry | KES 600 |

---

## 8. Service Management

**Component:** `ServiceManagementView.tsx`

### 8.1 Service Fields

| Field | Type |
|---|---|
| Service Name | Text |
| Service Category | Text (e.g. "Phone Repair", "Laptop Repair") |
| Base Price (KES) | Number |
| Duration | Text (e.g. "1–2 hours") |
| Warranty | Text (e.g. "30 days") |

Services appear in the Booking detail modal as cost reference suggestions for technicians.

---

## 9. Users

**Component:** `UsersView.tsx` — read-only.

### 9.1 Table Columns

| Column | Source |
|---|---|
| User | `full_name` + avatar initial + `id` |
| Contact | `email` + `phone_number` |
| Status | `email_confirmed_at` → Verified / Unverified |
| Registered | `created_at` (absolute + relative) |
| Last Sign In | `last_sign_in_at` |

> No admin actions (ban/delete/edit) are currently implemented — see Section 14.

---

## 10. Data Layer — Supabase

### 10.1 Tables

| Table | Purpose |
|---|---|
| `admins` | Admin accounts |
| `users` | Registered client accounts |
| `products` | Product catalog |
| `orders` | Customer orders |
| `order_items` | Line items per order |
| `bookings` | Repair job requests |
| `delivery_zones` | Delivery areas + fees |
| `repair_services` | Services catalog |

### 10.2 Key Enums

```sql
order_status:   pending | confirmed | processing | dispatched | delivered | cancelled
booking_status: pending | confirmed | picked_up | in_diagnosis | in_repair | ready | completed | cancelled
payment_status: unpaid | paid
fulfillment:    dropoff | pickup
```

### 10.3 `databaseService` Methods

| Method | Table | Operation |
|---|---|---|
| `getProducts()` | products | SELECT * ORDER BY created_at DESC |
| `saveProduct(p)` | products | INSERT or UPDATE |
| `deleteProduct(id)` | products | DELETE |
| `getOrders()` | orders | SELECT * ORDER BY created_at DESC |
| `getOrderItems(orderId)` | order_items | SELECT WHERE order_id |
| `updateOrderStatus(id, status)` | orders | UPDATE status |
| `saveOrderDetails(id, data)` | orders | UPDATE status + payment_status + notes |
| `getBookings()` | bookings | SELECT * ORDER BY created_at DESC |
| `saveBooking(b)` | bookings | INSERT or UPDATE |
| `updateBookingStatus(id, status)` | bookings | UPDATE status |
| `getDeliveryZones()` | delivery_zones | SELECT * ORDER BY zone_name |
| `saveDeliveryZone(z)` | delivery_zones | INSERT or UPDATE |
| `deleteDeliveryZone(id)` | delivery_zones | DELETE |
| `getRepairServices()` | repair_services | SELECT * ORDER BY service_name |
| `saveRepairService(s)` | repair_services | INSERT or UPDATE |
| `deleteRepairService(id)` | repair_services | DELETE |
| `getUsers()` | users | SELECT * ORDER BY created_at DESC |

---

## 11. Backend API Reference

### 11.1 Admin Auth (New — Dedicated)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/admin/auth/login` | None | Admin login → JWT |
| GET | `/api/v1/admin/auth/me` | Admin JWT | Own profile |
| POST | `/api/v1/admin/auth/logout` | Admin JWT | Logout log |
| POST | `/api/v1/admin/auth/change-password` | Admin JWT | Change password |
| POST | `/api/v1/admin/auth/create-admin` | Superadmin JWT | Create admin |
| PUT | `/api/v1/admin/auth/deactivate/{id}` | Superadmin JWT | Deactivate admin |
| GET | `/api/v1/admin/auth/list` | Superadmin JWT | List all admins |

### 11.2 Client Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/signup` | None | Register client |
| POST | `/api/v1/auth/login` | None | Login client |
| POST | `/api/v1/auth/verify-phone` | None | OTP verification |
| POST | `/api/v1/auth/forgot-password` | None | Request reset OTP |
| POST | `/api/v1/auth/reset-password` | None | Reset with OTP |
| POST | `/api/v1/auth/resend-code` | None | Resend OTP |

### 11.3 Products

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/products` | None | List (search, active_only) |
| GET | `/api/v1/products/{id}` | None | Single product |
| POST | `/api/v1/products` | ⚠️ None* | Create |
| PUT | `/api/v1/products/{id}` | ⚠️ None* | Update |
| DELETE | `/api/v1/products/{id}` | ⚠️ None* | Deactivate |

*Write endpoints need admin JWT guard — see Section 14.

### 11.4 Orders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/orders` | Client JWT | Create order + SMS |
| GET | `/api/v1/orders/{id}` | None | Get with items |
| GET | `/api/v1/orders/track/{phone}` | None | Track by phone |
| PUT | `/api/v1/orders/{id}/status` | ⚠️ None* | Update status |

### 11.5 Bookings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/bookings` | Client JWT | Create booking + SMS |
| GET | `/api/v1/bookings/{id}` | None | Get booking |
| GET | `/api/v1/bookings/track/{phone}` | None | Track by phone |
| PUT | `/api/v1/bookings/{id}/status` | ⚠️ None* | Update status |

### 11.6 Payments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/payments/mpesa/initiate` | Client JWT | STK push |
| POST | `/api/v1/payments/mpesa/callback` | None (Safaricom) | Payment webhook |
| GET | `/api/v1/payments/mpesa/status/{id}` | None | Poll status |

### 11.7 Catalog & Tracking

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/delivery-zones` | None | Active zones |
| GET | `/api/v1/repair-services` | None | Services (category filter) |
| GET | `/api/v1/repair-services/categories` | None | Unique categories |
| GET | `/api/v1/track/{phone}` | None | All orders + bookings by phone |

---

## 12. POS Workflows

### 12.1 Order Fulfillment

```
Client places order (client app)
        ↓
Admin sees order → status: pending
        ↓
Admin confirms → status: confirmed
        ↓
Admin processes → status: processing
        ↓
Admin dispatches → status: dispatched
        ↓
Delivery confirmed → status: delivered
        ↓
Admin marks payment → payment_status: paid
```

### 12.2 Repair Job

```
Client books repair (client app)
        ↓
Admin sees booking → status: pending
        ↓
Admin confirms appointment → status: confirmed  [SMS sent]
        ↓
Device collected → status: picked_up
        ↓
Technician diagnoses → status: in_diagnosis + estimated_cost set  [SMS sent]
        ↓
Repair begins → status: in_repair
        ↓
Repair done → status: ready + final_cost set  [SMS: "device ready, KES X"]
        ↓
Client collects → status: completed  [SMS sent]
```

---

## 13. Environment Variables

```env
# admin/.env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://your-backend.railway.app/api/v1
VITE_ADMIN_USERNAME=admin
VITE_ADMIN_PASSWORD=BlueTech@2026!

# backend/.env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...   # Required for admin writes
JWT_SECRET=your-secret-key
```

---

## 14. Known Gaps & Build Priorities

### Priority 1 — Security (Do Now)

| Gap | Fix |
|---|---|
| Product write endpoints have no auth guard | Add `Depends(get_current_admin)` to POST/PUT/DELETE `/api/v1/products` |
| Order/booking status update endpoints unprotected | Add admin JWT guard to `PUT /api/v1/orders/{id}/status` and `PUT /api/v1/bookings/{id}/status` |

### Priority 2 — Missing Features

| Gap | Fix |
|---|---|
| `saveOrderDetails()` missing from `databaseService` | Add method: `UPDATE orders SET status, payment_status, notes WHERE id` |
| No SMS on booking status changes | Add SMS trigger in booking status update endpoint |
| Users view is read-only | Add activate/deactivate user action to `UsersView` + `PUT /api/v1/admin/users/{id}` |

### Priority 3 — Admin API Endpoints (Move logic off client)

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/admin/dashboard` | Server-side stats (move from client-side computation) |
| `GET /api/v1/admin/orders` | Paginated, filtered orders for admin |
| `GET /api/v1/admin/bookings` | Paginated, filtered bookings for admin |
| `PUT /api/v1/admin/orders/{id}` | Update order with audit log |
| `PUT /api/v1/admin/bookings/{id}` | Update booking + trigger SMS |

---

## 15. Component Architecture

```
admin/src/
├── App.tsx                        # Root: auth, tab routing, data fetch, polling
├── types.ts                       # All TypeScript interfaces
├── lib/
│   ├── supabase.ts                # databaseService — all Supabase CRUD
│   ├── auth.ts                    # Session management
│   └── utils.ts                   # formatKES, formatDate, WhatsApp/tel links
└── components/
    ├── DashboardView.tsx          # Metrics + recent activity
    ├── OrdersView.tsx             # Orders table + detail modal
    ├── BookingsView.tsx           # Bookings table + detail modal
    ├── ProductManagementView.tsx  # Product CRUD + categories
    ├── ServiceManagementView.tsx  # Repair services CRUD
    ├── DeliveryZonesView.tsx      # Zones CRUD
    ├── UsersView.tsx              # Read-only users list
    ├── ImageUpload.tsx            # Supabase Storage uploader
    ├── AuthGate.tsx               # Login screen wrapper
    └── ConfigDrawer.tsx           # Settings panel
```

```
backend/app/
├── main.py                        # FastAPI app + branded landing page
├── config.py                      # Settings from env
├── database.py                    # Supabase anon + service role clients
├── api/
│   ├── admin_auth.py              # ✅ NEW — dedicated admin auth router
│   ├── auth.py                    # Client auth router
│   ├── products.py
│   ├── orders.py
│   ├── bookings.py
│   ├── payments.py
│   ├── delivery_zones.py
│   ├── services.py
│   └── tracking.py
├── models/auth.py                 # Pydantic schemas
├── services/auth_service.py       # Business logic
└── utils/
    ├── auth.py                    # JWT, hashing, token decode
    ├── sms_service.py
    └── mpesa.py
```
