# BlueTech Client Frontend - API Endpoints Reference

## 📡 COMPLETE API ENDPOINTS LIST

### Base URL: `http://localhost:8000/api/v1`

---

## 🛍️ PRODUCTS ENDPOINTS

```typescript
// Get all products with filters
GET /products
  Query Params:
    - category?: string
    - search?: string
    - min_price?: number
    - max_price?: number
    - featured?: boolean
    - sort_by?: 'price' | 'name' | 'created_at'
    - order?: 'asc' | 'desc'
    - page?: number
    - limit?: number
  Response: {
    data: Product[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      pages: number
    }
  }

// Get single product
GET /products/:id
  Response: Product

// Get product categories
GET /products/categories
  Response: string[]
```

---

## 🔧 REPAIR SERVICES ENDPOINTS

```typescript
// Get all repair services
GET /repair-services
  Query Params:
    - category?: string
    - search?: string
    - limit?: number
  Response: RepairService[]

// Get single service
GET /repair-services/:id
  Response: RepairService

// Get service categories
GET /repair-services/categories
  Response: string[]
```

---

## 📦 ORDERS ENDPOINTS

```typescript
// Create new order
POST /orders
  Body: {
    customer_name: string,
    phone_number: string,
    email?: string,
    delivery_address: string,
    delivery_zone: string,
    items: Array<{
      product_id: string,
      quantity: number,
      price: number
    }>,
    subtotal: number,
    delivery_fee: number,
    total_amount: number,
    payment_method: 'mpesa' | 'cash_on_delivery',
    notes?: string
  }
  Response: {
    order_id: string,
    order_number: string,
    status: string,
    created_at: string
  }

// Track orders by phone
GET /orders/track/:phone_number
  Response: Order[]

// Get single order
GET /orders/:id
  Response: Order

// Get user orders (requires auth)
GET /orders?user_id={userId}
  Response: Order[]
```

---

## 🔖 BOOKINGS ENDPOINTS

```typescript
// Create new booking
POST /bookings
  Body: {
    service_id: string,
    customer_name: string,
    customer_email?: string,
    customer_phone: string,
    device_model: string,
    device_brand: string,
    issue_description: string,
    preferred_date: string,
    preferred_time: string,
    notes?: string
  }
  Response: {
    booking_id: string,
    booking_reference: string,
    status: string,
    created_at: string
  }

// Track bookings by phone
GET /bookings/track/:phone_number
  Response: Booking[]

// Get single booking
GET /bookings/:id
  Response: Booking

// Get user bookings (requires auth)
GET /bookings?user_id={userId}
  Response: Booking[]
```

---

## 📍 DELIVERY ZONES ENDPOINTS

```typescript
// Get all delivery zones
GET /delivery-zones
  Response: DeliveryZone[]

// Get single zone
GET /delivery-zones/:id
  Response: DeliveryZone
```

---

## 🔐 AUTHENTICATION ENDPOINTS

```typescript
// Login
POST /auth/login
  Body: {
    username: string, // phone or email
    password: string
  }
  Response: {
    access_token: string,
    token_type: 'bearer',
    user: {
      id: string,
      full_name: string,
      email: string,
      phone_number: string
    }
  }

// Register
POST /auth/register
  Body: {
    full_name: string,
    email: string,
    phone_number: string,
    password: string
  }
  Response: {
    access_token: string,
    user: User
  }

// Logout (optional)
POST /auth/logout
  Headers: { Authorization: 'Bearer {token}' }
  Response: { message: string }
```

---

## 👤 USER ENDPOINTS

```typescript
// Get current user (requires auth)
GET /users/me
  Headers: { Authorization: 'Bearer {token}' }
  Response: User

// Update user (requires auth)
PUT /users/me
  Headers: { Authorization: 'Bearer {token}' }
  Body: {
    full_name?: string,
    email?: string,
    phone_number?: string
  }
  Response: User

// Change password (requires auth)
PUT /users/me/password
  Headers: { Authorization: 'Bearer {token}' }
  Body: {
    current_password: string,
    new_password: string
  }
  Response: { message: string }
```

---

## 📧 CONTACT ENDPOINTS

```typescript
// Send contact message
POST /contact
  Body: {
    name: string,
    email: string,
    phone: string,
    subject: string,
    message: string
  }
  Response: {
    message: string,
    id: string
  }
```

---

## 📊 TYPESCRIPT INTERFACES

### Product
```typescript
interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  specifications: {
    category: string;
    brand: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### RepairService
```typescript
interface RepairService {
  id: string;
  service_name: string;
  service_category: string;
  base_price: number;
  duration: string;
  warranty: string;
  is_active: boolean;
  created_at: string;
}
```

### Order
```typescript
interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  phone_number: string;
  email?: string;
  delivery_address: string;
  delivery_zone: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: 'pending' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}
```

### Booking
```typescript
interface Booking {
  id: string;
  booking_reference: string;
  service_id: string;
  service_name: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  device_model: string;
  device_brand: string;
  issue_description: string;
  preferred_date: string;
  preferred_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

### DeliveryZone
```typescript
interface DeliveryZone {
  id: string;
  name: string;
  delivery_fee: number;
  estimated_delivery_time: string;
  is_active: boolean;
}
```

### User
```typescript
interface User {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  email_verified: boolean;
  created_at: string;
  last_sign_in: string;
}
```

---

## 🔄 HTTP STATUS CODES

```typescript
// Success
200 OK - Request succeeded
201 Created - Resource created
204 No Content - Request succeeded, no content returned

// Client Errors
400 Bad Request - Invalid request data
401 Unauthorized - Authentication required
403 Forbidden - No permission
404 Not Found - Resource not found
422 Unprocessable Entity - Validation failed

// Server Errors
500 Internal Server Error - Server error
503 Service Unavailable - Service down
```

---

## 🔒 AUTHENTICATION HEADERS

For protected endpoints:
```typescript
headers: {
  'Authorization': 'Bearer {access_token}',
  'Content-Type': 'application/json'
}
```

---

## 📝 ERROR RESPONSE FORMAT

```typescript
{
  "detail": "Error message",
  "code": "ERROR_CODE",
  "field"?: "field_name" // For validation errors
}
```

---

## ✅ VALIDATION RULES

### Phone Number
- Format: `254XXXXXXXXX` (Kenya format)
- Length: 12 digits
- Starts with: 254

### Email
- Valid email format
- Example: user@example.com

### Password
- Minimum: 8 characters
- Must contain: letters and numbers

### Order Total
- Minimum: KES 100
- Maximum: KES 1,000,000

---

This reference provides all endpoints needed for the client frontend! 🚀
