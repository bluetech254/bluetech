# BlueTech Client — Pages Documentation

All pages live in `client/src/pages/`. The app uses React Router v6 with routes defined in `client/src/router.tsx`. Layout (Header + Footer) wraps all routes via `App.tsx`.

---

## Routes Overview

| Route | Page File | Auth Required |
|---|---|---|
| `/` | `HomePage.tsx` | No |
| `/products` | `ProductsPage.tsx` | No |
| `/products/:id` | `ProductDetailPage.tsx` | No |
| `/services` | `ServicesPage.tsx` | No |
| `/book-repair/:serviceId` | `BookRepairPage.tsx` | No |
| `/cart` | `CartPage.tsx` | No |
| `/checkout` | `CheckoutPage.tsx` | No |
| `/order-success/:orderId` | `OrderSuccessPage.tsx` | No |
| `/booking-success/:bookingId` | `BookingSuccessPage.tsx` | No |
| `/track-order` | `TrackOrderPage.tsx` | No |
| `/login` | `LoginPage.tsx` | No (redirects if authed) |
| `/register` | `RegisterPage.tsx` | No |
| `/profile` | `ProfilePage.tsx` | Yes → redirects to `/login` |
| `/contact` | `ContactPage.tsx` | No |
| `/privacy-policy` | `PrivacyPolicyPage.tsx` | No |
| `*` | Redirect → `/` | — |

---

## Pages

### 1. `HomePage.tsx` — `/`

The main landing page. Composed entirely of home section components.

**Desktop layout:**
- Hero banner (2/3 width) + SideCarousel (1/3 width) side by side
- FeaturedProducts + ServiceCategories in a 2-column grid
- FeaturedServices carousel
- PromotionalDealsCarousel (full width)
- ShopByCategory grid
- ServiceCategoriesScroll
- MarketingPosters (desktop only)
- NewArrivals
- HowItWorks

**Mobile layout:**
- Hero full-width (negative margin bleed)
- FeaturedProducts (single column)
- PremiumProductsPoster (full bleed)
- FeaturedServices
- ExpertServicesPoster (full bleed)
- PromotionalDealsCarousel, ShopByCategory, ServiceCategoriesScroll, NewArrivals, HowItWorks

**Components used:** `Hero`, `SideCarousel`, `PromotionalDealsCarousel`, `FeaturedProducts`, `ServiceCategories`, `FeaturedServices`, `ShopByCategory`, `ServiceCategoriesScroll`, `MarketingPosters`, `PremiumProductsPoster`, `ExpertServicesPoster`, `NewArrivals`, `HowItWorks`

**TODO / Known gaps:**
- No real "About Us" section yet (footer links to `/` as placeholder)
- Blog, Careers, Hot Deals links in footer are `href="#"` placeholders

---

### 2. `ProductsPage.tsx` — `/products`

Full product catalog with client-side filtering and pagination.

**State:**
- `allProducts` — fetched once on mount via `getProducts({ limit: 200 })`
- `search`, `category`, `minPrice`, `maxPrice` — filter state
- `page` — current pagination page (PAGE_SIZE = 12)

