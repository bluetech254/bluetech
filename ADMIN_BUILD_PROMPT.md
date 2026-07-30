# BlueTech Kenya — Admin Panel Build Prompt

## Project Overview

BlueTech Kenya is a tech e-commerce + repair booking platform. This document is the complete specification to build the **admin panel** (`/admin` directory) from scratch. Follow it exactly and the result will work immediately with zero changes.

---

## Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS (dark theme, custom design tokens)
- **State:** React `useState` / `useEffect` only — no external state library⋮
- **Charts:** Recharts
- **Icons:** lucide-react
- **Auth:** httpOnly cookie (`admin_session`) set by Next.js API route, JWT verified by backen

---

## Environment Variables (`.env.local`)

```
NEXT_PUBLIC_API_URL=https://bluetechnology-y1f8.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://ureebvpesbkbholidlrn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWVidnBlc2JrYmhvbGlkbHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjM4MjcsImV4cCI6MjA5ODI5OTgyN30.AngVW8RLlK6b8MeWHWYz0z2Pi0qVB65bsXjwA1pcdgc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWVidnBlc2JrYmhvbGlkbHJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjcyMzgyNywiZXhwIjoyMDk4Mjk5ODI3fQ.B9u-wElfqgPDlstwTVR18CSKf2vVa3EKbrgFHcO_aPI
```

---

## Backend Base URL

```
https://bluetechnology-y1f8.onrender.com
```

All API calls from the frontend go through this base URL. The admin JWT is stored in the `admin_session` cookie and extracted client-side to set `Authorization: Bearer <token>` on every request.

---

## Session Cookie Shape

The `admin_session` cookie is a JSON-encoded, URL-encoded string set as `httpOnly`:

```json
{
  "id": "<admin_uuid>",
  "username": "string",
  "full_name": "string",
  "email": "string",
  "role": "admin | superadmin",
  "token": "<jwt>",
  "exp": 1234567890000
}
```

Session expires after **8 hours**. Middleware redirects to `/login` if missing or expired.

---

## Complete Backend API Reference

### 🔐 Admin Authentication — `/api/v1/admin/auth`

| Method | Path                                                           | Auth   | Role       | Description                                                                         |
| ------ | -------------------------------------------------------------- | ------ | ---------- | ----------------------------------------------------------------------------------- |
| POST   | `/api/v1/admin/auth/login`                                   | None   | —         | Login. Body:`{username, password}`. Returns `{access_token, token_type, admin}` |
| GET    | `/api/v1/admin/auth/me`                                      | Bearer | any        | Current admin profile                                                               |
| POST   | `/api/v1/admin/auth/logout`                                  | Bearer | any        | Stateless logout (log only)                                                         |
| POST   | `/api/v1/admin/auth/change-password`                         | Bearer | any        | Body:`{current_password, new_password}`                                           |
| POST   | `/api/v1/admin/auth/create-admin`                            | Bearer | superadmin | Body:`{username, email, full_name, password, role}`                               |
| PUT    | `/api/v1/admin/auth/deactivate/{id}`                         | Bearer | superadmin | Deactivate admin account                                                            |
| GET    | `/api/v1/admin/auth/list`                                    | Bearer | superadmin | List all admins. Returns`{data, count}`                                           |
| PUT    | `/api/v1/admin/auth/users/{id}/toggle-active?is_active=bool` | Bearer | any        | Toggle client user active state                                                     |

