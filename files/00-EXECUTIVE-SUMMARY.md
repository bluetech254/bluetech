# BlueTech Client — Frontend Deep Audit
**Scope:** `client/` — React 19 + TypeScript + Tailwind CSS v4 + Vite, 91 source files, ~9,500 LOC, 25 pages, 38 components.

This audit covers: responsive/screen-size behavior, security, styling consistency, dead code, and functional bugs found while reading every file in the codebase. Full detail lives in the numbered files in this folder; this page is the triage list.

---

## 🔴 Critical — fix first

| # | Issue | Where | Why it matters |
|---|---|---|---|
| 1 | Global CSS forces `border-radius: 0 !important` on every element | `src/index.css` (`@layer base { * {...} }`) | Silently cancels every `rounded-*` Tailwind class in the entire app (Buttons, Cards, Badges, Inputs, modals — everything). The whole app almost certainly does **not** render as designed. See [02](./02-RESPONSIVE-STYLING-SYSTEM.md). |
| 2 | Contact form does not send anywhere | `ContactPage.tsx` | `onSubmit` just runs a `setTimeout` and shows a fake success toast. No API call exists. Every message a customer "sends" is silently discarded. |
| 3 | Checkout points-redemption can produce a **negative total** | `CheckoutPage.tsx` | `pointsDiscount` is the user's whole points balance with no cap vs. subtotal, and `grandTotal = subtotal - pointsDiscount + deliveryFee` is never clamped to 0. |
| 4 | Dead-code duplicate Profile page | `src/pages/ProfilePageNew.tsx` | 242-line full alternate implementation of `/profile`, not imported anywhere, visually inconsistent with the real one. Confusing and risky for future edits. |
| 5 | `ProductFilters.tsx` component is entirely unused | `src/components/products/ProductFilters.tsx` | 165 lines of dead code (sort/category/price filter panel) never imported by any page. |
| 6 | `FilterSidebar`'s Condition / Brand / Rating filters are decorative | `src/components/products/FilterSidebar.tsx` | State is tracked (`condition`, `selectedBrand`, `minRating`) but never included in the payload sent to `onChange`/`handleApply`. Users pick a filter, click "Apply," nothing happens. |
| 7 | `selectedZone.name` typo | `CheckoutPage.tsx` | `DeliveryZone` type only has `zone_name`, not `name` → renders blank ("Shipping with `` standard rates."). |
| 8 | Promotional deals carousel references an undefined field | `PromotionalDealsCarousel.tsx` | Renders `{deal.discount}` in a badge, but `discount` is never set when the deal objects are built → every badge shows `undefined`. |
| 9 | Production API URL hardcoded in a component | `src/components/home/ServiceCategories.tsx` | Bypasses the shared `api` client and `API_BASE_URL` env config with a raw `fetch('https://bluetechnology-y1f8.onrender.com/...')`. Breaks local/staging environments and skips auth/interceptor handling. |

## 🟠 High priority

- 3 columns of tiny product cards forced on the smallest phones on `/products` (`grid-cols-3` with no mobile override) — cramped, inconsistent with the reusable `ProductGrid` component that every other page uses correctly.
- Client-side-only filtering/pagination on `/products` after fetching up to 200 products, re-filtered 13 separate times for the section carousels on every render — real performance risk on low-end phones.
- Inconsistent phone-number validation regex across 5 forms (some accept `07…`/`254…`, others require strict `254XXXXXXXXX`).
- Password policy inconsistency: register requires 6 chars, change-password requires 8, forgot-password enforces nothing client-side despite a placeholder claiming complexity rules.
- `console.log('Sending order:', orderPayload)` — full customer PII (name, phone, email, address) logged to the browser console in the checkout flow.
- `TrackOrderPage` lets any logged-in user look up **any** order/booking by guessing an ID and see another customer's name, phone, address and totals — no ownership check visible on the frontend (needs backend enforcement, but the UI invites probing).
- Two components both render a "service categories" home section with near-duplicate logic and copy-pasted inline `<style>` keyframes (`ServiceCategories.tsx` vs. `ServiceCategoriesScroll.tsx`).
- A custom, one-off Tailwind breakpoint `[@media(min-width:900px)]:block` on `ProductsPage` breaks from the standard `sm/md/lg/xl` scale used everywhere else, creating a dead zone between 768–900px.

## 🟡 Medium / polish

- Extremely small type sizes (`text-[8px]`, `text-[9px]`, `text-[10px]`) used throughout `ServiceCard`, badges, and timestamps — below comfortable/accessible reading size on mobile.
- Hover states that `scale-125 -translate-y-8` on category cards in a horizontal row cause them to visually overlap neighboring cards/content.
- Legal pages (`Privacy`, `Terms`, `Cookie`) each use a different header layout and a different "last updated" date format/value (one says July 2025, two say July 2026).
- Duplicated phone-normalization logic (strip leading 0, prefix 254) copy-pasted in 4 separate pages instead of one shared util.
- Heavy use of negative-margin "bleed" hacks (`-mx-4 sm:-mx-6 lg:-mx-[100px]`, `-mt-8`, `-mt-12`, `-mb-2`) to compensate for section spacing instead of a consistent vertical rhythm/spacing scale.
- `Header`/`Footer` use a hardcoded arbitrary `lg:px-[100px]` gutter with no centered `max-w-*` container — on very wide (4K/ultrawide) monitors the content will hug the edges rather than sit centered.

## What's already solid

- Auth token stored in `sessionStorage` (not `localStorage`) with expiry handling and a 401 interceptor that clears it — reasonable baseline.
- Zod schemas + `react-hook-form` used consistently for most forms.
- No `dangerouslySetInnerHTML`, no `eval`, no hardcoded secrets/API keys found anywhere in the client bundle.
- Cart persistence, stock-quantity guards, and empty-state components are implemented thoughtfully.
- Good use of skeleton loading states (`ProductGrid`, `ServiceGrid`) and lazy image loading on product cards.

---

## Files in this audit

1. **[01-CRITICAL-ISSUES.md](./01-CRITICAL-ISSUES.md)** — full detail on every bug and security item above, with code references.
2. **[02-RESPONSIVE-STYLING-SYSTEM.md](./02-RESPONSIVE-STYLING-SYSTEM.md)** — the global CSS/design-token layer, breakpoint strategy, spacing, typography.
3. **[03-PAGE-BY-PAGE-AUDIT.md](./03-PAGE-BY-PAGE-AUDIT.md)** — every one of the 25 pages, each broken into Styling / Responsive / Bugs & Security / Recommendations.
4. **[04-COMPONENT-LIBRARY-AUDIT.md](./04-COMPONENT-LIBRARY-AUDIT.md)** — the 38 components grouped by folder (common, layout, home, products, cart, services, points).
5. **[05-RECOMMENDATIONS-PRIORITIZED.md](./05-RECOMMENDATIONS-PRIORITIZED.md)** — a sequenced action plan (quick wins → structural fixes).
