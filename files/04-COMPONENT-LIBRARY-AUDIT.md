# Component Library Audit (by folder)

## `components/common/` — Badge, Button, Card, ErrorBoundary, Input, Loading, ProtectedRoute, Select

This is the app's actual design-system layer, and it's reasonably well built:
- `Button.tsx` has a clean variant system (`primary/secondary/outline/danger/icon`) with consistent disabled/loading states.
- `Input.tsx` / `Select.tsx` share the same border/focus/error visual language.
- `Card.tsx` supports `base/hover/interactive` variants cleanly.

**Issues**
- Because of the global `border-radius: 0 !important` (see [02](./02-RESPONSIVE-STYLING-SYSTEM.md)), every one of these components' intended rounding (`rounded-lg`, `rounded-xl`, `rounded-full`) currently renders as square corners everywhere. This is the single highest-leverage fix in the whole app — fixing the one global rule fixes the *intended* appearance of every component that uses this library.
- **The design system is inconsistently adopted.** A large number of one-off `<button>` elements across `home/`, `products/`, and `services/` components hand-roll their own Tailwind classes instead of using `Button`. This means `Button`'s focus rings, disabled states, and loading spinner behavior don't apply to a meaningful fraction of the app's clickable elements (marketing CTAs on the homepage, "Book Now" cards, category ticker pills, etc.). Recommend an incremental pass converting these to `<Button>` where practical.
- `Loading.tsx`'s full-screen brand mark renders "Tech" in `text-purple-600`, while every other brand mark in the app (`Header`, `Footer`, `MobileNav`, `LoginPage`) renders "Tech" in `text-blue-600`. Minor but visible brand-color inconsistency on every full-screen loading state.
- `Button`'s prop types include `onClick?: any`, which defeats TypeScript's type checking for the most commonly used prop on the most commonly used component in the app. Worth tightening to `React.MouseEventHandler<HTMLButtonElement>`.

## `components/layout/` — Header, Footer, MobileNav, BottomTabBar, CartDrawer, SearchModal

- `Header.tsx` is `h-14` (56px) fixed height with a `sticky top-0`; on mobile it adds an extra search bar row below it (`lg:hidden w-full ... px-1 py-1 -mt-1`) using a small negative margin to tuck up against the header — functional, but combined with the sticky header this creates a two-tier sticky element whose combined height varies by breakpoint. Any other component that needs to offset for "space below the fixed header" (e.g. `sticky top-24` used throughout cart/checkout/sidebar components) is using a value that doesn't actually derive from the header's real height — it's a guessed constant repeated across many files (`top-24` appears in `FilterSidebar`, `CartSummary`, `ProfilePage`'s hero, `TrackOrderPage`'s cards, etc.). If the header height ever changes, every one of these `top-24` instances needs to be found and updated by hand.
- `BottomTabBar.tsx` is a fixed `h-12` (48px) bar with `text-[10px]` labels — quite cramped; on devices with larger OS font-scaling settings (accessibility "larger text" mode) these labels are likely to wrap or clip inside a fixed-height flex row. Consider a `min-h-12` instead of a hard `h-12`, and bump the label size slightly.
- `MobileNav.tsx` and `CartDrawer.tsx` both implement a right-side sliding drawer with a backdrop, but with different structural patterns (`MobileNav` puts everything in one `fixed` wrapper; `CartDrawer` nests an extra `pointer-events-none`/`pointer-events-auto` wrapper layer). Not wrong, but two different implementations of "slide-over drawer" is exactly the kind of thing worth consolidating into one shared `<Drawer>` primitive that both `MobileNav` and `CartDrawer` (and any future drawer) build on — would guarantee consistent animation timing, backdrop opacity, and focus-trap behavior.
- `SearchModal.tsx` correctly debounces (`useDebounce`, 300ms) before querying — good practice, no notes.
- Both `MobileNav`'s backdrop and `CartDrawer`'s backdrop use hardcoded `bg-slate-900/55` and `bg-slate-900/60` respectively — a very minor inconsistency (5% opacity difference) but easy to align.

## `components/home/` — Hero, MarketingPosters, PremiumProductsPoster, ExpertServicesPoster, ServiceCategories, ServiceCategoriesScroll, ShopByCategory, FeaturedProducts, FeaturedServices, NewArrivals, HowItWorks, PromotionalDealsCarousel, SideCarousel

This is the folder with the most duplication and the most bugs (see [01-CRITICAL-ISSUES.md](./01-CRITICAL-ISSUES.md) for the specific bug list). Structurally:

