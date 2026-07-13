# BlueTech System Architecture Overview
**Complete System Understanding - July 13, 2026**

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BlueTech Platform                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │   Client App     │  │   Admin Panel    │  │  Backend   │ │
│  │  (React/Vite)    │  │  (React/Vite)    │  │  (FastAPI) │ │
│  │   Port: 3001     │  │   Port: 5173     │  │ Port: 8000 │ │
│  └────────┬─────────┘  └────────┬─────────┘  └─────┬──────┘ │
│           │                     │                   │         │
│           └─────────────────────┼───────────────────┘         │
│                                 │                             │
│                    ┌────────────▼────────────┐               │
│                    │   Supabase Database     │               │
│                    │   (PostgreSQL + Auth)   │               │
│                    └─────────────────────────┘               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
bluetech/
├── client/                          # Main React App (Port 3001)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/             # Header, Footer, Navigation
│   │   │   ├── home/               # Homepage components
│   │   │   ├── products/           # Product browsing
│   │   │   ├── services/           # Service browsing
│   │   │   ├── cart/               # Shopping cart
│   │   │   └── common/             # Reusable components
│   │   ├── pages/                  # Page components
│   │   ├── api/                    # API calls
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── contexts/               # React contexts
│   │   ├── types/                  # TypeScript types
│   │   ├── utils/                  # Utility functions
│   │   ├── index.css               # Tailwind + custom styles
│   │   ├── App.tsx                 # Root component
│   │   ├── router.tsx              # Route definitions
│   │   └── main.tsx                # Entry point
│   ├── public/                      # Static assets
│   ├── package.json                # Dependencies
│   ├── vite.config.ts              # Vite configuration
│   ├── tsconfig.json               # TypeScript config
│   └── index.html                  # HTML template
│
├── admin/                           # Admin Panel (Port 5173)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                         # FastAPI Backend (Port 8000)
│   ├── app/
│   │   ├── api/                    # API routes
│   │   ├── services/               # Business logic
│   │   ├── models/                 # Data models
│   │   ├── middleware/             # Middleware
│   │   ├── utils/                  # Utilities
│   │   ├── database.py             # DB connection
│   │   ├── config.py               # Configuration
│   │   └── main.py                 # App initialization
│   ├── main.py                     # Entry point
│   ├── requirements.txt            # Python dependencies
│   ├── .env                        # Environment variables
│   └── venv/                       # Virtual environment
│
├── supabase/                        # Database migrations
│   ├── 001_schema.sql              # Initial schema
│   ├── 002_rls_policies.sql        # Row-level security
│   ├── 003_seed_products.sql       # Product data
│   ├── 004_seed_services.sql       # Service data
│   └── ...
│
├── scripts/                         # Utility scripts
│   ├── seed.js                     # Data seeding
│   ├── migrate.js                  # Database migration
│   └── tag_products.py             # Product tagging
│
├── STYLING_AUDIT_REPORT.md         # Styling analysis
├── STYLING_FIX_GUIDE.md            # Styling fixes
├── DESKTOP_OPTIMIZATION.md         # Desktop improvements
├── CLIENT_PAGES.md                 # Page documentation
├── BACKEND_SPEC.md                 # Backend API spec
└── DATABASE_SETUP.md               # Database setup
```

---

## 🔄 Data Flow

### User Journey: Browse Products
```
1. User visits /products
   ↓
2. ProductsPage component loads
   ↓
3. Calls getProducts() API
   ↓
4. Backend queries Supabase
   ↓
5. Returns product list
   ↓
6. ProductGrid renders ProductCards
   ↓
7. User sees products
```

### User Journey: Add to Cart
```
1. User clicks "Add to Cart"
   ↓
2. CartContext updates state
   ↓
3. Item added to localStorage
   ↓
4. Cart icon updates
   ↓
5. Toast notification shows
```

### User Journey: Checkout
```
1. User clicks "Checkout"
   ↓
2. CheckoutPage loads
   ↓
3. User fills form
   ↓
4. Submits order
   ↓
5. Backend creates order in Supabase
   ↓