**Desktop layout:**
- Full-width animated category ticker (marquee) at top — clicking a category filters the grid
- `FilterSidebar` on the left (hidden below 900px)
- Right: Section carousels (Featured, Flash Sale, Hot Deals, New Arrivals, Best Sellers, Trending, Editor's Choice, Weekly Deals, Back in Stock, Clearance, Refurbished, Pre-Order, Coming Soon) — only shown when no category filter is active
- Product grid: 3 cols mobile / 4 cols desktop
- Pagination controls at bottom

**Mobile layout:**
- No sidebar (hidden)
- Category ticker still visible
- 3-column product grid
- Pagination controls

**Components used:** `FilterSidebar`, `ProductCard`, `SectionCarousel`

**TODO / Known gaps:**
- Sort order (price asc/desc, newest) not yet implemented
- Mobile filter drawer not yet implemented (sidebar is hidden on mobile with no alternative)
- `limit: 200` is a hard cap — needs server-side pagination if catalog grows

---

### 3. `ProductDetailPage.tsx` — `/products/:id`

Single product detail view.

**State:**
- Fetches product by `id` param via `getProductById(id)`
- Fetches related products by same `category` (up to 4, excluding current)

**Desktop layout:**
- Breadcrumb nav + "Back to Products" link
- `ProductDetail` component (main display — image, specs, add to cart)
- "You May Also Like" section with `ProductGrid` (related products)

**Mobile layout:**
- Same structure, stacked vertically
- Breadcrumb truncates long product names (`max-w-40`)

**Components used:** `ProductDetail`, `ProductGrid`, `Loading`

**Error state:** Shows a red card with error message and back link if product not found or API fails.

---

### 4. `ServicesPage.tsx` — `/services`

Repair services catalog.

**State:**
- `services` — fetched via `getRepairServices({ category, search })` on filter change
- `selectedCategory`, `searchQuery` — filter state
- Reads `?category=` and `?search=` URL params on mount (for deep-linking from Home)

**Desktop layout:**
- Full-width gradient hero banner (blue → indigo) with title and description
- `ServiceFilters` (category tabs + search input)
- `ServiceGrid` (service cards)
- "BlueTech Certified Repair Guarantee" banner (2-column: text + checklist)

**Mobile layout:**
- Hero banner stacks vertically
- Guarantee banner stacks to single column

**Components used:** `ServiceGrid`, `ServiceFilters`

**TODO / Known gaps:**
- No pagination — all services loaded at once

---

### 5. `BookRepairPage.tsx` — `/book-repair/:serviceId`

4-step repair booking form.

**State:**
- Fetches service by `serviceId` param via `getRepairServiceById(serviceId)`
- Form managed by `react-hook-form` + `zodResolver(bookingSchema)`
- `submitting` state for loading feedback

**Form fields:**
- Step 1 (Contact): `customer_name`, `customer_phone`, `customer_email`
- Step 2 (Device): `device_brand`, `device_model`, `issue_description` (textarea)
- Step 3 (Appointment): `preferred_date` (min: tomorrow), `preferred_time` (Morning/Afternoon/Evening), `notes` (textarea)
- Step 4 (Terms): `terms_accepted` checkbox

**Phone normalization:** Strips leading `0`, prepends `254` if not already present.

**On success:** Navigates to `/booking-success/:id`

**Desktop layout:**
- 2/3 + 1/3 grid: form on left, sticky service summary card on right
- Summary card shows: service name, category badge, price, duration, warranty, inclusions list, no-diagnostics-fee note

**Mobile layout:**
- Single column — form first, summary card below

**Components used:** `Input`, `Select`, `Button`, `Card`, `Loading`

**TODO / Known gaps:**
- `fulfillment_type` is hardcoded to `'dropoff'` — pickup option not yet wired
- `preferred_date` and `preferred_time` are collected in the form but not sent to the API (booking payload only uses `full_name`, `phone_number`, `device_type`, `device_model`, `issue_description`)

---

### 6. `CartPage.tsx` — `/cart`

Shopping cart view.

**State:** Reads from `useCart()` hook (`items` array).

**Desktop layout:**
- Breadcrumb + header
- If empty: `EmptyCart` component
- If items: 2/3 + 1/3 grid — `CartItem` list on left, `CartSummary` on right

**Mobile layout:**
- Single column — items list, then summary below

**Components used:** `CartItem`, `CartSummary`, `EmptyCart`

---

### 7. `CheckoutPage.tsx` — `/checkout`

Order placement form with delivery zone selection and payment method.

**State:**
- `zones` — fetched via `getDeliveryZones()`
- Form: `customer_name`, `phone_number`, `email`, `delivery_address`, `delivery_zone`, `payment_method` (`mpesa` | `cash_on_delivery`), `notes`, `terms_accepted`
- Pre-fills `delivery_zone` from `sessionStorage` key `bluetech_delivery_zone_id`

**Payment methods:**
- M-Pesa: shows Paybill number (`MPESA_PAYBILL` constant) and instructions
- Cash on Delivery: shows note about payment on arrival

**On success:** Clears cart, navigates to `/order-success/:orderId`

**Desktop layout:**
- 2/3 + 1/3 grid: form on left, order summary card (items + totals) on right (sticky)

**Mobile layout:**
- Single column — form first, summary below

**Components used:** `Input`, `Select`, `Button`, `Card`, `Badge`, `Loading`

**TODO / Known gaps:**
- No address autocomplete
- Delivery fee is zone-dependent — zone must be selected to see final total

---

### 8. `OrderSuccessPage.tsx` — `/order-success/:orderId`

Post-checkout confirmation page.

**State:** Fetches order by `orderId` param via `getOrderById(orderId)`.

**Features:**
- Displays order ID with copy-to-clipboard button
- Shows order items, totals, delivery info, payment method
- M-Pesa payment instructions if `payment_method === 'mpesa'`
- Links to `/track-order?type=order&id=:orderId`

**Components used:** `Card`, `Badge`, `Button`, `Loading`

---

### 9. `BookingSuccessPage.tsx` — `/booking-success/:bookingId`

Post-booking confirmation page.

**State:** Fetches booking by `bookingId` param via `getBookingById(bookingId)`.

**Features:**
- Displays booking reference with copy-to-clipboard button
- Shows device info, service details, appointment date/time
- Links to `/track-order?type=repair&id=:bookingId`

**Components used:** `Card`, `Badge`, `Button`, `Loading`

---

### 10. `TrackOrderPage.tsx` — `/track-order`

Unified tracking page for both orders and repair bookings.

**State:**
- `activeTab`: `'order'` | `'repair'`
- `searchId` — input value
- `order`, `booking` — loaded tracking data
- Reads `?type=` and `?id=` URL params on mount and auto-searches

**Tabs:**
- Order tab: searches via `getOrderById(id)` — shows shipment status timeline, items, delivery info
- Repair tab: searches via `getBookingById(id)` — shows repair workflow status, device info, technician notes

**Desktop layout:**
- Centered card with tab switcher, search input, and results below

**Mobile layout:**
- Same, full-width

**Components used:** `Input`, `Button`, `Card`, `Badge`

---

### 11. `LoginPage.tsx` — `/login`

Authentication login form.

**State:**
- Redirects to `from` (location state) or `/profile` if already authenticated
- `submitting` state, `showPassword` toggle

**Form fields:** `phone_number`, `password`

**Phone normalization:** Strips leading `0`, prepends `254`.

**On success:** Toast + redirect to target route.

**Footer note:** Links to `/register` and `/privacy-policy`.

**Components used:** `Input`, `Button`, `Card`

---

### 12. `RegisterPage.tsx` — `/register`

New account registration form.

**Form fields:** `full_name`, `email`, `phone_number`, `password`, `confirm_password`

**Phone normalization:** Same as login.

**On success:** Toast + redirect to `/login`.

**Footer note:** Links to `/login` and `/privacy-policy`.

**Components used:** `Input`, `Button`, `Card`

---

### 13. `ProfilePage.tsx` — `/profile`

Authenticated user dashboard with 3 tabs.

**Auth guard:** Redirects to `/login` if not authenticated.

**Tabs:**
- **Profile** — Edit `full_name`, `phone_number` via `updateProfile()`. Change password via `changePassword()`. Logout button.
- **Orders** — Lists orders fetched via `trackOrdersByPhone(user.phone_number)`. Each row links to `/track-order?type=order&id=:id`.
- **Bookings** — Lists repair bookings via `trackBookingsByPhone(user.phone_number)`. Each row links to `/track-order?type=repair&id=:id`.

**Components used:** `Input`, `Button`, `Card`, `Badge`, `Loading`

**TODO / Known gaps:**
- `ProfilePageNew.tsx` exists as an alternate version — not currently routed
- No avatar/photo upload
- No email change flow

---

### 14. `ContactPage.tsx` — `/contact`

Contact form + store info.

**Form fields:** `name`, `email`, `phone`, `subject` (dropdown), `message`

**Submission:** Currently simulated with `setTimeout` (no real API call). Shows success toast and resets form.

**Layout:**
- Left: contact form card
- Right: store info (address, phone, email, hours)

**Components used:** `Input`, `Select`, `Button`, `Card`

**TODO / Known gaps:**
- No real backend endpoint — needs a `/contact` API route or email service integration

---

### 15. `PrivacyPolicyPage.tsx` — `/privacy-policy`

Static legal page.

**Sections:** Information We Collect, How We Use It, Sharing, Security, Cookies, Your Rights, Data Retention, Policy Changes, Contact.

**Linked from:** Footer bottom bar, LoginPage, RegisterPage.

---

## Shared Patterns

**Loading state:** Most data-fetching pages use the `<Loading fullScreen message="..." />` component while awaiting API responses.

**Error state:** Inline red card with message + back link.

**Breadcrumbs:** Present on ProductDetailPage, ProductsPage (via ticker), BookRepairPage, CartPage, ContactPage.

**Phone normalization:** Applied consistently on LoginPage, RegisterPage, BookRepairPage — strips leading `0`, prepends `254`.

**Toast notifications:** All form submissions use `react-hot-toast` with loading → success/error pattern.

**Animation:** All pages have `animate-fade-in` class on the root div.

---

## What's Missing / TODO

| Item | Priority |
|---|---|
| Mobile filter drawer for ProductsPage | High |
| Sort controls on ProductsPage | Medium |
| BookRepairPage: wire pickup fulfillment type | Medium |
| BookRepairPage: send `preferred_date` + `preferred_time` to API | Medium |
| ContactPage: real API/email integration | Medium |
| ProfilePage: email change flow | Low |
| ProfilePage: route `ProfilePageNew.tsx` or remove it | Low |
| Blog, Careers, Hot Deals pages | Low |
| Returns & Refunds, Warranty, FAQs pages | Low |
| Terms of Service page | Low |