- **`PremiumProductsPoster.tsx` and `ExpertServicesPoster.tsx` are near-identical to two of the three poster blocks inside `MarketingPosters.tsx`** (same rotating-image-background poster card, same overlay, same CTA button) — it looks like `MarketingPosters` was refactored out of the two standalone poster components (or vice versa) but the originals were never removed, and now three components maintain three copies of essentially the same "poster card" markup and rotation logic (`setInterval` + `% images.length`), each with its own local `useState`/`useEffect` pair.
- **Recommendation:** extract one `<RotatingPosterCard images={...} title={...} description={...} ctaLabel={...} onClick={...} />` component and use it in all three places (`MarketingPosters` would just render two of them side by side).
- `ServiceCategoriesScroll.tsx` and `ShopByCategory.tsx` both implement an auto-scrolling marquee row of cards with an identical hover interaction (`scale-125 -translate-y-8 animate-shake`) that, in a horizontally packed row, causes a hovered card to visually overlap its neighbors and any content above/below the row (a 125% scale + 32px upward translate on an element that's part of a tightly packed flex row will overlap adjacent siblings almost by definition). This is a real visual bug, not just a style preference — recommend replacing with a more modest hover treatment (e.g. `scale-105` with a subtle shadow) that doesn't require the card to leave its layout box.
- Both of the above also each define their own copy of the `shake` keyframes inline — consolidate into `index.css` (see [02](./02-RESPONSIVE-STYLING-SYSTEM.md) §5).
- `PromotionalDealsCarousel.tsx` computes slide position with a hardcoded pixel offset (`translateX(-${scrollPosition * 176}px)`) tied to the assumption that each card is exactly `w-40` (160px) + `gap-4` (16px) = 176px. This math has no responsive fallback — on very narrow phones where a 160px+ card doesn't leave room for peeking at the next card, the carousel will still assume the same 176px step, meaning the computed position may not correspond to what's actually visible. Every other horizontally-scrolling section in the app instead uses native `overflow-x-auto` + `scrollBy`/CSS `snap-x` (see `SectionCarousel.tsx`, `ProductGrid.tsx`, `NewArrivals.tsx`) which naturally adapts to any card width — this component should follow the same pattern instead of hand-computing pixel transforms.

## `components/products/` — FilterSidebar, ProductFilters, ProductCard, ProductDetail, ProductGrid, SectionCarousel

- **`ProductFilters.tsx` is entirely dead code** (see [01](./01-CRITICAL-ISSUES.md) C) — not used by any page.
- **`FilterSidebar.tsx` has non-functional filter fields** (see [01](./01-CRITICAL-ISSUES.md) B4).
- `ProductCard.tsx` truncates the product name to its first 4 words in JS (`name.split(' ').slice(0,4).join(' ')`) *and* wraps the `<h3>` in `line-clamp-1` CSS truncation at the same time — two different truncation strategies stacked on top of each other. For a long single-word name (no spaces) or a 4-word name that's still too wide for the container, the CSS `line-clamp-1` will still kick in and add an ellipsis after the JS-truncated text, which can look like `"Wireless Bluetooth Headphones Pro…"` when the actual product name might not need any truncation at that width. Recommend picking one strategy (CSS `line-clamp` alone is simpler and adapts to any container width).
- `ProductGrid.tsx` is the correctly-implemented "mobile horizontal scroll / desktop grid" pattern that `ProductsPage.tsx` should be reusing instead of its own custom grid (see [03](./03-PAGE-BY-PAGE-AUDIT.md)).

## `components/cart/` — CartItem, CartSummary, EmptyCart, MpesaWaitingModal

- Well-implemented overall. `MpesaWaitingModal.tsx`'s polling loop (`setInterval` every 3s, cleaned up correctly on unmount) is a solid pattern.
- The quantity-stepper markup (decrement/count/increment buttons) is duplicated near-verbatim in `CartItem.tsx`, `CartDrawer.tsx`, and `ProductDetail.tsx` — three independent implementations of the same control. Extracting a shared `<QuantityStepper value={qty} min={1} max={stock} onChange={...} />` would reduce ~60 lines of duplicated JSX/logic to one component used three times, and guarantee any future visual tweak (e.g., button size, disabled-state color) applies everywhere at once.

## `components/services/` — ServiceCard, ServiceFilters, ServiceGrid

- `ServiceCard.tsx`'s responsive type scale bottoms out at `text-[8px]` for duration/warranty metadata on mobile (see [02](./02-RESPONSIVE-STYLING-SYSTEM.md) §6) — the most extreme instance of the small-text issue found anywhere in the codebase.
- Otherwise clean and consistent with `ProductCard`'s general visual language (category badge, price block, CTA button).

## `components/points/` — PointsCard

- Single well-built component reused correctly in both `compact` (profile sidebar) and `full` (dedicated `/points` page) variants via a single `variant` prop — a good example of a component built for reuse from the start, worth using as the template for other "reused in two contexts" components in the app.