6. Redirects to OrderSuccessPage
```

---

## 🛠️ Technology Stack

### Frontend (Client)
```
Framework:      React 19.0.1
Build Tool:     Vite 6.2.3
Language:       TypeScript 5.8.2
Styling:        Tailwind CSS 4.1.14
Routing:        React Router 7.18.1
Forms:          React Hook Form 7.80.0
Validation:     Zod 4.4.3
HTTP Client:    Axios 1.18.1
Animations:     Motion 12.23.24, GSAP
Icons:          Lucide React 0.546.0
Notifications:  React Hot Toast 2.6.0
Database:       Supabase Client
```

### Backend (Server)
```
Framework:      FastAPI
Language:       Python 3.x
Database:       PostgreSQL (via Supabase)
Authentication: Supabase Auth
API Style:      REST
```

### Database
```
Provider:       Supabase
Database:       PostgreSQL
Auth:           Supabase Auth
Storage:        Supabase Storage
RLS:            Row-Level Security policies
```

### DevOps
```
Version Control: Git
Package Manager: npm (frontend), pip (backend)
Build:          Vite (frontend), Python (backend)
Deployment:     Railway/Fly.io (backend)
```

---

## 📊 Database Schema

### Core Tables
```
products
├── id (UUID)
├── name (string)
├── description (text)
├── price (decimal)
├── images (array)
├── category (string)
├── stock (integer)
├── created_at (timestamp)
└── updated_at (timestamp)

services
├── id (UUID)
├── name (string)
├── description (text)
├── price (decimal)
├── category (string)
├── duration (integer)
├── created_at (timestamp)
└── updated_at (timestamp)

orders
├── id (UUID)
├── user_id (UUID)
├── items (array)
├── total (decimal)
├── status (string)
├── created_at (timestamp)
└── updated_at (timestamp)

customers
├── id (UUID)
├── email (string)
├── name (string)
├── phone (string)
├── address (text)
├── created_at (timestamp)
└── updated_at (timestamp)
```

---

## 🔐 Authentication Flow

```
1. User visits /login
   ↓
2. Enters email/password
   ↓
3. Supabase Auth validates
   ↓
4. Returns JWT token
   ↓
5. Token stored in localStorage
   ↓
6. Included in API requests
   ↓
7. Backend validates token
   ↓
8. User authenticated
```

---

## 🎨 Component Hierarchy

### Layout Structure
```
App
├── Header
│   ├── Logo
│   ├── Navigation
│   ├── Search
│   ├── Cart Icon
│   └── User Menu
├── Main Content
│   └── Router
│       ├── HomePage
│       ├── ProductsPage
│       ├── ServicesPage
│       ├── CartPage
│       ├── CheckoutPage
│       ├── ProfilePage
│       └── ...
├── Footer
│   ├── Links
│   ├── Newsletter
│   └── Social
└── Modals/Drawers
    ├── SearchModal
    ├── CartDrawer
    └── MobileNav
```

---

## 🔌 API Endpoints

### Products
```
GET    /api/products              # List all products
GET    /api/products/:id          # Get product details
POST   /api/products              # Create product (admin)
PUT    /api/products/:id          # Update product (admin)
DELETE /api/products/:id          # Delete product (admin)
```

### Services
```
GET    /api/services              # List all services
GET    /api/services/:id          # Get service details
POST   /api/services              # Create service (admin)
PUT    /api/services/:id          # Update service (admin)
DELETE /api/services/:id          # Delete service (admin)
```

### Orders
```
GET    /api/orders                # List user orders
GET    /api/orders/:id            # Get order details
POST   /api/orders                # Create order
PUT    /api/orders/:id            # Update order status
```

### Auth
```
POST   /api/auth/register         # Register user
POST   /api/auth/login            # Login user
POST   /api/auth/logout           # Logout user
GET    /api/auth/me               # Get current user
```

---

## 🎯 Key Features

### Customer Features
- ✅ Browse products and services
- ✅ Search and filter
- ✅ Add to cart
- ✅ Checkout
- ✅ Track orders
- ✅ User profile
- ✅ Wishlist (if implemented)
- ✅ Reviews/ratings (if implemented)

### Admin Features
- ✅ Manage products
- ✅ Manage services
- ✅ View orders
- ✅ Manage users
- ✅ Analytics (if implemented)

---

## 🚀 Running the Application

### Start Frontend
```bash
cd client
npm install
npm run dev
# Runs on http://localhost:3001
```

### Start Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

### Start Admin Panel
```bash
cd admin
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 📱 Responsive Design

