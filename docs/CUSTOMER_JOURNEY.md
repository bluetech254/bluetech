# BlueTech Customer Journey Documentation

## Order Booking Customer Journey

### 1.1 Frontend Flow (React + Vite)

| Step | Component | Action | API Call |
|------|-----------|--------|----------|
| 1 | `HomePage` / `ProductsPage` | User browses products, selects items, clicks "Add to Cart" | — |
| 2 | `CartPage` | User reviews cart, enters delivery address, selects delivery zone | — |
| 3 | `CheckoutPage` | User fills: full_name, phone_number, email, selects `payment_method` (cash_on_delivery / mpesa / paystack / points_only), optionally enters `referral_code`, optionally `redeem_points` | — |
| 4 | `CheckoutPage` | User clicks "Place Order" | `POST /api/v1/orders` |
| 5 | UI | Shows order success / redirects to `OrderSuccessPage` | — |

### 1.2 Backend: `POST /api/v1/orders` (orders/service.py)

**Request body** (`CreateOrderData`):

```json
{
  "full_name": "John Doe",
  "phone_number": "+254712345678",
  "email": "john@example.com",
  "delivery_address": "Nairobi CBD",
  "delivery_zone": "Westlands",
  "items": [
    {"product_id": "uuid", "quantity": 1}
  ],
  "notes": "Leave package at reception",
  "payment_method": "paystack",     // cash_on_delivery | mpesa | paystack | points_only
  "referral_code": "JOHN200",       // optional
  "redeem_points": 500               // optional
}
```

**Backend processing**:

1. Validate items exist and have sufficient stock
2. Calculate `subtotal` = sum of (price × quantity)
3. Look up `delivery_zone` → get `delivery_fee`
4. Calculate `total_amount` = subtotal + delivery_fee
5. If `referral_code` valid → apply referrer logic, award points
6. If `redeem_points` → deduct from customer's `points` balance (atomic DB operation)
7. Create order with initial status: **`pending`**
8. Generate `payment_reference` (unique string for Paystack/M-Pesa tracking)
9. Return order object with: `id`, `status: "pending"`, `total_amount`, `payment_method`, `payment_reference`

**Response** (Order model):

```json
{
  "id": "order_uuid",
  "full_name": "John Doe",
  "phone_number": "+254712345678",
  "email": "john@example.com",
  "delivery_address": "Nairobi CBD",
  "delivery_zone": "Westlands",
  "subtotal": 1500,
  "delivery_fee": 200,
  "total_amount": 1700,
  "status": "pending",
  "payment_method": "paystack",
  "payment_reference": "ref_abc123",
  "payment_status": "pending",
  "points_deducted": 500,
  "created_at": "2026-01-15T10:30:00Z",
  "order_items": [...]
}
```

### 1.3 Payment Flows After Order Creation

#### 1.3.1 Paystack Payment Flow

| Step | Endpoint | Description |
|------|----------|-------------|
| 1 | `POST /api/v1/payments/order/{order_id}/initiate` | Backend initializes Paystack transaction, returns `authorization_url` |
| 2 | **Customer** | Redirects to Paystack checkout, enters card details, completes payment |
| 3 | Paystack → Customer | Returns `authorization_code` + `reference` |
| 4 | `POST /api/v1/payments/order/verify/{reference}` | Backend verifies Paystack HMAC-SHA512 signature, updates `payment_status` = `paid` |
| 5 | Order status updates: `pending` → **`confirmed`** |

#### 1.3.2 M-Pesa Payment Flow

| Step | Endpoint | Description |
|------|----------|-------------|
| 1 | `POST /api/v1/payments/mpesa/initiate?order_id={id}` | Backend initiates STK push, sends prompt to customer's phone |
| 2 | **Customer** | Receives SMS from Safaricom, enters PIN, completes STK push |
| 3 | Safaricom → Backend | Callback to `POST /api/v1/payments/mpesa/callback` (IP-verified) |
| 4 | `GET /api/v1/payments/mpesa/status/{order_id}` | Polls payment status (actively queries Safaricom if still pending) |
| 5 | Order status updates: `pending` → **`confirmed`** |

