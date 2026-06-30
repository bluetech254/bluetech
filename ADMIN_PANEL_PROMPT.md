# Blue Technology Admin Panel - Complete Specification

## Project Context
Build a comprehensive admin dashboard for Blue Technology, a Kenyan dual-purpose platform managing both electronics repair bookings and e-commerce product sales. The admin panel must provide complete operational control over both business verticals from a single unified interface.

## Technology Stack
- **Frontend Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL + REST API)
- **Authentication**: Simple password protection (environment variable for MVP)
- **State Management**: React hooks + Supabase real-time subscriptions

## Database Schema Reference

### Tables Available:
1. **products** - E-commerce catalog (title, description, price, image_url, specifications, stock_quantity, is_active)
2. **orders** - Customer purchases (id, full_name, phone_number, delivery_address, delivery_zone, subtotal, total_amount, status, payment_status, created_at)
3. **order_items** - Line items per order (order_id, product_id, product_title, quantity, unit_price, total_price)
4. **bookings** - Repair requests (id, full_name, phone_number, device_type, device_model, issue_description, fulfillment_type, status, estimated_cost, final_cost, created_at)
5. **delivery_zones** - Geographic zones with fees (zone_name, delivery_fee, is_active)
6. **repair_services** - Service catalog (service_name, service_category, base_price, duration, warranty)

### Status Enums:
- **Order Status**: pending, confirmed, processing, dispatched, delivered, cancelled
- **Booking Status**: pending, confirmed, picked_up, in_diagnosis, in_repair, ready, completed, cancelled
- **Payment Status**: unpaid, paid

## Admin Panel Structure

### Route: `/admin`

#### Authentication Gate
- Simple password prompt modal on page load
- Password stored in environment variable: `NEXT_PUBLIC_ADMIN_PASSWORD`
- Session stored in localStorage (expires on browser close)
- Clean, centered login form with Blue Technology branding

---

## Main Dashboard Layout

### Top Navigation Bar (Sticky)
- **Left**: Blue Technology logo + "Admin Dashboard" text
- **Center**: Quick stats badges:
  - Pending Orders (red badge count)
  - Pending Repairs (blue badge count)
  - Today's Revenue (KES total)
- **Right**: Logout button

### Sidebar Navigation (Left, Fixed)
Width: 240px, Dark background

Menu Items:
1. 📊 **Dashboard** (default view)
2. 🛒 **Orders Management**
3. 🔧 **Repairs Management**
4. 📦 **Products Catalog**
5. 🚚 **Delivery Zones**
6. 📈 **Analytics** (optional for MVP)

Active menu item highlighted with accent color.

---

## 1. Dashboard View (Default)

### Top Stats Row (4 Cards)
Grid: 4 columns, each card with:
- Large number (metric value)
- Label below
- Trend indicator (optional)
- Icon on right

Metrics:
1. **Total Orders Today** (count)
2. **Total Bookings Today** (count)
3. **Revenue Today** (KES with comma separators)
4. **Pending Actions** (orders + bookings needing attention)

### Recent Activity Section
Two-column layout:

**Left Column: Recent Orders (Last 10)**
Table with columns:
- Order ID (truncated, clickable)
- Customer Name
- Phone
- Total Amount (KES)
- Status badge (color-coded)
- Quick Action button ("View Details")

**Right Column: Recent Repair Bookings (Last 10)**
Table with columns:
- Booking ID (truncated)
- Customer Name
- Device Type + Model
- Status badge
- Quick Action button ("View Details")

Both tables should have "View All" link at bottom.

---

## 2. Orders Management View

### Filter Bar (Top)
Horizontal row with:
- Status filter dropdown (All, Pending, Confirmed, Processing, Dispatched, Delivered, Cancelled)
- Date range picker (From - To)
- Search input (by phone number or customer name)
- "Reset Filters" button
- "Export CSV" button (optional)

### Orders Table (Main Content)
Full-width responsive table with columns:

| Order ID | Date | Customer | Phone | Items | Zone | Total (KES) | Payment | Status | Actions |
|----------|------|----------|-------|-------|------|-------------|---------|--------|---------|

**Column Details:**
- **Order ID**: First 8 chars of UUID, monospace font
- **Date**: `Jun 29, 2026 3:15 PM` format
- **Customer**: Full name
- **Phone**: Clickable (opens WhatsApp)
- **Items**: Count badge (e.g., "3 items")
- **Zone**: Delivery zone name
- **Total**: Bold, right-aligned with KES prefix
- **Payment**: Badge (Unpaid=red, Paid=green)
- **Status**: Dropdown selector (inline edit)
- **Actions**: 
  - 👁️ View Details button
  - 📞 Call Customer (tel: link)

### Order Details Modal (Expandable)
When "View Details" clicked, show modal:

**Header:**
- Order #ID
- Close button (X)

**Body (3 Sections):**

1. **Customer Information**
   - Name
   - Phone (clickable WhatsApp link)
   - Email
   - Delivery Address (full text)
   - Delivery Zone + Fee