### Breakpoints
```
Mobile:        < 640px   (sm:)
Tablet:        640-1023px (md:)
Desktop:       1024-1279px (lg:)
Large Desktop: 1280px+   (xl:, 2xl:)
```

### Current Status
- ✅ Mobile: Fully optimized
- ⚠️ Tablet: Partial (needs md: variants)
- ✅ Desktop: Fully optimized
- ❌ Large Desktop: Missing (needs xl:, 2xl:)

---

## 🔍 Key Files to Know

### Frontend
- `src/App.tsx` - Root component
- `src/router.tsx` - Route definitions
- `src/index.css` - Tailwind + custom styles
- `src/api/` - API calls
- `src/hooks/useAuth.ts` - Authentication hook
- `src/hooks/useCart.ts` - Cart management hook

### Backend
- `app/main.py` - App initialization
- `app/api/` - API routes
- `app/services/` - Business logic
- `app/models/` - Data models
- `app/database.py` - DB connection

### Database
- `supabase/001_schema.sql` - Initial schema
- `supabase/002_rls_policies.sql` - Security policies
- `supabase/003_seed_products.sql` - Product data
- `supabase/004_seed_services.sql` - Service data

---

## 🐛 Common Issues & Solutions

### Issue: Styling not responsive
**Solution:** Add `md:` and `lg:` variants to Tailwind classes

### Issue: API calls failing
**Solution:** Check backend is running on port 8000

### Issue: Images not loading
**Solution:** Check image paths in public/ folder

### Issue: Cart not persisting
**Solution:** Check localStorage is enabled

### Issue: Authentication failing
**Solution:** Verify Supabase credentials in .env

---

## 📈 Performance Considerations

### Frontend
- Use React.memo for expensive components
- Lazy load routes with React.lazy()
- Optimize images with proper sizing
- Minimize bundle size
- Use Vite for fast builds

### Backend
- Use database indexes
- Implement caching
- Optimize queries
- Use connection pooling
- Monitor performance

### Database
- Use RLS policies for security
- Index frequently queried columns
- Archive old data
- Monitor query performance

---

## 🔒 Security Considerations

### Frontend
- ✅ Input validation with Zod
- ✅ XSS protection via React
- ✅ CSRF tokens (if needed)
- ✅ Secure token storage

### Backend
- ✅ JWT authentication
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ Rate limiting (if implemented)

### Database
- ✅ Row-Level Security (RLS)
- ✅ Encrypted passwords
- ✅ Audit logging (if implemented)

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| STYLING_AUDIT_REPORT.md | Detailed styling analysis |
| STYLING_FIX_GUIDE.md | Quick reference for fixes |
| DESKTOP_OPTIMIZATION.md | Desktop improvements |
| CLIENT_PAGES.md | Page documentation |
| BACKEND_SPEC.md | Backend API specification |
| DATABASE_SETUP.md | Database setup guide |
| CLIENT_FRONTEND_ARCHITECTURE.md | Frontend architecture |
| BACKEND_STRUCTURE.md | Backend structure |

---

## 🎓 Learning Path

### For Frontend Developers
1. Understand React Router (routing)
2. Learn Tailwind CSS (styling)
3. Study React Hooks (state management)
4. Learn TypeScript (type safety)
5. Understand API integration (Axios)

### For Backend Developers
1. Learn FastAPI basics
2. Understand PostgreSQL
3. Study Supabase integration
4. Learn authentication flows
5. Understand API design

### For Full-Stack Developers
1. Understand entire architecture
2. Learn both frontend and backend
3. Understand database design
4. Learn deployment process
5. Understand security practices

---

## 🎯 Next Steps

### Immediate (Today)
1. ✅ Complete styling audit
2. ✅ Document system architecture
3. ⏳ Fix tablet responsive issues
4. ⏳ Add desktop enhancements

### Short-term (This Week)
1. Complete all responsive fixes
2. Test on all devices
3. Optimize performance
4. Fix any bugs

### Long-term (This Month)
1. Add new features
2. Improve admin panel
3. Enhance analytics
4. Scale infrastructure

---

**Last Updated:** July 13, 2026  
**Status:** Complete System Understanding Achieved
