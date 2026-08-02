# Prioritized Action Plan

## Step 1 — Quick wins (a few hours, huge visual impact)
1. Delete `border-radius: 0 !important` from `src/index.css` (`@layer base { * {...} }`). This alone likely fixes the appearance of every rounded button, card, badge, avatar, and modal in the app. **Do this first and re-screenshot the app before doing anything else** — a lot of the "styling inconsistency" work below may look different once this is fixed.
2. Remove the universal `* { transition-colors }` from the same block; scope transitions to interactive elements only.
3. Fix `selectedZone.name` → `selectedZone.zone_name` in `CheckoutPage.tsx`.
4. Remove the `console.log('Sending order:', ...)` / `console.error('Error response:', ...)` PII logging in `CheckoutPage.tsx`.
5. Fix or remove the `{deal.discount}` badge in `PromotionalDealsCarousel.tsx`.
6. Delete the two dead files: `src/pages/ProfilePageNew.tsx` and `src/components/products/ProductFilters.tsx` (or clearly mark as WIP/exclude from build).

## Step 2 — Trust & correctness (before next release)
7. Wire `ContactPage.tsx`'s form to a real backend endpoint.
8. Clamp checkout totals: `Math.min(pointsBalance, subtotal)` for the discount, `Math.max(0, grandTotal)` for the final total.
9. Replace the hardcoded production `fetch(...)` URL in `ServiceCategories.tsx` with `getRepairServices()` from `api/services.ts`.
10. Decide the fate of `FilterSidebar`'s Condition/Brand/Rating controls — wire them up or remove them; half-working filters erode trust in the rest of the filtering system.
11. Confirm with backend that `/orders/:id` and `/bookings/:id` (used by `TrackOrderPage`) enforce ownership — this is a potential customer-data exposure if not.

## Step 3 — Consistency pass (design system)
12. Extract a shared `PageShell`/`Container` component or utility class for the `px-4 sm:px-6 lg:px-[100px]` gutter + a real `max-w-*` centering constraint; replace all 4+ duplicated instances.
13. Standardize the `/products` sidebar breakpoint from the custom `900px` to `lg:` (1024px), matching the rest of the app.
14. Move all component-local `<style>` keyframe blocks (`ShopByCategory`, `ServiceCategoriesScroll`, `NewArrivals`) into `index.css`'s existing keyframes section.
15. Extract one `<RotatingPosterCard>` component to replace the three near-duplicate implementations (`MarketingPosters`'s two poster blocks, `PremiumProductsPoster`, `ExpertServicesPoster`).
16. Extract one `<QuantityStepper>` component to replace the three duplicated quantity-picker implementations (`CartItem`, `CartDrawer`, `ProductDetail`).
17. Give all four auth pages (`Login`, `Register`, `VerifyPhone`, `ForgotPassword`) one shared shell (same header treatment, same container style, same vertical offset).
18. Align the three legal pages (`Privacy`, `Terms`, `Cookie`) to one header/card treatment and fix the mismatched "last updated" dates.
19. Consolidate phone-normalization logic into one `utils/phone.ts` helper; consolidate phone/password validation schemas so every form uses the same rule for the same real-world constraint.

## Step 4 — Responsiveness fixes
20. Rebuild `ProductsPage`'s product grid to match `ProductGrid.tsx`'s mobile horizontal-scroll pattern instead of forcing `grid-cols-3` on the smallest phones.
21. Move `ProductsPage` filtering/pagination server-side using the filter params `api/products.ts` already supports.
22. Reduce/guard the extreme small-text instances (`text-[8px]`–`text-[10px]`) in `ServiceCard`, badges, and metadata labels — set a practical floor.
23. Replace `PromotionalDealsCarousel`'s hardcoded-pixel-offset scroll math with native `overflow-x-auto` + `scrollBy`/snap, matching `SectionCarousel`/`ProductGrid`.
24. Soften the `scale-125 -translate-y-8` hover effect on `ShopByCategory`/`ServiceCategoriesScroll` cards so hovered cards don't overlap their neighbors.

## Step 5 — Performance
25. Memoize the 13 per-flag `.filter()` calls on `ProductsPage` (one `useMemo` computing all category buckets at once, or per-flag `useMemo`s) instead of recomputing them on every render.
26. Stop double-mounting `FeaturedServices` on `HomePage` (currently rendered once for mobile, once for desktop, firing two API calls) — make the single component internally responsive instead.
27. Add a dedicated "related products" backend query for `ProductDetailPage` instead of fetching up to 200 products per page view.

---

### Suggested order of work
Steps 1 and 2 are cheap and directly visible/trust-affecting — do them first, ideally in a single PR, and re-review the whole app visually afterward (fixing the border-radius rule especially will change how "inconsistent" many components look, since much of what reads as inconsistency today may just be every rounded element rendering square). Steps 3–5 are larger refactors best tackled incrementally, one component/page at a time, using the "reference implementations" called out in this audit (`ServicesPage`/`ServiceGrid` for grids, `PointsCard` for reusable variant-driven components, `OrderSuccessPage`/`BookingSuccessPage` for consistent confirmation-page structure).
