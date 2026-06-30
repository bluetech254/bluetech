# Blue Technology Backend Structure & Logic - Comprehensive Report

## Executive Summary

This document defines the complete Python FastAPI backend architecture for Blue Technology. The backend acts as a business logic layer between the frontend and Supabase database, handling all CRUD operations, validations, calculations, and business rules.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SYSTEM FLOW                              │
└─────────────────────────────────────────────────────────────┘

Frontend (React/Next.js)
         ↓
    HTTP/REST API
         ↓
FastAPI Backend (Port 8000)
├── Authentication & Authorization
├── Request Validation
├── Business Logic
├── Calculations
├── Error Handling
         ↓
Supabase Client (Python SDK)
         ↓
PostgreSQL Database (Supabase)
```

---

## Complete File Structure

```
bluetech-backend/
│
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI application entry point
│   ├── config.py                    # Configuration & environment variables
│   ├── database.py                  # Supabase client initialization
│   │
│   ├── models/                      # Pydantic models (request/response schemas)
│   │   ├── __init__.py
│   │   ├── product.py               # Product schemas
│   │   ├── order.py                 # Order & OrderItem schemas
│   │   ├── booking.py               # Booking schemas
│   │   ├── delivery_zone.py         # DeliveryZone schemas
│   │   ├── user.py                  # User schemas
│   │   └── tracking.py              # Tracking response schemas
│   │
│   ├── api/                         # API route handlers
│   │   ├── __init__.py
│   │   ├── products.py              # Product endpoints
│   │   ├── orders.py                # Order endpoints
│   │   ├── bookings.py              # Booking endpoints
│   │   ├── delivery_zones.py        # Delivery zone endpoints
│   │   ├── tracking.py              # Tracking endpoints
│   │   └── admin.py                 # Admin dashboard endpoints
│   │
│   ├── services/                    # Business logic layer
│   │   ├── __init__.py
│   │   ├── product_service.py       # Product business logic
│   │   ├── order_service.py         # Order processing & calculations
│   │   ├── booking_service.py       # Booking management logic
│   │   ├── tracking_service.py      # Unified tracking logic
│   │   └── notification_service.py  # WhatsApp URL generation (future SMS/Email)
│   │
│   ├── utils/                       # Helper utilities
│   │   ├── __init__.py
│   │   ├── validators.py            # Custom validation functions
│   │   ├── formatters.py            # Data formatting (phone, currency, dates)
│   │   ├── exceptions.py            # Custom exception classes
│   │   └── constants.py             # System constants & enums
│   │
│   └── middleware/                  # Middleware components
│       ├── __init__.py
│       ├── cors.py                  # CORS configuration
│       ├── error_handler.py         # Global error handling
│       └── logging.py               # Request/response logging
│
├── tests/                           # Unit & integration tests
│   ├── __init__.py
│   ├── test_products.py
│   ├── test_orders.py
│   ├── test_bookings.py
│   └── test_tracking.py
│
├── requirements.txt                 # Python dependencies
├── .env                            # Environment variables
├── .env.example                    # Environment template
├── .gitignore
├── README.md
└── run.py                          # Application runner script
```

---

## Detailed Component Specifications

### 1. Configuration (`app/config.py`)

**Purpose:** Central configuration management

**Contents:**
```python
- SUPABASE_URL: Database connection URL
- SUPABASE_ANON_KEY: Public API key
- SUPABASE_SERVICE_KEY: Admin service role key
- API_HOST: Server host (0.0.0.0)
- API_PORT: Server port (8000)
- DEBUG_MODE: Development flag
- CORS_ORIGINS: Allowed frontend origins
- ADMIN_PASSWORD: Simple admin authentication (MVP)
- PHONE_PREFIX: Kenya phone prefix (+254)
- CURRENCY: Default currency (KES)
```

---

### 2. Database Client (`app/database.py`)

**Purpose:** Initialize and manage Supabase connection

**Logic:**
- Create Supabase client with connection pooling
- Provide client instance to all services
- Handle connection errors gracefully
- Support both anon and service role clients

**Key Functions:**
```python
get_supabase_client() -> Client
get_admin_client() -> Client  # Uses service_role key
```

---

### 3. Pydantic Models (`app/models/`)

#### `product.py`
```python
ProductBase:
  - title: str
  - description: str
  - price: Decimal
  - specifications: dict
  - image_url: Optional[str]
  - stock_quantity: int

