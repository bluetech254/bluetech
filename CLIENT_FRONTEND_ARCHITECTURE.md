# BlueTech Client Frontend - Complete System Architecture

## 🎯 SYSTEM OVERVIEW

**Technology Stack:**
- Framework: React 18 + TypeScript + Vite
- Styling: Tailwind CSS v4
- State Management: React Context + Hooks
- Routing: React Router v6
- HTTP Client: Axios
- Form Handling: React Hook Form
- Validation: Zod
- Icons: Lucide React
- Notifications: React Hot Toast

**Backend API:** http://localhost:8000/api/v1

---

## 📱 PAGE STRUCTURE & FEATURES

### 1. HOME PAGE (`/`)
**Route:** `/`
**Purpose:** Landing page, product showcase, hero section

#### Features:
- ✅ Hero banner with CTA buttons
- ✅ Featured products carousel
- ✅ Service categories grid
- ✅ Why choose us section
- ✅ Customer testimonials
- ✅ Newsletter signup
- ✅ Sticky header with cart badge
- ✅ Search bar (redirects to /products)

#### API Endpoints:
```typescript
GET /products?featured=true&limit=8
GET /repair-services?limit=6
GET /delivery-zones (for zone dropdown)
```

#### Components:
- `Hero`
- `FeaturedProducts`
- `ServiceCategories`
- `Testimonials`
- `Newsletter`
- `Footer`

---

### 2. PRODUCTS PAGE (`/products`)
**Route:** `/products`
**Purpose:** Browse all products with filtering

#### Features:
- ✅ Product grid (responsive)
- ✅ Category filter sidebar
- ✅ Search functionality
- ✅ Price range filter
- ✅ Sort options (price, name, popular)
- ✅ Pagination
- ✅ Quick add to cart
- ✅ Product cards with hover effects
- ✅ Stock status indicators
- ✅ "Out of Stock" badges

#### API Endpoints:
```typescript
GET /products
  ?category=Laptops
  &search=macbook
  &min_price=1000
  &max_price=5000
  &sort_by=price
  &order=asc
  &page=1
  &limit=12

GET /products/categories
```

#### State Management:
```typescript
interface ProductsState {
  products: Product[];
  categories: string[];
  filters: {
    category: string;
    search: string;
    priceRange: [number, number];
    sortBy: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

### 3. PRODUCT DETAIL PAGE (`/products/:id`)
**Route:** `/products/:id`
**Purpose:** Single product view with full details

#### Features:
- ✅ Product image gallery
- ✅ Product title & description
- ✅ Price display
- ✅ Stock status
- ✅ Quantity selector
- ✅ Add to cart button
- ✅ Product specifications
- ✅ Related products
- ✅ Reviews section
- ✅ Share buttons
- ✅ Breadcrumbs navigation

#### API Endpoints:
```typescript
GET /products/:id
GET /products?category={same_category}&limit=4 (related products)
```

#### User Actions:
- Add to cart
- Adjust quantity
- View specifications
- Share product
- Navigate to related products

---

### 4. REPAIR SERVICES PAGE (`/services`)
**Route:** `/services`
**Purpose:** Browse repair services catalog

#### Features:
- ✅ Service cards grid
- ✅ Category filter (Phone, Laptop, Tablet, etc.)
- ✅ Search services
- ✅ Service details (price, duration, warranty)
- ✅ "Book Now" buttons
- ✅ Service comparison
- ✅ FAQ section
- ✅ Process steps

#### API Endpoints:
```typescript
GET /repair-services
  ?category=Phone Repair
  &search=screen

GET /repair-services/categories
```

#### Service Card Shows:
- Service name
- Category badge
- Base price
- Estimated duration
- Warranty period
- Quick book button

---

### 5. BOOK REPAIR PAGE (`/book-repair/:serviceId`)
**Route:** `/book-repair/:serviceId`
**Purpose:** Book a repair service

#### Features:
- ✅ Service summary
- ✅ Customer information form
- ✅ Device details form
- ✅ Issue description textarea
- ✅ Preferred date/time picker
- ✅ Contact information
- ✅ Terms & conditions checkbox
- ✅ Booking confirmation

#### Form Fields:
```typescript
interface BookingForm {
  // Customer Info
  fullName: string;
  email: string;
  phoneNumber: string;
  
  // Device Info
  deviceModel: string;
  deviceBrand: string;
  issueDescription: string;
  
  // Appointment
  preferredDate: Date;
  preferredTime: string;
  
  // Agreement
  agreedToTerms: boolean;
}
```

#### API Endpoints:
```typescript
GET /repair-services/:id
POST /bookings
  Body: {
    service_id: string,
    customer_name: string,
    customer_email: string,
    customer_phone: string,
    device_model: string,
    device_brand: string,
    issue_description: string,
    preferred_date: string,
    preferred_time: string,
    notes?: string
  }