2. **Order Items Table**
   | Product | Quantity | Unit Price | Total |
   |---------|----------|------------|-------|
   
   Show all items with:
   - Product thumbnail image (small)
   - Product title
   - Quantity
   - Unit price
   - Line total
   
   **Order Summary:**
   - Subtotal: KES X,XXX
   - Delivery Fee: KES XXX
   - **Total: KES X,XXX** (bold)

3. **Order Management Actions**
   - Status Dropdown (large, prominent)
   - Payment Status Toggle (Unpaid ↔ Paid)
   - Notes textarea (internal notes)
   - **Save Changes** button (primary, blue)
   - **Print Invoice** button (optional)

**Footer:**
- Order placed: [timestamp]
- Last updated: [timestamp]

---

## 3. Repairs Management View

### Filter Bar
Similar to Orders, but with:
- Status filter (All, Pending, Confirmed, Picked Up, In Diagnosis, In Repair, Ready, Completed, Cancelled)
- Device type filter (All, Laptop, Smartphone, Tablet, Gaming Console, etc.)
- Search by phone or name

### Bookings Table
Full-width table:

| Booking ID | Date | Customer | Phone | Device | Issue (Preview) | Fulfillment | Status | Cost | Actions |
|------------|------|----------|-------|--------|-----------------|-------------|--------|------|---------|

**Column Details:**
- **Booking ID**: Truncated UUID
- **Date**: Created timestamp
- **Customer**: Full name
- **Phone**: Clickable WhatsApp
- **Device**: `Device Type - Model` (e.g., "Laptop - MacBook Pro M1")
- **Issue**: First 50 chars of description + "..."
- **Fulfillment**: Badge ("Dropoff" or "Pickup")
- **Status**: Dropdown selector (inline edit)
- **Cost**: Estimated cost (editable)
- **Actions**:
  - 👁️ View Details
  - 📞 Call Customer
  - 💰 Update Cost

### Booking Details Modal

**Header:**
- Booking #ID
- Status badge (large)
- Close button

**Body:**

1. **Customer & Device Info**
   - Customer Name
   - Phone (WhatsApp link)
   - Device Type
   - Device Model
   - **Issue Description** (full text, multi-line, easy to read)

2. **Fulfillment Details**
   - Type: Dropoff / Pickup
   - Pickup Address (if applicable)

3. **Repair Status Timeline**
   Visual progress tracker showing:
   - ⚪ Pending
   - ⚪ Confirmed
   - ⚪ Picked Up (if pickup)
   - ⚪ In Diagnosis
   - ⚪ In Repair
   - ⚪ Ready for Collection
   - ⚪ Completed
   
   Current status highlighted, previous steps checked/green

4. **Cost Management**
   - **Estimated Cost**: Input field (KES)
   - **Final Cost**: Input field (KES)
   - Helper text: "Estimated shown to customer, Final charged at pickup"

5. **Internal Notes**
   - Textarea (diagnostic findings, parts needed, etc.)

6. **Service Reference** (Optional)
   - Quick view of suggested repair services from `repair_services` table
   - Show matching services by category
   - Display: Service name, base price, duration

**Footer Actions:**
- Status Dropdown (large)
- **Save Changes** button (primary)
- **Mark as Completed** button (if status is "Ready")

---

## 4. Products Catalog View

### Top Action Bar
- **Add New Product** button (primary, right-aligned)
- Search input (by title)
- Category filter dropdown
- Active/Inactive toggle

### Products Grid
Responsive grid (3-4 columns on desktop, 1-2 on mobile)

Each product card:
- Product image (thumbnail, 200x200px)
- Product title (2 lines max, ellipsis)
- Price (large, bold, KES format)
- Stock quantity badge
- Active/Inactive toggle switch
- **Edit** button
- **Delete** button (with confirmation)

### Add/Edit Product Modal

**Form Fields:**
1. **Product Title** (text input, required)
2. **Description** (textarea, 5 rows, required)
3. **Price** (number input, KES, required)
4. **Stock Quantity** (number input, default 10)
5. **Category** (text input or dropdown)
6. **Brand** (text input)
7. **Image URL** (text input, with preview)
   - Alternative: File upload (to Supabase Storage)
8. **Specifications** (JSON editor or key-value pairs)
   - Dynamic fields: Add Spec button
   - Each spec: Key (text) + Value (text)
9. **Active Status** (checkbox, default checked)

**Buttons:**
- **Save Product** (primary)
- **Cancel** (secondary)

**Image Upload Flow (if using Storage):**
- Drag & drop zone or file picker
- Upload to Supabase Storage `products` bucket
- Generate public URL
- Auto-fill image_url field

---

## 5. Delivery Zones View

Simple table editor for managing delivery zones.

### Zones Table
| Zone Name | Delivery Fee (KES) | Active | Actions |
|-----------|-------------------|--------|---------|

**Inline Editing:**
- Click zone name or fee to edit directly
- Toggle switch for Active status
- Save button appears on row edit

### Add Zone Button
Modal with:
- Zone Name (text input)
- Delivery Fee (number input, KES)
- Active (checkbox, default true)
- **Save** button