ProductCreate(ProductBase): pass
ProductUpdate(ProductBase): pass
ProductResponse(ProductBase):
  - id: UUID
  - is_active: bool
  - created_at: datetime
  - updated_at: datetime
```

#### `order.py`
```python
OrderItemCreate:
  - product_id: UUID
  - quantity: int (min=1)

OrderCreate:
  - full_name: str (min_length=2)
  - phone_number: str (regex for Kenya format)
  - email: Optional[EmailStr]
  - delivery_address: str (min_length=10)
  - delivery_zone: str
  - items: List[OrderItemCreate] (min_items=1)
  - notes: Optional[str]

OrderResponse:
  - id: UUID
  - full_name: str
  - phone_number: str
  - delivery_zone: str
  - delivery_fee: Decimal
  - subtotal: Decimal
  - total_amount: Decimal
  - status: OrderStatus (enum)
  - payment_status: PaymentStatus (enum)
  - created_at: datetime
  - items: List[OrderItemResponse]

StatusUpdateRequest:
  - status: str
```

#### `booking.py`
```python
BookingCreate:
  - full_name: str
  - phone_number: str (Kenya format validation)
  - device_type: str (enum: Laptop, Smartphone, Tablet, etc.)
  - device_model: Optional[str]
  - issue_description: str (min_length=10)
  - fulfillment_type: FulfillmentType (enum: dropoff, pickup)
  - pickup_address: Optional[str] (required if pickup)

BookingResponse:
  - id: UUID
  - full_name: str
  - phone_number: str
  - device_type: str
  - device_model: str
  - issue_description: str
  - fulfillment_type: str
  - pickup_address: str
  - status: BookingStatus (enum)
  - estimated_cost: Optional[Decimal]
  - final_cost: Optional[Decimal]
  - created_at: datetime

CostUpdateRequest:
  - estimated_cost: Optional[Decimal]
  - final_cost: Optional[Decimal]
```

#### `tracking.py`
```python
TrackingResponse:
  - phone_number: str
  - orders: List[OrderResponse]
  - bookings: List[BookingResponse]
  - total_orders: int
  - total_bookings: int
```

---

### 4. API Routes (`app/api/`)

#### `products.py` - Product Management

**Endpoints:**

```
GET    /api/v1/products
Query params: search (str), category (str), active_only (bool), limit (int), offset (int)
Response: { data: ProductResponse[], count: int, total: int }
Logic:
  - Query products table with filters
  - Apply search on title and description (case-insensitive)
  - Filter by category if provided
  - Filter active products only (default)
  - Paginate results
  - Return product list with metadata

GET    /api/v1/products/{product_id}
Response: ProductResponse
Logic:
  - Fetch single product by UUID
  - Return 404 if not found
  - Return product details

POST   /api/v1/products
Auth: Admin password required
Body: ProductCreate
Response: ProductResponse
Logic:
  - Validate product data
  - Check if title already exists
  - Insert into products table
  - Return created product

PUT    /api/v1/products/{product_id}
Auth: Admin
Body: ProductUpdate
Response: ProductResponse
Logic:
  - Validate product exists
  - Update product fields
  - Update updated_at timestamp
  - Return updated product

DELETE /api/v1/products/{product_id}
Auth: Admin
Response: { message: str }
Logic:
  - Soft delete (set is_active = false)
  - Don't actually delete record
  - Return success message

GET    /api/v1/products/categories
Response: { categories: List[str] }
Logic:
  - Extract unique categories from specifications
  - Return distinct category list
```

#### `orders.py` - Order Management

**Endpoints:**

```
POST   /api/v1/orders
Body: OrderCreate
Response: OrderResponse
Logic:
  1. Validate phone number format (Kenya +254)
  2. Validate all product IDs exist
  3. Check product availability (stock > 0)
  4. Calculate prices:
     - Fetch product prices from database
     - Calculate line totals (price × quantity)
     - Calculate subtotal (sum of line totals)
  5. Fetch delivery fee from delivery_zones table
  6. Calculate total_amount (subtotal + delivery_fee)
  7. Create or get user by phone number
  8. Insert order record with status='pending', payment_status='unpaid'
  9. Insert order_items records
  10. Decrement product stock quantities
  11. Return complete order with items

GET    /api/v1/orders
Query: status (str), limit (int), offset (int)
Auth: Admin
Response: { data: List[OrderResponse], count: int }
Logic:
  - Fetch orders with joined order_items
  - Filter by status if provided
  - Order by created_at DESC
  - Paginate results
  - Return orders list

