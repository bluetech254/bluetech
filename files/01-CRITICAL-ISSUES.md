# Critical Issues — Bugs, Security, Dead Code

## A. Security

### A1. Contact form is non-functional (data loss, not a security hole, but a trust/integrity issue)
`src/pages/ContactPage.tsx`
```js
const onSubmit = async (formData: any) => {
  setSubmitting(true);
  const toastId = toast.loading('Sending your message...');
  setTimeout(() => {
    toast.success('Your message has been sent! ...', { id: toastId });
    reset();
    setSubmitting(false);
  }, 1200);
};
```
There is no `api.post(...)` call. Every customer inquiry is silently thrown away while the UI confidently tells them it was received. **Fix:** wire this to a real `/contact` (or similar) endpoint, matching the pattern used by every other form in the app (`api/auth.ts`, `api/bookings.ts`, etc.).

### A2. Debug logging of full customer PII
`src/pages/CheckoutPage.tsx`
```js
console.log('Sending order:', orderPayload);
...
console.error('Error response:', err.response?.data);
```
`orderPayload` contains full name, phone number, email, delivery address. This ships to production and is visible to anyone who opens devtools (and to any browser extension / injected script with console access). **Fix:** remove, or gate behind `import.meta.env.DEV`.

### A3. Potential IDOR surface on order/booking tracking
`src/pages/TrackOrderPage.tsx` + `src/api/orders.ts` / `src/api/bookings.ts`
The page (gated only by "is logged in", via `ProtectedRoute`) lets a user type **any** order ID or booking ID and fetch full customer name, phone, delivery address and totals via `getOrderById(id)` / `getBookingById(id)`. There is no check anywhere in the frontend that the ID belongs to the logged-in user. If the backend doesn't independently verify ownership, any authenticated user can enumerate other customers' orders by guessing/incrementing IDs. **Fix:** confirm backend scopes these endpoints to the requesting user (or requires a secondary secret like an order confirmation code), and consider only surfacing this lookup via the confirmation email/SMS token rather than a raw ID field.

### A4. Hardcoded production endpoint bypassing the API client
`src/components/home/ServiceCategories.tsx`
```js
const response = await fetch('https://bluetechnology-y1f8.onrender.com/api/v1/repair-services?limit=10');
```
This bypasses `src/api/axios.ts` entirely — no `Authorization` header, no timeout, no shared 401-handling, no environment config (`API_BASE_URL`). It will silently point at production even when developing locally or against a staging backend. **Fix:** use `getRepairServices()` from `api/services.ts` like every other component does.

### A5. Inconsistent / weak password policy enforcement
- `registerSchema` (utils/validation.ts): min **6** characters.
- `passwordSchema` (profile password change): min **8** characters.
- `ForgotPasswordPage.tsx`: **no schema at all** — a bare `<Input required>` — despite the placeholder text claiming "Min 8 chars, uppercase, number, symbol." A user can reset their password to a single character on the client side; only a (hopefully present) backend check would stop it.
**Fix:** Extract one shared password schema/policy and apply it everywhere passwords are set, including forgot-password.

### A6. Phone number validation is inconsistent across forms
- `registerSchema` / `orderSchema` / `bookingSchema`: `^(0?7\d{8}|254\d{9})$` (accepts `07…`, `7…`, or `254…`)
- `contactSchema` / `profileSchema`: `^254\d{9}$` only (strict), yet the UI placeholder for profile still says a generic phone format and other pages accept the looser format.
This means the exact same "Kenyan phone number" concept is validated three different ways depending on which form you're on — confusing for users and a maintenance hazard. **Fix:** one shared `phoneSchema` in `utils/validation.ts`, reused everywhere, with one normalization helper (see A7).

### A7. Phone-normalization logic duplicated 4×
The "strip leading 0, then prefix with 254" logic is copy-pasted verbatim in `LoginPage.tsx`, `RegisterPage.tsx`, `CheckoutPage.tsx`, `BookRepairPage.tsx`, and `ForgotPasswordPage.tsx`. Any future change to the rule (e.g., supporting `+254`) has to be made in 5 places, and it's easy to miss one. **Fix:** move to `utils/formatters.ts` or a new `utils/phone.ts` as `normalizeKenyanPhone(input: string): string`.