#### 1.3.3 Cash on Delivery

| Step | Description |
|------|-----------|
| 1 | Order created with `payment_method: "cash_on_delivery"`, `payment_status: "pending"` |
| 2 | No API call needed — order remains `pending` until delivery |
| 3 | After delivery → admin updates order status: `confirmed` → `dispatched` → `delivered` |

#### 1.3.4 Points-Only Payment

| Step | Description |
|------|-----------|
| 1 | Order created with `payment_method: "points_only"`, points deducted at order creation |
| 2 | `payment_status: "paid"` at creation |
| 3 | Order status: `pending` → `confirmed` immediately |

### 1.4 Order Status Lifecycle

| Status | When Reached | Action |
|--------|-------------|--------|
| `pending` | Order created, payment initiation started | Awaiting payment |
| `confirmed` | Payment verified (Paystack/M-Pesa) or COD confirmed | Payment received |
| `processing` | Order packaged, ready for dispatch | Internal fulfillment |
| `dispatched` | Rider/delivery partner en route | GPS tracking active |
| `delivered` | Customer received order | Final status |
| `cancelled` | Order cancelled by customer/admin | Refund processed if paid |

**Status transition API** (`PUT /api/v1/orders/{id}/status`):

- Admin-only endpoint
- Updates `status` field + `payment_status` if payment-related
- Logs admin action to `admin_audit_log`

---

## Services Booking (Repair Booking) Customer Journey

### 2.1 Frontend Flow (React + Vite)

| Step | Component | Action | API Call |
|------|-----------|--------|----------|
| 1 | `BookRepairPage` | User selects `device_type` (phone/ laptop/ tablet), `device_brand`, `device_model`, enters `issue_description` | — |
| 2 | `BookRepairPage` | User selects `fulfillment_type`: `walk_in` / `pickup` / `delivery` | — |
| 3 | `BookRepairPage` | User views `delivery_zones` + `delivery_fee` from backend | `GET /api/v1/delivery-zones` |
| 4 | `BookRepairPage` | User clicks "Book Repair" | `POST /api/v1/bookings` |
| 5 | UI | Shows booking confirmation with `commitment_fee` amount + `final_payment_remaining` | — |

### 2.2 Backend: `POST /api/v1/bookings` (bookings/service.py)

**Request body** (from BookingCreate models):

```json
{
  "full_name": "John Doe",
  "phone_number": "+254712345678",
  "email": "john@example.com",
  "device_type": "phone",
  "device_brand": "Samsung",
  "device_model": "Galaxy S23",
  "issue_description": "Screen cracked, not responding",
  "fulfillment_type": "delivery",     // walk_in | pickup | delivery
  "pickup_address": "optional",       // only if fulfillment != walk_in
  "delivery_address": "Nairobi CBD",
}
```

**Backend processing** (bookings/service.py):

1. Validate device brand/model exists in `device_brands`/`device_models` catalog
2. Look up applicable `repair_services` → get `base_price` (full repair cost)
3. Calculate `commitment_fee` = 20% of `base_price` (ceil to nearest KES 100)
4. Calculate `final_payment_remaining` = `base_price` - `commitment_fee`
5. Set initial status: **`pending`**
6. Generate `commitment_reference` (unique for Paystack tracking)
7. Return booking object:

```json
{
  "id": "booking_uuid",
  "full_name": "John Doe",
  "phone_number": "+254712345678",
  "device_type": "phone",
  "device_brand": "Samsung",
  "device_model": "Galaxy S23",
  "issue_description": "Screen cracked, not responding",
  "fulfillment_type": "delivery",
  "commitment_fee": 500,        // 20% of base_price = 2500 → 500
  "base_price": 2500,
  "final_payment_remaining": 2000,
  "status": "pending",
  "commitment_payment_status": "pending",
  "final_payment_status": "pending",
  "created_at": "2026-01-15T10:30:00Z"
}
```