GET    /api/v1/orders/{order_id}
Response: OrderResponse with items
Logic:
  - Fetch order by ID
  - Join with order_items
  - Join items with product details
  - Return complete order data

PUT    /api/v1/orders/{order_id}/status
Auth: Admin
Body: StatusUpdateRequest
Response: OrderResponse
Logic:
  - Validate order exists
  - Validate status value (must be valid enum)
  - Update order status
  - If status='delivered', update payment_status='paid' (for COD)
  - Return updated order

PUT    /api/v1/orders/{order_id}/payment
Auth: Admin
Body: { payment_status: str }
Response: OrderResponse
Logic:
  - Update payment_status
  - Return updated order

GET    /api/v1/orders/track/{phone_number}
Response: List[OrderResponse]
Logic:
  - Validate phone number format
  - Fetch all orders for phone number
  - Order by created_at DESC
  - Return orders with status tracking
```

#### `bookings.py` - Repair Booking Management

**Endpoints:**

```
POST   /api/v1/bookings
Body: BookingCreate
Response: BookingResponse
Logic:
  1. Validate phone number (Kenya format)
  2. Validate device_type (from allowed enum)
  3. If fulfillment_type='pickup', require pickup_address
  4. Create or get user by phone number
  5. Insert booking with status='pending'
  6. Return booking with ID
  7. (Future: trigger SMS/WhatsApp notification)

GET    /api/v1/bookings
Query: status (str), device_type (str), limit (int), offset (int)
Auth: Admin
Response: { data: List[BookingResponse], count: int }
Logic:
  - Fetch bookings with filters
  - Order by created_at DESC
  - Paginate
  - Return bookings list

GET    /api/v1/bookings/{booking_id}
Response: BookingResponse
Logic:
  - Fetch booking by ID
  - Return 404 if not found
  - Return booking details

PUT    /api/v1/bookings/{booking_id}/status
Auth: Admin
Body: StatusUpdateRequest
Response: BookingResponse
Logic:
  - Validate booking exists
  - Validate status value
  - Update status
  - Update updated_at
  - Return updated booking

PUT    /api/v1/bookings/{booking_id}/cost
Auth: Admin
Body: CostUpdateRequest
Response: BookingResponse
Logic:
  - Update estimated_cost and/or final_cost
  - Return updated booking
  - (Future: notify customer of cost estimate)

GET    /api/v1/bookings/track/{phone_number}
Response: List[BookingResponse]
Logic:
  - Fetch all bookings for phone
  - Order by created_at DESC
  - Return bookings with status
```

#### `delivery_zones.py` - Delivery Zone Management

**Endpoints:**

```
GET    /api/v1/delivery-zones
Query: active_only (bool)
Response: { data: List[DeliveryZoneResponse] }
Logic:
  - Fetch zones
  - Filter active only (default)
  - Order by zone_name
  - Return zones with fees

POST   /api/v1/delivery-zones
Auth: Admin
Body: DeliveryZoneCreate
Response: DeliveryZoneResponse
Logic:
  - Validate zone_name unique
  - Validate delivery_fee > 0
  - Insert zone
  - Return created zone

PUT    /api/v1/delivery-zones/{zone_id}
Auth: Admin
Body: DeliveryZoneUpdate
Response: DeliveryZoneResponse
Logic:
  - Update zone details
  - Return updated zone
```

#### `tracking.py` - Unified Tracking

**Endpoints:**

```
GET    /api/v1/track/{phone_number}
Response: TrackingResponse
Logic:
  1. Validate phone number format
  2. Parallel fetch:
     - All orders for phone number
     - All bookings for phone number
  3. Aggregate data:
     - Total orders count
     - Total bookings count
     - Combined status summary
  4. Return unified tracking view
```

#### `admin.py` - Admin Dashboard

**Endpoints:**

```
POST   /api/v1/admin/login
Body: { password: str }
Response: { token: str, expires_at: datetime }
Logic:
  - Validate password against ADMIN_PASSWORD
  - Generate simple JWT token
  - Return token (MVP: just password check)

GET    /api/v1/admin/dashboard
Auth: Admin
Response: DashboardStats
Logic:
  - Count orders by status
  - Count bookings by status
  - Calculate today's revenue (sum of delivered orders)
  - Count pending actions
  - Return statistics

GET    /api/v1/admin/orders/pending
Auth: Admin
Response: List[OrderResponse]
Logic:
  - Fetch orders with status='pending' or 'confirmed'
  - Order by created_at ASC (oldest first)
  - Return orders needing action