---

## B. Functional Bugs

### B1. Negative checkout total is possible
`src/pages/CheckoutPage.tsx`
```js
const pointsDiscount = redeemPoints && pointsBalance >= 1000 ? pointsBalance : 0;
const grandTotal = subtotal - pointsDiscount + deliveryFee;
```
If a customer's points balance (expressed as KES value) exceeds their cart subtotal, `grandTotal` goes negative and that negative number is sent to `createOrder`. **Fix:** cap the discount — `Math.min(pointsBalance, subtotal)` — and clamp the total to `Math.max(0, ...)`.

### B2. `selectedZone.name` doesn't exist
`src/pages/CheckoutPage.tsx`, order-summary card:
```jsx
<span>Shipping with <strong>{selectedZone.name}</strong> standard rates.</span>
```
`DeliveryZone` (types/index.ts) only defines `zone_name`, not `name`. This always renders blank. **Fix:** `selectedZone.zone_name`.

### B3. Undefined `discount` field rendered as a badge
`src/components/home/PromotionalDealsCarousel.tsx`
```jsx
<div className="absolute top-3 right-3 ...">{deal.discount}</div>
```
The `Deal` objects built earlier in the same file never set a `discount` property (only `id/title/type/price/image/cta`). Every deal card shows a badge containing the literal text `undefined`. **Fix:** either compute/display a real discount value from the API, or remove the badge.

### B4. `FilterSidebar` filters that don't do anything
`src/components/products/FilterSidebar.tsx` tracks `condition`, `selectedBrand`, and `minRating` in local state, renders full UI for all three, but `handleApply` only forwards `search`, `category`, `min_price`, `max_price`:
```js
const handleApply = () => {
  onChange({ search, category: filters.category, min_price: ..., max_price: ... });
};
```
Selecting "Refurbished" condition, typing a brand, or picking a star rating and clicking **Apply Filters** silently does nothing. **Fix:** either wire these through to `ProductsPage`'s filtering logic, or remove the controls until the feature is implemented — half-working filters are worse than no filters.

### B5. Two unrelated components both fetch/rename to `ServiceCategories`
`src/components/home/ServiceCategories.tsx` and `src/components/home/ServiceCategoriesScroll.tsx` (whose internal component is also literally named `ServiceCategories`, just exported under a different default). Both are imported and rendered on `HomePage` (not a runtime conflict, since they're aliased on import), but the identical naming is a standing trap for the next developer who searches the codebase for "ServiceCategories" and edits the wrong file.

### B6. Client-heavy "deals" fetch double-normalizes data
`PromotionalDealsCarousel.tsx` calls the raw `api.get('/products')` / `api.get('/repair-services')` and manually re-implements the same field mapping that `getProducts()` / `getRepairServices()` already do in `api/products.ts` / `api/services.ts` — with a different, incompatible field-name assumption (`p.title`, `p.image_url` vs. the normalized shape used elsewhere). Any backend field rename now has to be updated in two places that will likely drift out of sync (as `B3` shows it already has).

---

## C. Dead Code

| File | Status | Notes |
|---|---|---|
| `src/pages/ProfilePageNew.tsx` | **Unused**, 242 lines | Full alternate `/profile` implementation, not referenced by `router.tsx` or anywhere else. Different container width (`max-w-6xl` vs. the live page's `max-w-5xl`), different hero style, missing Points/Settings tabs. Safe to delete, or worth confirming with the team it isn't a "next redesign" someone forgot to wire up. |
| `src/components/products/ProductFilters.tsx` | **Unused**, 165 lines | A full category/price/sort filter panel, never imported by any page (`FilterSidebar.tsx` is what `ProductsPage` actually uses). |

**Recommendation:** delete both, or if either represents in-progress work, rename with a clear `_draft`/`_wip` marker and exclude from the build so they don't confuse future contributors or get picked up by find-and-replace refactors.