### 2.3 Commitment Fee Payment Flow (20% of total)

| Step | Endpoint | Description |
|------|----------|-------------|
| 1 | `POST /api/v1/payments/booking/{booking_id}/commitment/initiate` | Backend initializes Paystack STK push for commitment fee, returns `authorization_url` |
| 2 | **Customer** | Redirects to Paystack checkout, completes payment for 20% fee |
| 2.5 | M-Pesa alternative: `POST /api/v1/payments/mpesa/booking/{booking_id}/commitment` → STK push → callback | Same flow via M-Pesa |
| 3 | Paystack webhook → `service.process_webhook(event)` → updates `commitment_payment_status` = `paid` |
| 4 | Booking status updates: `pending` → **`confirmed`** (repair can begin) |

**Endpoint details** (`payments/router.py`):

- `initiate_commitment_payment`: calculates fee, calls `service.initiate_commitment_payment()`, returns `{authorization_url}`
- `verify_commitment_payment`: calls `service.verify_commitment_payment()`, updates DB

### 2.4 Final Payment Flow (80% of total)

| Step | Endpoint | Description |
|------|----------|-------------|
| 1 | `POST /api/v1/payments/booking/{booking_id}/final/request` | Admin triggers final payment link generation (admin-only) |
| 2 | **Customer** | Receives Paystack link via SMS/email, completes payment for remaining 80% |
| 2.5 | M-Pesa alternative: `POST /api/v1/payments/mpesa/booking/{booking_id}/request-final` → STK push → callback | Same flow via M-Pesa |
| 3 | Paystack webhook → `service.process_webhook(event)` → updates `final_payment_status` = `paid` |
| 4 | Booking status updates: `confirmed` → `in_repair` → **`completed`** after final payment |

**Endpoint details** (`payments/router.py`):

- `request_final_payment`: admin-authenticated, calls `service.request_final_payment(booking_id, admin)`, returns `{authorization_url, reference, amount}`
- `verify_final_payment`: calls `service.verify_final_payment(reference)`, updates DB

### 2.5 Booking Status Lifecycle

| Status | When Reached | Trigger |
|--------|-------------|---------|
| `pending` | Booking created, commitment fee awaiting payment | Awaiting 20% commitment |
| `confirmed` | Commitment fee paid (Paystack/M-Pesa) | Repair can begin |
| `in_diagnosis` | Initial device assessment | After commitment, before repair |
| `in_repair` | Repair work in progress | After diagnosis |
| `ready` | Repair completed, awaiting final payment | After diagnosis, before final pay |
| `completed` | Final payment received | Booking fully resolved |
| `cancelled` | Booking cancelled by customer/admin | Refund of commitment fee if applicable |

**Status transition APIs** (`PUT /api/v1/bookings/{id}/status`, `PUT /api/v1/bookings/{id}/cost`):

- `status` update: admin-only (or superadmin), changes booking status
- `cost` update: admin sets `estimated_cost` and `final_cost`, logs to audit

### 2.5.1 Admin-Only Booking Cost Update

| Endpoint | Description |
|----------|-------------|
| `PUT /api/v1/bookings/{id}/cost` | Admin sets `estimated_cost` and `final_cost` |
| Requires: `admin` dict from `get_current_admin` |
| Updates booking with `estimated_cost` + `final_cost` |
| Logs action to `admin_audit_log` |

---

## 3. Payment Methods Summary