GET    /api/v1/admin/bookings/pending
Auth: Admin
Response: List[BookingResponse]
Logic:
  - Fetch bookings with status='pending'
  - Order by created_at ASC
  - Return bookings needing action
```

---

### 5. Services Layer (`app/services/`)

#### `product_service.py`

**Functions:**

```python
get_products(filters: dict) -> List[Product]:
  - Build query with filters
  - Execute Supabase query
  - Handle errors
  - Return products

get_product_by_id(product_id: UUID) -> Product:
  - Fetch single product
  - Raise 404 if not found
  - Return product

create_product(data: ProductCreate) -> Product:
  - Validate data
  - Check duplicates
  - Insert to database
  - Return created product

update_product(product_id: UUID, data: ProductUpdate) -> Product:
  - Validate product exists
  - Update fields
  - Return updated product

deactivate_product(product_id: UUID) -> bool:
  - Soft delete product
  - Return success

get_categories() -> List[str]:
  - Extract unique categories
  - Return list
```

#### `order_service.py`

**Key Business Logic Functions:**

```python
calculate_order_totals(items: List[OrderItemCreate]) -> OrderCalculation:
  Input: List of order items with product_id and quantity
  Logic:
    1. Fetch product prices from database
    2. Calculate each line: price × quantity
    3. Calculate subtotal: sum(line totals)
    4. Return calculation object
  Output: { subtotal, line_items }

get_delivery_fee(zone_name: str) -> Decimal:
  Input: Delivery zone name
  Logic:
    1. Query delivery_zones table
    2. Get delivery_fee for zone
    3. Raise error if zone not found
  Output: Decimal fee

validate_stock_availability(items: List[OrderItemCreate]) -> bool:
  Input: Order items
  Logic:
    1. For each item, fetch product
    2. Check if stock_quantity >= requested quantity
    3. Raise error if insufficient stock
  Output: True or raise exception

create_order(order_data: OrderCreate) -> Order:
  Input: Order creation data
  Logic:
    1. Validate phone number
    2. Validate products exist
    3. Check stock availability
    4. Calculate totals
    5. Get delivery fee
    6. Create/get user
    7. Insert order
    8. Insert order_items
    9. Decrement stock
    10. Return complete order
  Output: OrderResponse

update_stock_quantity(product_id: UUID, quantity_change: int):
  Input: Product ID and quantity to decrement
  Logic:
    1. Fetch current stock
    2. Calculate new stock
    3. Update product stock_quantity
    4. Handle negative stock error

get_order_with_items(order_id: UUID) -> Order:
  Input: Order ID
  Logic:
    1. Fetch order record
    2. Fetch order_items
    3. Enrich with product details
    4. Return complete order
  Output: OrderResponse with items

update_order_status(order_id: UUID, status: str) -> Order:
  Input: Order ID and new status
  Logic:
    1. Validate order exists
    2. Validate status transition
    3. Update order
    4. Return updated order
  Output: OrderResponse
```

#### `booking_service.py`

**Functions:**

```python
create_booking(data: BookingCreate) -> Booking:
  Logic:
    1. Validate phone
    2. Validate fulfillment_type
    3. If pickup, require address
    4. Create/get user
    5. Insert booking
    6. Return booking

update_booking_status(booking_id: UUID, status: str) -> Booking:
  Logic:
    1. Validate booking exists
    2. Update status
    3. Return updated booking

update_booking_cost(booking_id: UUID, costs: dict) -> Booking:
  Logic:
    1. Update estimated_cost and final_cost
    2. Return updated booking

get_booking_by_id(booking_id: UUID) -> Booking:
  - Fetch and return booking
```

#### `tracking_service.py`

**Functions:**

```python
track_by_phone(phone_number: str) -> TrackingResponse:
  Logic:
    1. Validate phone format
    2. Fetch orders
    3. Fetch bookings
    4. Aggregate data
    5. Return tracking view

get_status_timeline(booking: Booking) -> List[StatusStep]:
  Logic:
    - Map booking status to visual timeline
    - Return steps with completion status
```

#### `notification_service.py`

**Functions:**

```python
generate_whatsapp_url(phone: str, message: str) -> str:
  Logic:
    - Format phone number
    - URL encode message
    - Return WhatsApp API URL

format_order_message(order: Order) -> str:
  - Create message template for order

format_booking_message(booking: Booking) -> str:
  - Create message template for booking