```

#### Validation:
- Required fields check
- Phone number format (254XXXXXXXXX)
- Email format
- Date must be future
- Issue description min 10 chars

---

### 6. CART PAGE (`/cart`)
**Route:** `/cart`
**Purpose:** Review cart items before checkout

#### Features:
- ✅ Cart items list
- ✅ Quantity adjusters (+/-)
- ✅ Remove item button
- ✅ Item subtotals
- ✅ Cart totals (subtotal, delivery, total)
- ✅ Delivery zone selector
- ✅ Continue shopping button
- ✅ Proceed to checkout button
- ✅ Empty cart state
- ✅ Cart persistence (localStorage)

#### Cart Item Structure:
```typescript
interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  subtotal: number;
}

interface Cart {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryZone: DeliveryZone | null;
}
```

#### Calculations:
- Subtotal = Sum of (price × quantity)
- Delivery fee = Based on selected zone
- Total = Subtotal + Delivery fee

#### API Endpoints:
```typescript
GET /delivery-zones (for zone dropdown)
```

---

### 7. CHECKOUT PAGE (`/checkout`)
**Route:** `/checkout`
**Purpose:** Complete order with customer details

#### Features:
- ✅ Order summary (readonly cart)
- ✅ Customer information form
- ✅ Delivery address form
- ✅ Delivery zone selector
- ✅ Phone number input
- ✅ Additional notes textarea
- ✅ Payment method selector
- ✅ Order totals display
- ✅ Place order button
- ✅ Terms acceptance checkbox

#### Form Structure:
```typescript
interface CheckoutForm {
  // Customer Info
  fullName: string;
  phoneNumber: string;
  email?: string;
  
  // Delivery Info
  deliveryAddress: string;
  deliveryZone: string;
  deliveryInstructions?: string;
  
  // Payment
  paymentMethod: 'mpesa' | 'cash_on_delivery';
  
  // Notes
  orderNotes?: string;
  
  // Agreement
  agreedToTerms: boolean;
}
```

#### API Endpoints:
```typescript
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
    payment_method: string,
    notes?: string
  }
```

#### Validation Rules:
- Full name: Required, min 3 chars
- Phone: Required, format 254XXXXXXXXX
- Address: Required, min 10 chars
- Zone: Required
- Payment method: Required
- Terms: Must be checked

---

### 8. ORDER SUCCESS PAGE (`/order-success/:orderId`)
**Route:** `/order-success/:orderId`
**Purpose:** Confirmation after successful order

#### Features:
- ✅ Success animation/icon
- ✅ Order number display
- ✅ Order summary
- ✅ Customer details
- ✅ Delivery information
- ✅ Estimated delivery time
- ✅ Track order button
- ✅ Continue shopping button
- ✅ Print receipt button
- ✅ Share order details

#### Display Information:
```typescript
interface OrderSuccess {
  orderId: string;
  orderNumber: string;
  customerName: string;
  phoneNumber: string;
  deliveryAddress: string;
  deliveryZone: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  estimatedDelivery: string;
  status: string;
  createdAt: string;
}
```

#### Actions:
- Navigate to track order
- Return to home
- Print receipt
- Share via SMS/Email

---

### 9. BOOKING SUCCESS PAGE (`/booking-success/:bookingId`)
**Route:** `/booking-success/:bookingId`
**Purpose:** Confirmation after successful booking

#### Features:
- ✅ Success animation
- ✅ Booking reference number
- ✅ Service details
- ✅ Customer details
- ✅ Appointment date/time
- ✅ Preparation instructions
- ✅ Contact information
- ✅ Track booking button
- ✅ Add to calendar button
- ✅ Print details button

#### Display Information:
```typescript
interface BookingSuccess {
  bookingId: string;
  bookingReference: string;
  serviceName: string;
  customerName: string;
  phoneNumber: string;
  deviceModel: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  estimatedDuration: string;
  warranty: string;
  price: number;
}
```

---

### 10. TRACK ORDER PAGE (`/track-order`)
**Route:** `/track-order`
**Purpose:** Track order/booking status by phone number

#### Features:
- ✅ Phone number input form
- ✅ Search button
- ✅ Order/booking selection tabs
- ✅ Results list
- ✅ Status timeline
- ✅ Order details modal
- ✅ Contact support button
- ✅ Cancel order option (if pending)

#### Form:
```typescript
interface TrackingForm {
  phoneNumber: string;
  type: 'order' | 'booking';
}
```

#### API Endpoints:
```typescript
GET /orders/track/{phone_number}
  Response: Order[]

GET /bookings/track/{phone_number}
  Response: Booking[]