| Method | When Used | Flow | Fee |
|--------|-----------|------|-----|
| **Paystack** | Default for orders & bookings | Customer redirected to Paystack checkout → webhook verification | 1.5% of transaction (Paystack fee, built into pricing) |
| **M-Pesa Daraja** | Alternative for orders & bookings | STK push to customer's phone → callback verification | 1% of transaction (Safaricom fee) |
| **Cash on Delivery** | Orders only | No upfront payment; pay on delivery | N/A |
| **Points Only** | Orders only (minimum 1000 pts) | Points deducted at order creation | N/A (points earned from previous deliveries: 10% of subtotal) |

---

## 4. Money Involved Breakdown

### 4.1 Order Payments

| Component | Amount | When Collected |
|-----------|--------|----------------|
| `subtotal` | Sum of (price × quantity) | At order creation |
| `delivery_fee` | Zone-dependent (50–500 KES) | At order creation |
| `total_amount` | subtotal + delivery_fee | At order creation |
| **Paystack/M-Pesa payment** | `total_amount` | After order creation, via checkout |
| **Refund** | Full `total_amount` if cancelled before dispatch | If paid & cancelled |

### 4.2 Services Booking Payments

| Component | Amount | When Collected |
|-----------|--------|----------------|
| `base_price` | Full repair cost (from `repair_services` catalog) | At booking creation |
| `commitment_fee` | **20% of base_price** (ceil to KES 100) | At booking creation; required to confirm booking |
| `final_payment_remaining` | **80% of base_price** (floor to KES 100) | After commitment fee paid, before booking completion |
| **Commitment fee payment** | 20% of base_price | Immediately after booking creation, via Paystack/M-Pesa STK push |
| **Final payment** | 80% of base_price | After diagnosis/repair, via Paystack/M-Pesa STK push |

**Example**: Samsung screen repair:
- `base_price`: 2,500 KES
- `commitment_fee`: 500 KES (20%)
- `final_payment_remaining`: 2,000 KES (80%)
- Customer pays 500 KES commitment → booking `confirmed`
- After repair: customer pays 2,000 KES final → booking `completed`

### 4.3 Payment Status Fields

| Order/Booking | Fields | Meanings |
|---------------|--------|----------|
| `payment_status` (order) | `pending` / `paid` / `failed` / `refunded` | Order payment state |
| `commitment_payment_status` (booking) | `pending` / `paid` / `failed` | 20% commitment fee state |
| `final_payment_status` (booking) | `pending` / `paid` / `failed` | 80% final fee state |

---

## 5. Complete Endpoint Reference

### 5.1 Order Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `GET /api/v1/orders` | GET | User (own) / Admin | List orders |
| `GET /api/v1/orders/{id}` | GET | User (own) / Admin | Single order details |
| `POST /api/v1/orders` | POST | Authenticated user | Create order |
| `PUT /api/v1/orders/{id}/status` | PUT | Admin only | Update order status |
| `GET /api/v1/orders/track/{phone}` | GET | Public | Track by phone |
| `POST /api/v1/payments/order/{order_id}/initiate` | POST | User (own) / Admin | Initialize Paystack payment |
| `POST /api/v1/payments/order/verify/{reference}` | POST | — | Verify Paystack payment |
| `GET /api/v1/payments/order/{order_id}/status` | GET | — | DB payment status |
| `POST /api/v1/payments/mpesa/initiate?order_id={id}` | POST | User (own) | Initiate M-Pesa STK push |