**Login response shape:**

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "admin": { "id", "username", "full_name", "email", "role" }
}
```

---

### 📊 Admin Operations — `/api/v1/admin`

| Method | Path                                                         | Auth   | Description                                                                              |
| ------ | ------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------- |
| GET    | `/api/v1/admin/dashboard`                                  | Bearer | Full dashboard stats (today metrics, revenue, charts, low stock, recent orders/bookings) |
| GET    | `/api/v1/admin/stock/alerts`                               | Bearer | Products at or below low_stock_threshold. Returns`{data, count}`                       |
| PUT    | `/api/v1/admin/stock/{product_id}/threshold?threshold=int` | Bearer | Update low-stock threshold                                                               |
| GET    | `/api/v1/admin/export/orders?status=&date_from=&date_to=`  | Bearer | Download orders CSV                                                                      |
| GET    | `/api/v1/admin/export/bookings?status=`                    | Bearer | Download bookings CSV                                                                    |
| POST   | `/api/v1/admin/orders/bulk-status`                         | Bearer | Body:`{order_ids: string[], status: string}`                                           |
| GET    | `/api/v1/admin/referrals`                                  | Bearer | Referral leaderboard. Returns`{total_referrals, leaderboard[]}`                        |
| GET    | `/api/v1/admin/referrals/user/{user_id}`                   | Bearer | Users referred by a specific user                                                        |
| GET    | `/api/v1/admin/customers/{user_id}/history`                | Bearer | Full customer profile + orders + bookings + points history                               |
| GET    | `/api/v1/admin/search?q=string`                            | Bearer | Global search across users, orders, bookings                                             |
| GET    | `/api/v1/admin/audit-log?limit=50&admin_id=`               | Bearer | Admin activity log                                                                       |

**Dashboard response shape:**

```json
{
  "today": { "orders", "bookings", "revenue", "new_users" },
  "totals": { "orders", "bookings", "products", "users", "order_revenue", "booking_revenue", "total_revenue" },
  "active_repair_queue": 0,
  "low_stock_alerts": [{ "id", "title", "stock", "threshold" }],
  "order_status_breakdown": { "pending": 0, "confirmed": 0, ... },
  "revenue_chart": [{ "date": "YYYY-MM-DD", "revenue": 0 }],
  "recent_orders": [],
  "recent_bookings": []
}
```

---

### 🛒 Orders — `/api/v1/orders`

| Method | Path                             | Auth     | Description                                                                                            |
| ------ | -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| GET    | `/api/v1/orders?status=`       | None     | List all orders. Returns`{data, count}`                                                              |
| GET    | `/api/v1/orders/{id}`          | None     | Single order                                                                                           |
| POST   | `/api/v1/orders`               | Optional | Create order (client-facing)                                                                           |
| PUT    | `/api/v1/orders/{id}/status`   | Bearer   | Body:`{status}`. Statuses: `pending \| confirmed \| processing \| dispatched \| delivered \| cancelled` |
| GET    | `/api/v1/orders/track/{phone}` | None     | Track by phone                                                                                         |

**Order fields:** `id, full_name, phone_number, email, delivery_zone, delivery_address, subtotal, delivery_fee, points_discount, total_amount, status, payment_status, payment_method, notes, created_at, order_items[]`

---

### 🔧 Bookings — `/api/v1/bookings`

| Method | Path                               | Auth   | Description                                                                                                                 |
| ------ | ---------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/bookings?status=`       | None   | List all bookings. Returns`{data, count}`                                                                                 |
| GET    | `/api/v1/bookings/{id}`          | None   | Single booking                                                                                                              |
| POST   | `/api/v1/bookings`               | None   | Create booking (client-facing)                                                                                              |
| PUT    | `/api/v1/bookings/{id}/status`   | Bearer | Body:`{status}`. Statuses: `pending \| confirmed \| picked_up \| in_diagnosis \| in_repair \| ready \| completed \| cancelled` |
| PUT    | `/api/v1/bookings/{id}/cost`     | Bearer | Body:`{estimated_cost, final_cost}`                                                                                       |
| GET    | `/api/v1/bookings/track/{phone}` | None   | Track by phone                                                                                                              |

**Booking fields:** `id, full_name, phone_number, device_type, device_model, issue_description, fulfillment_type, pickup_address, status, estimated_cost, final_cost, internal_notes, created_at`

---

### 📦 Products — `/api/v1/products`

| Method | Path                                          | Auth   | Description                             |
| ------ | --------------------------------------------- | ------ | --------------------------------------- |
| GET    | `/api/v1/products?search=&active_only=true` | None   | List products. Returns`{data, count}` |
| GET    | `/api/v1/products/{id}`                     | None   | Single product                          |
| POST   | `/api/v1/products`                          | Bearer | Create product                          |
| PUT    | `/api/v1/products/{id}`                     | Bearer | Update product                          |
| DELETE | `/api/v1/products/{id}`                     | Bearer | Deactivate product                      |

**Product fields:** `id, title, description, price, stock_quantity, low_stock_threshold, category, brand, image_url, specs, is_active, units_sold, created_at`

---

### 🗺️ Delivery Zones — `/api/v1/delivery-zones`