```

---

### 6. Utilities (`app/utils/`)

#### `validators.py`

```python
validate_kenya_phone(phone: str) -> str:
  - Check format: starts with 254 or +254
  - Validate length
  - Return normalized format

validate_email(email: str) -> bool:
  - Email format validation

validate_uuid(uuid_str: str) -> UUID:
  - Parse and validate UUID
```

#### `formatters.py`

```python
format_currency(amount: Decimal) -> str:
  - Format as "KES X,XXX.XX"

format_phone_display(phone: str) -> str:
  - Format as "0712 345 678"

format_datetime_kenya(dt: datetime) -> str:
  - Format with Kenya timezone (EAT)
```

#### `exceptions.py`

```python
class BlueTechException(Exception): pass
class ProductNotFoundException(BlueTechException): pass
class InsufficientStockException(BlueTechException): pass
class InvalidPhoneNumberException(BlueTechException): pass
class OrderNotFoundException(BlueTechException): pass
class BookingNotFoundException(BlueTechException): pass
```

#### `constants.py`

```python
DEVICE_TYPES = ["Laptop", "Smartphone", "Tablet", "Gaming Console", "Audio System", "Other"]
ORDER_STATUSES = ["pending", "confirmed", "processing", "dispatched", "delivered", "cancelled"]
BOOKING_STATUSES = ["pending", "confirmed", "picked_up", "in_diagnosis", "in_repair", "ready", "completed", "cancelled"]
PAYMENT_STATUSES = ["unpaid", "paid"]
FULFILLMENT_TYPES = ["dropoff", "pickup"]
```

---

### 7. Middleware (`app/middleware/`)

#### `error_handler.py`

```python
@app.exception_handler(BlueTechException)
- Catch custom exceptions
- Return formatted error responses

@app.exception_handler(ValidationError)
- Catch Pydantic validation errors
- Return 422 with details

@app.exception_handler(Exception)
- Catch all other errors
- Log error
- Return 500 generic error
```

#### `logging.py`

```python
@app.middleware("http")
- Log all incoming requests
- Log response status
- Log execution time
```

---

## API Response Format Standards

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product with ID xxx not found",
    "details": {}
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 50,
    "count": 20,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

## Authentication & Authorization

**MVP Approach:**
- Simple password-based admin auth
- Password stored in environment variable
- Public endpoints: GET products, POST orders, POST bookings, GET tracking
- Admin endpoints: All other operations

**Future Enhancement:**
- JWT token-based auth
- Role-based access control
- User sessions

---

## Error Handling Strategy

**Categories:**
1. **Validation Errors (400)** - Invalid input data
2. **Authentication Errors (401)** - Missing/invalid credentials
3. **Authorization Errors (403)** - Insufficient permissions
4. **Not Found Errors (404)** - Resource doesn't exist
5. **Business Logic Errors (422)** - Valid input but business rule violation
6. **Server Errors (500)** - Unexpected errors

**All errors logged with:**
- Timestamp
- Request ID
- User context
- Error details

---

## Performance Considerations

1. **Database Queries:**
   - Use indexes on phone_number fields
   - Limit result sets with pagination
   - Use select specific fields when possible

2. **Caching (Future):**
   - Cache product catalog
   - Cache delivery zones
   - Cache category lists

3. **Connection Pooling:**
   - Reuse Supabase client
   - Handle connection errors

---

## Testing Strategy

**Unit Tests:**
- Test each service function independently
- Mock Supabase responses
- Test calculations and validations

**Integration Tests:**
- Test complete API workflows
- Test against real Supabase test database
- Test error scenarios

**Test Coverage Target:** 80%

---

## Deployment Checklist

- [ ] Set production environment variables
- [ ] Configure CORS for production frontend URL
- [ ] Set up proper logging
- [ ] Configure rate limiting
- [ ] Set up monitoring (Sentry)
- [ ] Configure backup strategy
- [ ] Test all endpoints in production

---

## Dependencies (`requirements.txt`)

```
fastapi==0.115.0
uvicorn[standard]==0.32.0
python-dotenv==1.0.1
pydantic==2.9.0
supabase==2.9.0
python-multipart==0.0.12
pytest==8.3.0
pytest-asyncio==0.24.0
```

---

## Summary

This backend architecture provides:
✅ Clear separation of concerns (routes → services → database)
✅ Comprehensive business logic handling
✅ Robust error handling
✅ Input validation
✅ Swagger documentation
✅ Scalable structure
✅ Easy testing
✅ Production-ready patterns

**Next Step:** Build each component step by step, starting with core models and database connection.