### 5.2 Booking Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `POST /api/v1/bookings` | POST | Authenticated user | Create booking |
| `GET /api/v1/bookings` | GET | Admin | List all bookings |
| `GET /api/v1/bookings/{id}` | GET | Admin / Owner | Single booking details |
| `PUT /api/v1/bookings/{id}/status` | PUT | Admin only | Update booking status |
| `PUT /api/v1/bookings/{id}/cost` | PUT | Admin only | Set estimated/final cost |
| `POST /api/v1/payments/booking/{booking_id}/commitment/initiate` | POST | User (own) / Admin | Initialize commitment fee payment |
| `POST /api/v1/payments/booking/{booking_id}/verify/commitment/{reference}` | POST | — | Verify commitment payment |
| `GET /api/v1/payments/booking/{booking_id}/commitment/status` | GET | — | Commitment payment status |
| `POST /api/v1/payments/booking/{booking_id}/final/request` | POST | Admin only | Request final payment |
| `POST /api/v1/payments/booking/{booking_id}/verify/final/{reference}` | POST | — | Verify final payment |
| `GET /api/v1/payments/booking/{booking_id}/final/status` | GET | — | Final payment status |
| `POST /api/v1/payments/mpesa/booking/{booking_id}/commitment` | POST | User (own) | Initiate M-Pesa commitment fee |
| `POST /api/v1/payments/mpesa/booking/{booking_id}/request-final` | POST | Admin only | Initiate M-Pesa final payment |
| `GET /api/v1/payments/mpesa/booking/{booking_id}/commitment/status` | GET | — | M-Pesa commitment status |
| `GET /api/v1/payments/mpesa/booking/{booking_id}/final/status` | GET | — | M-Pesa final status |

### 5.3 Admin Order/Booking Management

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `PUT /api/v1/orders/{id}/status` | PUT | Admin | Update order status + payment_status |
| `PUT /api/v1/bookings/{id}/status` | PUT | Admin | Update booking status |
| `PUT /api/v1/bookings/{id}/cost` | PUT | Admin | Set estimated/final cost |
| `GET /api/v1/admin/orders/bulk-status` | POST | Admin | Bulk status update |
| `GET /api/v1/admin/export/orders` | GET | Admin | CSV export |
| `GET /api/v1/admin/export/bookings` | GET | CSV export |

---

## 6. Full Status Reference

### 6.1 Order Statuses

| Status | Code | Description | Next Possible |
|--------|------|-------------|---------------|
| `pending` | 0 | Order created, payment pending | `confirmed`, `cancelled` |
| `confirmed` | 1 | Payment verified | `processing`, `cancelled` |
| `processing` | 2 | Being prepared | `dispatched`, `cancelled` |
| `dispatched` | 3 | Out for delivery | `delivered`, `cancelled` |
| `delivered` | 4 | Customer received | — (terminal) |
| `cancelled` | 5 | Cancelled by customer/admin | May trigger refund |

### 6.2 Booking Statuses

| Status | Code | Description | Next Possible |
|--------|------|-------------|---------------|
| `pending` | 0 | Booking created, commitment fee pending | `confirmed`, `cancelled` |
| `confirmed` | 1 | Commitment fee paid | `in_diagnosis`, `cancelled` |
| `in_diagnosis` | 2 | Initial device assessment | `in_repair`, `cancelled` |
| `in_repair` | 3 | Repair work in progress | `ready`, `cancelled` |
| `ready` | 4 | Repair complete, awaiting final pay | `completed`, `cancelled` |
| `completed` | 5 | Final payment received | — (terminal) |
| `cancelled` | 6 | Cancelled by customer/admin | Refund of commitment if applicable |

### 6.3 Payment Statuses

| Status | Code | Description |
|--------|------|-------------|
| `pending` | 0 | Payment initiated, not yet verified |
| `paid` | 1 | Payment verified (webhook/callback confirmed) |
| `failed` | 2 | Payment failed (insufficient funds, timeout, etc.) |
| `refunded` | 3 | Payment refunded (cancellation) |

---

## 7. Money Flow Diagrams

### 7.1 Order Payment Flow

```
Customer → Frontend → POST /api/v1/orders → Order created (status: pending)
     │
     ├─► Paystack: POST /api/v1/payments/order/{id}/initiate → authorization_url
     │       │
     │       ├─► Customer completes payment at Paystack checkout
     │       │
     │       └─► Paystack webhook → POST /api/v1/payments/order/verify/{ref}
     │                   │
     │                   └─► Order: payment_status = paid, status = confirmed
     │
     └─► M-Pesa: POST /api/v1/payments/mpesa/initiate?order_id={id}
               │
               ├─► STK push to customer phone
               │
               ├─► Customer enters PIN
               │
               └─► Safaricom callback → POST /api/v1/payments/mpesa/callback
                         │
                         └─► Order: payment_status = paid, status = confirmed
    
     └─► COD: No payment API → status updated manually after delivery
    
     └─► Points Only: Points deducted at order creation → payment_status = paid
```