| Method | Path                       | Auth | Description                                |
| ------ | -------------------------- | ---- | ------------------------------------------ |
| GET    | `/api/v1/delivery-zones` | None | All active zones. Returns`{data, count}` |

**Zone fields:** `id, zone_name, delivery_fee, is_active`

---

### 🛠️ Repair Services — `/api/v1/repair-services`

| Method | Path                                                 | Auth | Description                             |
| ------ | ---------------------------------------------------- | ---- | --------------------------------------- |
| GET    | `/api/v1/repair-services?category=&search=&limit=` | None | List services. Returns`{data, count}` |
| GET    | `/api/v1/repair-services/categories`               | None | Unique categories                       |
| GET    | `/api/v1/repair-services/{id}`                     | None | Single service                          |

**Service fields:** `id, service_name, service_category, base_price, duration_minutes, warranty_days, is_active`

---

### 🎁 Loyalty & Points — `/api/v1/points`

| Method | Path                                                              | Auth           | Description                   |
| ------ | ----------------------------------------------------------------- | -------------- | ----------------------------- |
| GET    | `/api/v1/points/admin/user/{user_id}`                           | Bearer (admin) | User points balance + history |
| POST   | `/api/v1/points/admin/award/{user_id}?points=int&reason=string` | Bearer (admin) | Manually award points         |

---

## File Structure to Build

```
admin/
├── .env.local                          ← credentials above
├── app/
│   ├── layout.tsx                      ← root layout, fonts
│   ├── globals.css                     ← tailwind + design tokens
│   ├── login/
│   │   └── page.tsx                    ← login form
│   ├── api/
│   │   └── auth/
│   │       ├── route.ts                ← POST: login proxy → sets cookie
│   │       ├── logout/route.ts         ← POST: clears cookie
│   │       ├── me/route.ts             ← GET: proxy /auth/me
│   │       ├── change-password/route.ts
│   │       ├── create-admin/route.ts
│   │       ├── deactivate/[id]/route.ts
│   │       └── list/route.ts
│   └── (app)/
│       ├── layout.tsx                  ← sidebar + main wrapper
│       ├── page.tsx                    ← dashboard
│       ├── orders/page.tsx
│       ├── repairs/page.tsx
│       ├── products/page.tsx
│       ├── zones/page.tsx
│       ├── services/page.tsx
│       ├── users/page.tsx
│       ├── loyalty/page.tsx
│       ├── analytics/page.tsx
│       └── admins/page.tsx             ← superadmin only
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   └── ui/
│       └── (shared components)
├── lib/
│   ├── api.ts                          ← all adminApi methods
│   └── types.ts                        ← TypeScript types
└── middleware.ts                       ← auth guard
```

---

## Design System (Tailwind tokens)

Use a **dark theme** with these CSS variables in `globals.css`:

```css
:root {
  --base: #0f1117;           /* page background */
  --base-panel: #161b27;     /* cards, sidebar */
  --base-hover: #1e2535;     /* hover states */
  --base-border: #2a3347;    /* borders */
  --ink: #f0f4ff;            /* primary text */
  --ink-muted: #8b9ab5;      /* secondary text */
  --ink-dim: #4a5568;        /* placeholder/disabled */
  --volt: #6366f1;           /* primary accent (indigo) */
  --good: #22c55e;           /* success/active */
  --bad: #ef4444;            /* error/danger */
  --warn: #f59e0b;           /* warning */
  --coral-tile: #f97316;     /* notification dot */
  --lilac-tile: #a78bfa;     /* secondary accent */
}
```

Tailwind config should map these to utility classes: `bg-base`, `bg-base-panel`, `text-ink`, `text-ink-muted`, `border-base-border`, `text-volt`, `text-good`, `text-bad`, `bg-volt`, etc.

**Reusable CSS classes** (add to globals.css):

```css
.card { @apply bg-base-panel border border-base-border rounded-2xl; }
.btn-primary { @apply flex items-center gap-2 bg-volt text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-volt/90 transition-colors disabled:opacity-50; }
.input-field { @apply bg-base-hover border border-base-border rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus:border-volt/50 transition-colors; }
.pill { @apply inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium; }
.th { @apply text-left text-xs font-medium text-ink-dim px-4 py-3 uppercase tracking-wide; }
.td { @apply px-4 py-3 text-sm text-ink; }
.tabular { @apply tabular-nums; }
```