---

## Design System Specifications

### Color Palette
- **Primary**: Blue (#3B82F6) - for primary actions
- **Secondary**: Slate (#64748B) - for secondary elements
- **Success**: Green (#10B981) - for completed/paid/active states
- **Warning**: Orange (#F59E0B) - for pending/processing states
- **Danger**: Red (#EF4444) - for cancelled/unpaid/inactive states
- **Background**: White (#FFFFFF) / Light Gray (#F9FAFB)
- **Sidebar**: Dark (#1E293B)

### Status Badge Colors
**Order Status:**
- Pending: Orange
- Confirmed: Blue
- Processing: Blue
- Dispatched: Purple
- Delivered: Green
- Cancelled: Red

**Booking Status:**
- Pending: Orange
- Confirmed: Blue
- Picked Up: Blue
- In Diagnosis: Yellow
- In Repair: Purple
- Ready: Green
- Completed: Green (darker)
- Cancelled: Red

**Payment Status:**
- Unpaid: Red background, white text
- Paid: Green background, white text

### Typography
- **Headings**: Inter or System UI, bold
- **Body**: Inter or System UI, regular
- **Monospace** (for IDs): "Courier New" or monospace

### Component Library (shadcn/ui)
Use these components:
- `Table` - for data tables
- `Dialog` - for modals
- `Button` - for all actions
- `Badge` - for status indicators
- `Select` - for dropdowns
- `Input` - for text fields
- `Textarea` - for multi-line inputs
- `Switch` - for toggles
- `Card` - for dashboard stats

### Responsive Breakpoints
- Mobile: < 768px (single column, stacked)
- Tablet: 768px - 1024px (2 columns)
- Desktop: > 1024px (full layout with sidebar)

---

## Key Functional Requirements

### Real-Time Updates
- Use Supabase real-time subscriptions on:
  - `orders` table (listen for new orders)
  - `bookings` table (listen for new bookings)
- Show toast notification when new order/booking arrives
- Auto-refresh relevant tables

### Data Operations
All CRUD operations must use Supabase client:
```typescript
// Example pattern
const { data, error } = await supabase
  .from('orders')
  .update({ status: 'dispatched' })
  .eq('id', orderId)
```

### Status Updates
- Status changes must be immediate (optimistic UI)
- Show loading spinner during save
- Show success toast on completion
- Rollback on error with error toast

### Phone Number Integration
All phone numbers should:
- Be clickable
- Format: `254712345678`
- Open WhatsApp: `https://wa.me/254712345678?text=Hello...`

### Search & Filter
- All filters must work together (AND logic)
- Search must be case-insensitive
- Date filters must use Kenya timezone (EAT, UTC+3)

### Pagination
- Tables with > 20 items should paginate
- Page size: 20 items
- Show: Previous, Page Numbers, Next

### Loading States
- Skeleton loaders for tables while fetching
- Spinner for button actions
- Disable buttons during operations

### Error Handling
- Show user-friendly error messages
- Log technical errors to console
- Provide retry option on failures

---

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://ureebvpesbkbholidlrn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password
```

---

## File Structure

```
/app
  /admin
    page.tsx                 # Main admin dashboard (with auth)
    layout.tsx              # Admin layout with sidebar
    /components
      Sidebar.tsx
      StatsCards.tsx
      OrdersTable.tsx
      BookingsTable.tsx
      ProductCard.tsx
      OrderModal.tsx
      BookingModal.tsx
      ProductModal.tsx
    /orders
      page.tsx              # Orders management view
    /bookings
      page.tsx              # Repairs management view
    /products
      page.tsx              # Products catalog view
    /zones
      page.tsx              # Delivery zones view

/lib
  supabase.ts               # Supabase client
  types.ts                  # TypeScript interfaces
  utils.ts                  # Helper functions (formatters, etc.)
```

---

## Success Criteria

Admin panel must:
1. ✅ Load all orders and bookings from Supabase
2. ✅ Allow inline status updates with immediate feedback
3. ✅ Display product catalog with edit capabilities
4. ✅ Show real-time dashboard statistics
5. ✅ Provide detailed modal views for orders and bookings
6. ✅ Enable WhatsApp communication with customers
7. ✅ Work perfectly on mobile devices (responsive)
8. ✅ Load in < 2 seconds on 3G connection
9. ✅ Handle errors gracefully without crashes
10. ✅ Protect with password authentication

---

## Build Instructions for AI

1. Create Next.js 14 app with TypeScript and Tailwind CSS
2. Install dependencies: `@supabase/supabase-js`, `shadcn/ui` components
3. Set up Supabase client connection
4. Build authentication wrapper component
5. Create main dashboard layout with sidebar navigation
6. Implement each view (Dashboard, Orders, Bookings, Products, Zones)
7. Add real-time subscriptions for live updates
8. Style with Tailwind using the color system above
9. Test all CRUD operations against live Supabase database
10. Ensure mobile responsiveness

**Start with the authentication gate and main dashboard, then build each section sequentially.**