### 7.2 Services Booking Payment Flow

```
Customer → Frontend → POST /api/v1/bookings → Booking created
     │
     │   Commitment Fee (20%) Flow
     │   ──────────────────────────────────────────────────────
     │   │
     │   ├─► Paystack: POST /api/v1/payments/booking/{id}/commitment/initiate
     │   │       │
     │   │       ├─► Customer completes payment at Paystack checkout
     │   │       │
     │   │       └─► Paystack webhook → commitment_payment_status = paid
     │   │           │
     │   │           └─► Booking: status = confirmed, repair can begin
     │   │
     │   └─► M-Pesa: POST /api/v1/payments/mpesa/booking/{id}/commitment
               │
               ├─► STK push to customer phone
               │
               ├─► Customer enters PIN
               │
               └─► Safaricom callback → commitment_payment_status = paid
               │
               └─► Booking: status = confirmed
    
     │   Final Payment (80%) Flow
     │   ──────────────────────────────────────────────────────
     │   │
     │   ├─► (After diagnosis/repair) POST /api/v1/payments/booking/{id}/final/request
     │   │       │
     │   │       ├─► Admin triggers, customer receives payment link
     │   │       │
     │   │       ├─► Paystack: customer completes payment
     │   │       │
     │   │       └─► Paystack webhook → final_payment_status = paid
     │   │           │
     │   │           └─► Booking: status = completed
     │   │
     │   └─► M-Pesa: POST /api/v1/payments/mpesa/booking/{id}/request-final
               │
               ├─► STK push to customer phone
               │
               ├─► Customer enters PIN
               │
               └─► Safaricom callback → final_payment_status = paid
               │
               └─► Booking: status = completed
    
     └─► If commitment fee never paid → booking stays `pending` → auto-cancel after X days
```

---

## 8. Key Constants & Configurations

### 8.1 Commitment Fee Calculation

```python
# From bookings/service.py
commitment_fee = math.ceil(base_price * 0.20 / 100) * 100  # ceil to nearest KES 100
final_payment_remaining = base_price - commitment_fee
```

**Examples**:
- `base_price` = 1,000 KES → `commitment_fee` = 200 KES, `final` = 800 KES
- `base_price` = 2,500 KES → `commitment_fee` = 500 KES, `final` = 2,000 KES
- `base_price` = 3,000 KES → `commitment_fee` = 600 KES, `final` = 2,400 KES

### 8.2 Payment Method Routing

```python
# From orders/service.py & bookings/service.py
if payment_method == "paystack":
    → use /api/v1/payments/... (Paystack endpoints)
elif payment_method == "mpesa":
    → use /api/v1/payments/mpesa/... (M-Pesa endpoints)
elif payment_method == "cash_on_delivery":
    → no upfront payment
elif payment_method == "points_only":
    → deduct points at order creation
```

### 8.3 Status Transition Rules

- **Order**: `pending` → `confirmed` only after payment verification. Admin can force any status.
- **Booking**: `pending` → `confirmed` only after commitment fee paid. Admin can force any status.
- **Commitment fee**: Must be paid before booking proceeds to repair. If not paid after 7 days, auto-cancel (business rule).
- **Final fee**: Must be paid before booking marked `completed`. If not paid after 14 days from diagnosis, auto-cancel.

---

## 9. Security & Compliance