---

## Middleware (`middleware.ts`)

```typescript
// Protect all routes except /login and /api/auth/*
// Read admin_session cookie → parse JSON → check exp
// Redirect to /login if missing/expired, clear cookie
// matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
```

---

## `lib/api.ts` — All Methods

```typescript
// Token extracted from admin_session cookie client-side
// Base: process.env.NEXT_PUBLIC_API_URL

export const adminApi = {
  // Auth
  getMe: ()                                          → GET  /api/v1/admin/auth/me
  changePassword: (current_password, new_password)   → POST /api/v1/admin/auth/change-password
  listAdmins: ()                                     → GET  /api/v1/admin/auth/list
  createAdmin: ({username,email,full_name,password,role}) → POST /api/v1/admin/auth/create-admin
  deactivateAdmin: (id)                              → PUT  /api/v1/admin/auth/deactivate/{id}
  toggleUserActive: (id, is_active)                  → PUT  /api/v1/admin/auth/users/{id}/toggle-active?is_active=bool

  // Dashboard & ops
  dashboard: ()                                      → GET  /api/v1/admin/dashboard
  stockAlerts: ()                                    → GET  /api/v1/admin/stock/alerts
  globalSearch: (q)                                  → GET  /api/v1/admin/search?q=
  auditLog: (limit?, admin_id?)                      → GET  /api/v1/admin/audit-log
  referrals: ()                                      → GET  /api/v1/admin/referrals
  customerHistory: (user_id)                         → GET  /api/v1/admin/customers/{id}/history
  bulkOrderStatus: (order_ids, status)               → POST /api/v1/admin/orders/bulk-status
  exportOrders: (params)                             → GET  /api/v1/admin/export/orders (window.open)
  exportBookings: (params)                           → GET  /api/v1/admin/export/bookings (window.open)

  // Orders
  getOrders: (status?)                               → GET  /api/v1/orders?status=
  updateOrderStatus: (id, status)                    → PUT  /api/v1/orders/{id}/status

  // Bookings
  getBookings: (status?)                             → GET  /api/v1/bookings?status=
  updateBookingStatus: (id, status)                  → PUT  /api/v1/bookings/{id}/status
  updateBookingCost: (id, estimated_cost, final_cost) → PUT /api/v1/bookings/{id}/cost

  // Products
  getProducts: (search?, activeOnly?)                → GET  /api/v1/products
  createProduct: (body)                              → POST /api/v1/products
  updateProduct: (id, body)                          → PUT  /api/v1/products/{id}
  deleteProduct: (id)                                → DELETE /api/v1/products/{id}

  // Zones
  getZones: ()                                       → GET  /api/v1/delivery-zones

  // Services
  getServices: ()                                    → GET  /api/v1/repair-services

  // Users
  getUsers: (q?)                                     → GET  /api/v1/admin/search?q=

  // Points
  getUserPoints: (user_id)                           → GET  /api/v1/points/admin/user/{id}
  awardPoints: (user_id, points, reason)             → POST /api/v1/points/admin/award/{id}?points=&reason=
}
```

---

## Pages — What Each Should Do

### `/` — Dashboard

- Stat cards: Today's orders, bookings, revenue, new users
- Revenue line chart (last 30 days) using Recharts
- Order status breakdown (bar or donut)
- Low stock alerts table
- Recent orders + recent bookings tables (5 each)
- Active repair queue count

### `/orders` — Orders

- Filter tabs: All / Pending / Confirmed / Processing / Dispatched / Delivered / Cancelled
- Table: order ID (truncated), customer name, phone, total (KES), status badge, payment status, date
- Click row → expand inline detail (items, address, notes)
- Status dropdown to update per row
- Bulk select + bulk status update
- Export CSV button → `window.open(BASE + /api/v1/admin/export/orders?token=...)`

### `/repairs` — Repair Bookings

- Filter tabs by status
- Table: booking ID, customer, device, issue, fulfillment type, status badge, cost, date
- Inline expand: full details + cost update form (estimated/final)
- Status update dropdown per row

### `/products` — Products

- Search input
- Toggle: Active only / All
- Table: image, title, brand, category, price (KES), stock (red if low), status
- Add product button → inline form
- Edit inline per row
- Delete (deactivate) button

### `/zones` — Delivery Zones