```

#### Status Timeline (Orders):
1. 🔵 Pending - Order received
2. 🟡 Processing - Being prepared
3. 🟠 Out for Delivery - On the way
4. 🟢 Delivered - Completed
5. 🔴 Cancelled - Cancelled

#### Status Timeline (Bookings):
1. 🔵 Pending - Awaiting confirmation
2. 🟡 Confirmed - Appointment scheduled
3. 🟠 In Progress - Being serviced
4. 🟢 Completed - Ready for pickup
5. 🔴 Cancelled - Cancelled

---

### 11. AUTHENTICATION PAGES

#### 11a. LOGIN PAGE (`/login`)
**Route:** `/login`
**Purpose:** User authentication

#### Features:
- ✅ Phone number / Email input
- ✅ Password input
- ✅ Remember me checkbox
- ✅ Forgot password link
- ✅ Social login buttons (optional)
- ✅ Sign up link
- ✅ Show/hide password toggle

#### API Endpoints:
```typescript
POST /auth/login
  Body: {
    username: string, // phone or email
    password: string
  }
  Response: {
    access_token: string,
    user: User
  }
```

#### 11b. REGISTER PAGE (`/register`)
**Route:** `/register`
**Purpose:** New user registration

#### Features:
- ✅ Full name input
- ✅ Email input
- ✅ Phone number input
- ✅ Password input
- ✅ Confirm password input
- ✅ Terms acceptance checkbox
- ✅ Sign up button
- ✅ Already have account link

#### API Endpoints:
```typescript
POST /auth/register
  Body: {
    full_name: string,
    email: string,
    phone_number: string,
    password: string
  }
```

---

### 12. USER PROFILE PAGE (`/profile`)
**Route:** `/profile`
**Purpose:** Manage user account (requires auth)

#### Features:
- ✅ User information display
- ✅ Edit profile form
- ✅ Order history
- ✅ Booking history
- ✅ Saved addresses
- ✅ Change password
- ✅ Logout button

#### API Endpoints:
```typescript
GET /users/me
PUT /users/me
  Body: {
    full_name?: string,
    email?: string,
    phone_number?: string
  }

GET /orders?user_id={id}
GET /bookings?user_id={id}
```

---

### 13. ABOUT PAGE (`/about`)
**Route:** `/about`
**Purpose:** Company information

#### Features:
- ✅ Company story
- ✅ Mission & vision
- ✅ Team members
- ✅ Location/contact info
- ✅ Why choose us

---

### 14. CONTACT PAGE (`/contact`)
**Route:** `/contact`
**Purpose:** Contact form

#### Features:
- ✅ Contact form
- ✅ Phone numbers
- ✅ Email addresses
- ✅ Physical address
- ✅ Google Maps embed
- ✅ Social media links
- ✅ Business hours

#### API Endpoints:
```typescript
POST /contact
  Body: {
    name: string,
    email: string,
    phone: string,
    subject: string,
    message: string
  }
```

---

## 🔄 CUSTOMER FLOW DIAGRAMS

### Flow 1: Product Purchase
```
Home → Products → Product Detail → Add to Cart → Cart
→ Checkout → Order Success → Track Order
```

### Flow 2: Repair Booking
```
Home → Services → Service Detail → Book Repair
→ Booking Success → Track Booking
```

### Flow 3: Registered User Purchase
```
Login → Products → Add to Cart → Checkout (auto-filled)
→ Order Success → Profile (view history)
```

### Flow 4: Guest Checkout
```
Cart → Checkout (manual entry) → Order Success
→ Track with phone number
```

---

## 🎨 GLOBAL COMPONENTS

### Header Component
- Logo (links to home)
- Navigation menu (Home, Products, Services, About, Contact)
- Search bar
- Cart icon with badge count
- Login/Profile button

### Footer Component
- Company info
- Quick links
- Contact details
- Social media icons
- Newsletter signup
- Copyright

### Cart Drawer Component
- Slides from right
- Mini cart items
- Subtotal
- View cart button
- Checkout button

---

## 📦 STATE MANAGEMENT

### Global Context Providers:

```typescript
// CartContext
interface CartContextType {
  cart: Cart;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setDeliveryZone: (zone: DeliveryZone) => void;
}

// AuthContext
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

// NotificationContext
interface NotificationContextType {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}
```

---

## 🔐 AUTHENTICATION FLOW

1. **Guest User:**
   - Can browse products/services
   - Can add to cart
   - Can checkout (enters details manually)
   - Can track orders via phone number

2. **Registered User:**
   - All guest features
   - Profile page access
   - Order history
   - Saved addresses
   - Faster checkout (auto-fill)

---

## 📱 RESPONSIVE DESIGN

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Features:**
- Hamburger menu
- Bottom navigation bar
- Swipeable product carousel
- Touch-friendly buttons
- Mobile-optimized forms

---

## 🚀 PERFORMANCE OPTIMIZATIONS

- ✅ Lazy loading routes
- ✅ Image optimization
- ✅ Code splitting
- ✅ Debounced search
- ✅ Memoized components
- ✅ Virtual scrolling for lists
- ✅ Service worker (PWA)
- ✅ Cache API responses

---

## 📊 ANALYTICS & TRACKING

- Page views
- Product views
- Add to cart events
- Checkout started
- Orders completed
- Bookings completed
- Search queries
- User journeys

---

This is the complete client frontend architecture. Ready to implement? 🚀