| Area | Implementation |
|------|----------------|
| **Paystack webhook** | HMAC-SHA512 signature verification (`verify_webhook_signature` in `paystack.py`) |
| **M-Pesa callback** | IP whitelist check (`_SAFARICOM_IPS` in `mpesa/router.py`) |
| **Order ownership** | `get_optional_user` dependency ensures user owns order before payment init |
| **Booking ownership** | Similar ownership checks in booking service |
| **Admin-only actions** | `require_superadmin` / `get_current_admin` dependencies |
| **Rate limiting** | All payment init endpoints: 5/minute, verify: 10/minute (slowapi) |
| **Data validation** | Pydantic models (`OrderCreate`, `BookingCreate`, etc.) validate all inputs |
| **Audit logging** | Every admin action logged to `admin_audit_log` table |

---

## 10. End-to-End Test Scenarios

### 10.1 Order Booking Test

```bash
# 1. Create order (points_only or paystack)
curl -sS -X POST -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test","phone_number":"+254712345678","delivery_address":"Nairobi","items":[{"product_id":"uuid","quantity":1}],"payment_method":"paystack"}' \
  http://127.0.0.1:8090/api/v1/orders

# 2. Initialize Paystack payment
curl -sS -X POST -H "Authorization: Bearer <jwt>" \
  http://127.0.0.1:8090/api/v1/payments/order/{order_id}/initiate

# 3. Verify payment via webhook simulation
curl -sS -X POST -H "Content-Type: application/json" \
  -d '{"event": "charge.succeeded"}' \
  http://127.0.0.1:8090/api/v1/payments/webhook

# 4. Check order status now = confirmed
curl -sS http://127.0.0.1:8090/api/v1/orders/{id}
```

### 10.2 Services Booking Test

```bash
# 1. Create booking
curl -sS -X POST -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test","phone_number":"+254712345678","device_type":"phone","device_brand":"Samsung","device_model":"Galaxy S23","issue_description":"Screen cracked","fulfillment_type":"delivery"}' \
  http://127.0.0.1:8090/api/v1/bookings

# 2. Initialize commitment fee (Paystack)
curl -sS -X POST -H "Authorization: Bearer <jwt>" \
  http://127.0.0.1:8090/api/v1/payments/booking/{booking_id}/commitment/initiate

# 3. Verify commitment paid (webhook simulation)
curl -sS -X POST -H "Content-Type: application/json" \
  -d '{"event": "charge.succeeded"}' \
  http://127.0.0.1:8090/api/v1/payments/webhook

# 3. Check booking status now = confirmed
curl -sS http://127.0.0.1:8090/api/v1/bookings/{id}

# 4. After diagnosis, request final payment (admin)
curl -sS -X POST -H "Authorization: Bearer <admin_jwt>" \
  http://127.0.0.1:8090/api/v1/payments/booking/{booking_id}/final/request

# 5. Customer completes final payment
# 6. Check booking status = completed
curl -sS http://127.0.0.1:8090/api/v1/bookings/{id}
```

---

## 11. Summary

| Journey | Key Steps | Payment | Statuses |
|---------|-----------|---------|----------|
| **Order Booking** | Create order → Initialize payment → Verify payment → Fulfillment | Paystack / M-Pesa / COD / Points | `pending` → `confirmed` → `processing` → `dispatched` → `delivered` |
| **Services Booking** | Create booking → Pay commitment (20%) → Diagnose/repair → Pay final (80%) → Complete | Paystack / M-Pesa | `pending` → `confirmed` → `in_diagnosis` → `in_repair` → `ready` → `completed` |

**Money flow**: All amounts tracked in DB (`total_amount` on orders, `base_price`/`commitment_fee`/`final_payment_remaining` on bookings). Payment status fields keep synchronization between DB and gateway (Paystack/M-Pesa).

**FlavorFind completely untouched** throughout all flows. No modifications to any FlavorFind services, configs, or infrastructure.

**Migration complete** — Bluetech now running on Docker stack on Lenovo laptop, old cPanel/Imunify360 server bypassed via Cloudflare tunnel.

---