- Table: zone name, fee (KES), status
- Read-only (no edit needed unless you want to add it)

### `/services` — Repair Services

- Table: service name, category, base price, duration, warranty
- Read-only

### `/users` — Client Users

- Fetch via `GET /api/v1/admin/search?q=+` (returns all users)
- Table: name, phone, email, verified badge, loyalty points, registered date, active toggle
- Toggle active/deactivate per row

### `/loyalty` — Loyalty & Referrals

- Referral leaderboard table (from `/api/v1/admin/referrals`)
- Award points form: search user → enter points + reason → submit
- Points history per user (expandable)

### `/analytics` — Analytics

- Revenue chart (30 days)
- Order status breakdown chart
- Top metrics cards
- All data from `/api/v1/admin/dashboard`

### `/admins` — Admin Accounts (superadmin only)

- List all admins (role badge, status, last login)
- Create admin form (superadmin only)
- Deactivate button (superadmin only, can't deactivate self)
- Non-superadmins see read-only notice

---

## Next.js API Routes (Proxy Layer)

All routes read `admin_session` cookie server-side, extract `token`, forward to backend with `Authorization: Bearer <token>`.

```
POST /api/auth          → POST /api/v1/admin/auth/login  (sets cookie on success)
POST /api/auth/logout   → clears cookie
GET  /api/auth/me       → GET  /api/v1/admin/auth/me
POST /api/auth/change-password  → POST /api/v1/admin/auth/change-password
POST /api/auth/create-admin     → POST /api/v1/admin/auth/create-admin
PUT  /api/auth/deactivate/[id]  → PUT  /api/v1/admin/auth/deactivate/{id}
GET  /api/auth/list             → GET  /api/v1/admin/auth/list
```

Login route sets cookie:

```typescript
res.cookies.set("admin_session", JSON.stringify({
  id, username, full_name, email, role, token,
  exp: Date.now() + 8 * 60 * 60 * 1000
}), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 8*60*60, secure: prod })
```

---

## Key Implementation Notes

1. **Token extraction** (client-side, used in `lib/api.ts`):

```typescript
function getToken(): string {
  try {
    const raw = document.cookie.split("; ")
      .find(c => c.startsWith("admin_session="))?.split("=").slice(1).join("=");
    return raw ? JSON.parse(decodeURIComponent(raw)).token ?? "" : "";
  } catch { return ""; }
}
```

2. **Role check** (client-side, used in Sidebar + Admins page):

```typescript
const session = JSON.parse(decodeURIComponent(
  document.cookie.split("; ").find(c => c.startsWith("admin_session="))?.split("=").slice(1).join("=") ?? "{}"
));
const isSuperadmin = session?.role === "superadmin";
```

3. **KES formatting:**

```typescript
const formatKES = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
```

4. **Status badge colors:**

```
pending      → warn/amber
confirmed    → volt/indigo
processing   → lilac
dispatched   → blue
delivered    → good/green
cancelled    → bad/red
in_repair    → warn
completed    → good
```

5. **Chrome DevTools 500 fix** — add this route:

```
app/.well-known/appspecific/com.chrome.devtools.json/route.ts
→ GET returns NextResponse.json({}, { status: 404 })
```

6. **`package.json` dependencies needed:**

```json
{
  "next": "14.x",
  "react": "18.x",
  "react-dom": "18.x",
  "typescript": "5.x",
  "tailwindcss": "3.x",
  "lucide-react": "latest",
  "recharts": "latest",
  "clsx": "latest",
  "date-fns": "latest"
}
```

---

## Supabase (for reference only — backend handles all DB calls)

- URL: `https://ureebvpesbkbholidlrn.supabase.co`
- The admin panel does NOT call Supabase directly — all data goes through the FastAPI backend.

---

## What's Already Working on the Backend

- All endpoints above are live and tested
- JWT auth with `admin_id`, `username`, `role` claims
- `admins` table with `id, username, full_name, email, password (bcrypt), role, is_active, last_login`
- `users` table for client accounts
- `orders`, `bookings`, `products`, `delivery_zones`, `repair_services`, `points_ledger` tables all exist
- SMS notifications fire automatically on booking status changes
- Points are awarded automatically on order delivery

---

*Build the admin panel exactly as described. Every endpoint is live. Run `npm install && npm run dev` and it works.*
