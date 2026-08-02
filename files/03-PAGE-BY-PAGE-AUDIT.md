# Page-by-Page Audit

Each page below is broken into **Styling**, **Responsive**, **Bugs / Security**, and **Recommendations**. Cross-cutting issues (covered in [02](./02-RESPONSIVE-STYLING-SYSTEM.md) and [01](./01-CRITICAL-ISSUES.md)) aren't repeated in full here — only page-specific findings.

---

## `/` — HomePage (`HomePage.tsx`)

**Styling**
- Composes 13 different home-page sections. Two of them ("Featured Services" via `ServiceCategories` and `ServiceCategoriesScroll`) look and behave completely differently despite similar naming — one is a single auto-rotating hero-style banner, the other is a horizontally auto-scrolling category-icon strip. Not wrong, but worth a design review to confirm both are intentional rather than a merge-leftover.
- CTA buttons across these sections are inconsistent: some "Book Now"/"Shop Now" buttons use a washed-out `bg-slate-300 hover:bg-slate-400 text-slate-700` (low-contrast, looks disabled) while others use `bg-white` or solid `bg-blue-600`. On a marketing homepage where these are the primary conversion actions, low-contrast grey buttons will underperform visually against true primary buttons elsewhere on the same page.
- Several sections bypass the shared `Button` component entirely and hand-roll `<button>` markup with inline Tailwind classes (`ExpertServicesPoster`, `PremiumProductsPoster`, `MarketingPosters`, `FeaturedServices`'s `ServiceCard`) — meaning any future global button restyle (e.g. via `Button.tsx`) won't reach these.

**Responsive**
- Section order/visibility is controlled by a patchwork of `hidden lg:block` / `md:hidden` / `lg:hidden` wrapper divs rather than components that adapt internally — this works, but means the same conceptual "Services" content is fetched/rendered via **two separate components** (`FeaturedServices` appears twice in the JSX: once for mobile, once for desktop) — see Bugs below.

**Bugs / Security**
- `FeaturedServices` is mounted twice (`lg:hidden` copy and `hidden lg:block` copy), so on every homepage load it fires its `getRepairServices` fetch **twice** — one instance is always invisibly mounted and fetching data the user never sees. Minor performance/API-load waste.
- See [01-CRITICAL-ISSUES.md](./01-CRITICAL-ISSUES.md) for the `PromotionalDealsCarousel` undefined-discount bug and the hardcoded-URL bug in `ServiceCategories.tsx`, both rendered on this page.

**Recommendations**
- Pick one visual treatment for "Book Now"/"Shop Now" CTAs (recommend the shared `Button` component, `variant="primary"` for the main action) and apply everywhere on this page.
- Have the mobile/desktop split happen *inside* a single `FeaturedServices` component (render different layouts based on a CSS media query, not duplicate mount), so data is only fetched once.

---

## `/products` — ProductsPage (`ProductsPage.tsx`)

**Styling**
- Doesn't reuse the shared `ProductGrid` component (used correctly elsewhere) — it hand-rolls its own grid, which means it doesn't get `ProductGrid`'s loading skeleton pattern, empty-state card, or (most importantly) its mobile horizontal-scroll layout.
- Sidebar uses `FilterSidebar`, which is more feature-complete than the (unused) `ProductFilters` component but has partially non-functional filters — see [01-CRITICAL-ISSUES.md](./01-CRITICAL-ISSUES.md) B4.

**Responsive**
- **Grid is `grid-cols-3 md:grid-cols-3 lg:grid-cols-4`** — three columns even at the smallest supported width (320–375px phones). Each `ProductCard` at that width has to fit an image, wishlisted heart icon, name, price, and an "Add" button in roughly 100px of horizontal space. Compare to the shared `ProductGrid` component, which correctly does a single-row horizontal scroll (`md:hidden overflow-x-auto` with fixed `w-40` cards) below the `md` breakpoint. This page should follow the same pattern instead of forcing a 3-up grid on phones.
- Sidebar breakpoint uses the one-off `[@media(min-width:900px)]:block` instead of `lg:` — see [02](./02-RESPONSIVE-STYLING-SYSTEM.md) §3.
- 13 `SectionCarousel` rows (Featured, Flash Sale, Hot Deals, New Arrivals, Best Sellers, Trending, Editor's Choice, Weekly Deals, Back in Stock, Clearance, Refurbished, Pre-Order, Coming Soon) each independently `.filter()` the same up-to-200-item `allProducts` array on every render. On a mid/low-end mobile device this is a meaningful amount of repeated work for a page whose primary job is browsing products — consider memoizing each filtered list (`useMemo` per flag) or computing all 13 lists in one pass with a single `useMemo`.

**Bugs / Security**
- All filtering (search, category, min/max price) and pagination happens **client-side** after fetching `getProducts({ limit: 200 })`. If the catalog ever exceeds 200 products, filtering/pagination silently operates on an incomplete data set — a customer searching for a real, in-stock product may see "No products found" simply because it was product #201.

**Recommendations**
- Reuse `ProductGrid` (or extract its mobile/desktop responsive pattern into this page).
- Move filtering/pagination server-side using the existing `ProductFilters` API shape (`page`, `limit`, `search`, `category`, `min_price`, `max_price`) that `api/products.ts` already supports — the plumbing exists, it's just not being used here.
- Decide whether the Condition/Brand/Rating filters are a real feature; if yes wire them through, if no remove the UI.

---

## `/products/:id` — ProductDetailPage (`ProductDetailPage.tsx`) + `ProductDetail.tsx`

**Styling**
- Clean two-column layout (`grid-cols-1 lg:grid-cols-2`), consistent with the design system's card/border/shadow conventions. This is one of the better-executed pages.
- Thumbnail gallery pattern (`w-20 h-20 lg:w-24 lg:h-24` thumbnails with active-state ring) reads well and is responsive.

**Responsive**
- Fine at all breakpoints. Zoom modal (`fixed inset-0 ... p-4`) correctly caps image size with `max-h-[90vh] max-w-[90vw]`.

**Bugs / Security**
- "Related products" are computed by re-fetching **all** products (`getProducts({ limit: 200 })`) and filtering client-side by category, on every single product page visit — same 200-item ceiling risk as `ProductsPage`, and a wasteful full-catalog fetch just to find a handful of related items. A dedicated backend endpoint (`/products/:id/related` or `?category=X&exclude=id`) would be both more correct and cheaper.
- Specifications parsing (`JSON.parse(specifications)`) is wrapped in try/catch, which is good defensive practice — no issue here.

**Recommendations**
- Add a server-side "related products" query instead of fetching the whole catalog per product page view.

---

## `/services` — ServicesPage (`ServicesPage.tsx`)

**Styling**
- Consistent with `ProductsPage`'s category ticker treatment (same marquee/pill pattern) — good visual continuity between the two catalog pages.
- Correctly reuses the shared `ServiceGrid` component (unlike `ProductsPage`'s custom grid) — this page is the better reference implementation for how `/products` should work.

**Responsive**
- `ServiceGrid`'s `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6` is much better tuned for small screens (2-up instead of 3-up) than `ProductsPage`'s hand-rolled grid.

**Bugs / Security**
- None found specific to this page.

**Recommendations**
- Use this page as the template to fix `ProductsPage`'s grid/filter approach (see above).

---

## `/book-repair/:serviceId` — BookRepairPage (`BookRepairPage.tsx`)

**Styling**
- 4-step card layout mirrors `CheckoutPage`'s structure well (good cross-page consistency for multi-step forms).

**Responsive**
- Summary card correctly reorders (`lg:order-2` / `lg:order-1`) to appear above the form on mobile and beside it on desktop — nice touch, correctly implemented.

**Bugs / Security**
- Duplicated phone-normalization logic (see [01](./01-CRITICAL-ISSUES.md) A7).
- `fulfillment_type: 'dropoff'` is hardcoded with a comment `// Default to dropoff for now` — if pickup is a planned feature, there's no UI for the customer to choose it yet the backend field already models the choice; worth flagging to product/backend owners so the UI catches up.

**Recommendations**
- Extract shared phone-normalization util.
- Add a fulfillment-type selector (dropoff vs. pickup) if the backend already supports both.

---

## `/cart` — CartPage (`CartPage.tsx`) + `CartItem.tsx` / `CartSummary.tsx` / `EmptyCart.tsx`

**Styling**
- Clean, consistent with the rest of the shop — no major issues.

**Responsive**
- `CartItem` correctly stacks (`flex-col sm:flex-row`) on narrow screens.
- 70/30 desktop split (`lg:col-span-2` / `lg:col-span-1`) collapses cleanly to a single column below `lg`.

**Bugs / Security**
- None found.

**Recommendations**
- The quantity stepper markup (increment/decrement buttons + count) is duplicated near-identically across `CartItem.tsx`, `CartDrawer.tsx`, and `ProductDetail.tsx`. Consider extracting a small shared `QuantityStepper` component to guarantee visual/behavioral consistency and reduce triplicated code.

---

## `/checkout` — CheckoutPage (`CheckoutPage.tsx`)

**Styling**
- Best-organized page in the app: consistent 4-step `Card` sections, consistent use of `Input`/`Select`/`Button`.

**Responsive**
- Form fields correctly go `grid-cols-1 sm:grid-cols-2`; sticky order summary (`lg:sticky lg:top-24`) works well.

**Bugs / Security**
- See [01-CRITICAL-ISSUES.md](./01-CRITICAL-ISSUES.md) B1 (negative total possible), B2 (`selectedZone.name` typo), A2 (console.log of PII), A6/A7 (phone validation/normalization duplication).

**Recommendations**
- Highest-priority page to fix given it handles money and PII — see items above.

---

## `/order-success/:orderId` & `/booking-success/:bookingId`

**Styling**
- Both pages share an identical, well-executed "success hero + two detail cards + next-steps" structure — genuinely one of the more consistent pairs in the app. Good template to reuse for any future confirmation-style pages.

**Responsive**
- Fine at all sizes.

**Bugs / Security**
- None found beyond the shared M-Pesa/paybill copy needing to stay in sync with `CheckoutPage`'s instructions (currently consistent).

**Recommendations**
- None beyond what's covered elsewhere. This pair is a good reference for consistency.

---

## `/track-order` — TrackOrderPage (`TrackOrderPage.tsx`)

**Styling**
- Timeline visualization (vertical stepper with circular status indicators) is a nice, well-implemented pattern, duplicated consistently between the order and booking timelines.

**Responsive**
- Fine — single-column `max-w-3xl` layout works at all sizes.

**Bugs / Security**
- See [01-CRITICAL-ISSUES.md](./01-CRITICAL-ISSUES.md) A3 — potential IDOR: any logged-in user can type an arbitrary order/booking ID and see another customer's full name, phone, address, and order total, with no visible ownership check on the frontend.

**Recommendations**
- Flag to backend team to confirm ownership is enforced server-side; consider requiring an additional token (e.g., last 4 digits of phone, or the confirmation code from the success page) rather than a bare ID lookup.

---

## `/login`, `/register`, `/verify-phone`, `/forgot-password`

**Styling — inconsistent across the auth flow**
- `LoginPage` / `RegisterPage`: no container card — content floats directly on the page background, offset upward with `-mt-12`.
- `ForgotPasswordPage`: wrapped in a bordered, shadowed `Card` (`shadow-xl p-8`) — visually a completely different "boxed" treatment from its sibling auth pages.
- `VerifyPhonePage`: no `-mt-12` offset and no top padding at all, so it sits at a different vertical position than `LoginPage`/`RegisterPage` when navigated to directly.
- `LoginPage`/`RegisterPage` show a "BlueTech Portal" wordmark header (at two different sizes, `text-xl` vs `text-base`); `VerifyPhonePage` and `ForgotPasswordPage` don't show this wordmark at all.

**Responsive**
- All four are single-column, `max-w-md`, and behave fine across breakpoints individually — the issue is purely cross-page visual consistency, not per-page responsiveness.

**Bugs / Security**
- `ForgotPasswordPage`'s new-password field has no client-side validation at all (see [01](./01-CRITICAL-ISSUES.md) A5) despite a placeholder implying strong requirements.
- Phone normalization duplicated in `LoginPage`, `RegisterPage`, `ForgotPasswordPage` (see A7).

**Recommendations**
- Design one shared "auth shell" (same wordmark treatment, same container/card style, same vertical offset) and use it for all four pages.
- Apply the real password schema to `ForgotPasswordPage`.

---

## `/profile` — ProfilePage (`ProfilePage.tsx`)

**Styling**
- The most feature-rich page in the app (Overview/Orders/Repairs/Settings tabs, hero banner, points card) — generally well organized.
- Status-color mapping (`statusColor` record) is defined locally in this file only; `ProfilePageNew.tsx` (dead code) has none of this, another sign the two files have diverged significantly.

**Responsive**
- Tab bar (`flex gap-1 bg-slate-100 p-1 rounded-xl`) correctly hides labels on mobile (`hidden sm:inline`) and shows icon-only — good.
- Quick-action cards grid (`grid-cols-2 sm:grid-cols-4`) works well down to small phones.

**Bugs / Security**
- None found specific to this page beyond the general password-policy note (A5) — the actual password-change form here *does* use the correct 8-character `passwordSchema`, it's `ForgotPasswordPage` that doesn't match it.
- Note: **`src/pages/ProfilePageNew.tsx` is dead code that duplicates this page's route conceptually** — see [01-CRITICAL-ISSUES.md](./01-CRITICAL-ISSUES.md) C.

**Recommendations**
- Delete or clearly mark `ProfilePageNew.tsx` as a draft.

---

## `/points` — PointsPage (`PointsPage.tsx`) + `PointsCard.tsx`

**Styling**
- Clean, single-purpose page. `PointsCard`'s gradient balance card and progress bar are a nice visual highlight distinct from the rest of the mostly slate/blue palette — intentional-looking, not a stray inconsistency.

**Responsive**
- `max-w-lg` single column, fine at all sizes.

**Bugs / Security**
- None found.

**Recommendations**
- None beyond the global font-size note in [02](./02-RESPONSIVE-STYLING-SYSTEM.md) (several `text-[10px]`/`text-[11px]` labels in the history list).

---

## `/contact` — ContactPage (`ContactPage.tsx`)

**Styling**
- Well-structured two-column layout (contact info + hours / form).

**Responsive**
- Fine at all breakpoints.

**Bugs / Security**
- **The form does not submit anywhere** — see [01-CRITICAL-ISSUES.md](./01-CRITICAL-ISSUES.md) A1. This is the single most important fix on this page.

**Recommendations**
- Wire `onSubmit` to a real endpoint before anything else on this page.

---

## `/about` — AboutPage (`AboutPage.tsx`)

**Styling**
- Strong visual page overall — hero, stats, story, values, "why choose us," CTA — good use of the design system's card/gradient conventions.
- A `team` array (4 staff members with names/roles/tenure) is defined at the top of the file but **never rendered anywhere** in the JSX — looks like a "Meet the Team" section was planned and the data was added before the markup, then never finished (or the section was removed and the data left behind).

**Responsive**
- Values section thoughtfully implements two different layouts for mobile (2×2 grid of fixed-size square cards) vs. tablet+ (auto 4-column grid) — one of the more deliberately responsive sections in the app.
- Embedded OpenStreetMap `<iframe>` has no `title` attribute (accessibility: screen readers can't announce what the iframe contains) and no `loading="lazy"` (it will load immediately even though it's below the fold on first paint for most viewports).

**Bugs / Security**
- Dead `team` data (not a security issue, but worth cleaning up or finishing).
- Third-party iframe embed has no `sandbox` attributes — low risk given it's a fixed, trusted OpenStreetMap embed URL, but worth reviewing as a general practice for any embedded third-party content.

**Recommendations**
- Either render a "Meet the Team" section using the existing `team` data, or remove the unused array.
- Add `title="BlueTech store location map"` and `loading="lazy"` to the iframe.

---

## `/privacy-policy`, `/terms-of-service`, `/cookie-policy`

**Styling — the three legal pages don't match each other**
- `PrivacyPolicyPage`: icon-badge header (`bg-blue-100 rounded-full` icon next to `h1`), content wrapped in `shadow-sm` card, "Last updated: **July 2025**."
- `TermsOfServicePage` / `CookiePolicyPage`: breadcrumb-style header (`/ Terms of Service` text row above the `h1`, icon inline with the heading instead of badged), content wrapped in a card **without** a shadow, "Last updated: **July 2026**."

Three pages that are conceptually siblings (all reached from the same footer group) currently look like they were built by three different people at three different times — which, functionally, they likely were.

- The "Last updated" **dates disagree with each other by a year**, and the Privacy Policy's July 2025 date is now well over a year stale relative to today. This is a minor legal-hygiene issue worth a real content review, not just a styling one.

**Responsive**
- All three are fine responsively — `max-w-3xl` single column reads well on any screen size.

**Bugs / Security**
- None beyond the stale/inconsistent dates noted above.

**Recommendations**
- Pick one of the two header/card treatments and apply it to all three pages.
- Confirm and synchronize the actual "last updated" dates with legal/compliance.

---

## `/returns`, `/warranty`, `/faqs`

**Styling**
- All three follow the `TermsOfServicePage`/`CookiePolicyPage` breadcrumb-header pattern (good — these are more consistent with each other than the three legal pages above are).
- `WarrantyPage`'s tiered-card layout (color-coded `tiers` array) and `ReturnsPage`'s numbered-steps + eligible/not-eligible two-column layout are both clean, purpose-built patterns appropriate to their content.
- `FAQsPage` uses a simple accordion (category → expandable Q&A) — functional and unsurprising.

**Responsive**
- No issues found in any of the three.

**Bugs / Security**
- None found.

**Recommendations**
- None specific; these three are in reasonably good shape and could be the reference pattern to bring the three legal pages in line with (see above).
