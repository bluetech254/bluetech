# Global Styling System — `src/index.css` and Cross-Cutting Patterns

This is the layer that affects *every* page, so it's worth fixing before touching individual pages.

## 1. `border-radius: 0 !important` cancels the entire rounded-corner design

```css
@layer base {
  * {
    @apply transition-colors duration-200;
    border-radius: 0 !important;
  }
}
```

Nearly every component in the codebase uses Tailwind rounding utilities intentionally:
- `Card.tsx` → `rounded-xl`
- `Button.tsx` → `rounded-lg`
- `Badge.tsx` → `rounded-full`
- `Input.tsx` / `Select.tsx` → `rounded-lg`
- Modals, drawers, product images → `rounded-2xl`, `rounded-full`, etc.

The universal `!important` selector overrides **all of them, everywhere, with no exceptions** — including the pill-shaped category ticker buttons, the circular avatar/profile initials, the circular icon buttons, and the rounded product thumbnails. Unless this is a deliberate, temporary "sharp corners" art-direction choice, this single rule is almost certainly an accidental leftover (e.g., from a global reset experiment) that is currently making the entire app look different from how every component's own markup describes it.

**Recommendation:** Delete the `border-radius: 0 !important` line. If a squared-off aesthetic really is intended somewhere, apply it locally (a utility class on the specific elements) rather than globally with `!important`, so component-level `rounded-*` classes remain meaningful and toggleable.

## 2. Universal `transition-colors` on `*`

Same block also applies `transition-colors duration-200` to literally every DOM node. Combined with components that also set their own `transition-all` (e.g., `Button`, `Card` `hover` variant), you get doubled-up/overridden transition declarations and an actual (if small) performance cost from forcing every element in the tree to participate in the transition system, including elements that never change color (containers, wrappers, `<img>` tags).

**Recommendation:** Remove the universal rule and apply `transition-colors` only to interactive elements (already done individually in `Button`, links, etc.).

## 3. Breakpoint strategy is inconsistent

The app uses Tailwind's default `sm/md/lg/xl` scale (640/768/1024/1280px) almost everywhere — but not always:

- `ProductsPage.tsx` sidebar visibility: `hidden [@media(min-width:900px)]:block` — a **one-off custom 900px breakpoint** that doesn't correspond to any other breakpoint used in the app. Between 768px and 900px, this page's layout behaves differently from every other page (which switches at `md:` = 768px).
- Everywhere else — `Header`, `Footer`, `HomePage`, `ProductGrid`, `ServiceGrid` — consistently uses `md:` / `lg:` for the desktop/mobile switch.

**Recommendation:** Standardize on `lg:` (1024px) for the products sidebar too, matching the rest of the app's "main nav becomes desktop-only at `lg`" pattern, or explicitly document why 900px is special and add it to the Tailwind theme as a named breakpoint (e.g. `mdlg`) so it's intentional and reusable instead of an inline magic number.

## 4. Layout gutter: hardcoded `100px`, no centered max-width container

`Header.tsx`, `Footer.tsx`, `ProductsPage.tsx`, `ServicesPage.tsx` all repeat:
```
px-4 sm:px-6 lg:max-w-none lg:px-[100px] lg:mx-0
```
This sets a fixed 100px gutter on large screens but explicitly disables any `max-width` (`lg:max-w-none`) — meaning on a 4K or ultrawide monitor, content stretches to fill nearly the entire viewport with only 100px of padding on each side, rather than being centered in a comfortable reading-width container (e.g. `max-w-7xl mx-auto`). This is very likely not the intended look on large monitors — product grids and text lines will become uncomfortably wide.

It's also duplicated verbatim across 4+ files, so any future change to the site gutter has to be made in every one of them (and the negative-margin "bleed" tickers in `ProductsPage`/`ServicesPage`, e.g. `-mx-4 sm:-mx-6 lg:-mx-[100px]`, are directly coupled to this value — if it's edited in one place and not the other, the ticker bleed will misalign).

**Recommendation:** Extract a `Container`/`PageShell` component (or a single Tailwind utility class in `index.css`, e.g. `.page-gutter`) that encapsulates the padding + a sane `max-w-[1600px] mx-auto` (or similar) and use it everywhere instead of repeating the raw classes.

## 5. Duplicated `<style>` blocks / keyframes

`ShopByCategory.tsx` and `ServiceCategoriesScroll.tsx` each define their own **identical** inline `<style>` block:
```css
@keyframes shake { 0%, 100% { transform: translateX(0);} 25%{transform:translateX(-4px);} 75%{transform:translateX(4px);} }
.animate-shake { animation: shake 0.5s infinite; }
```
plus separate near-duplicate scroll-marquee keyframes (`scroll` vs `scroll-reverse`). `NewArrivals.tsx` also defines its own one-off `fadeInUp` keyframe inline. Meanwhile `index.css` already has a large, well-organized `@keyframes` section — these three components should be defining their animations there instead of re-declaring CSS inline on every render.

**Recommendation:** Move all keyframes into `index.css`'s existing animation section; keep components free of `<style>` tags.

## 6. Typography scale: sizes below comfortable reading size

Across `ServiceCard.tsx`, `PointsCard.tsx`, order/booking status badges, and various metadata labels, arbitrary sizes below Tailwind's smallest named size (`text-xs` = 12px) are common: `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]`. On `ServiceCard`, the responsive stack goes as low as `text-[8px] md:text-[9px] lg:text-xs` for duration/warranty metadata — meaning the *smallest* screens (where legibility matters most) get the *smallest* text. This is a real accessibility concern (WCAG guidance is ~16px for body text, with 12px treated as a practical floor for secondary text).

**Recommendation:** Establish a floor of `text-[10px]`/`text-xs` for any user-facing text and reserve anything smaller for truly decorative elements (if any). Prefer scaling *up* on smaller screens for metadata that's currently below 10px.

## 7. Negative-margin "bleed" pattern used as a spacing crutch

Instances found: `HomePage.tsx` (`-mx-4 sm:-mx-6`, `-mb-2`), `ShopByCategory.tsx` (`-mt-12`), `Hero.tsx`/`SideCarousel.tsx` (`-mt-8`), `LoginPage.tsx`/`RegisterPage.tsx` (`-mt-12`), `FeaturedProducts.tsx` (`-mt-2.5`), `ProfilePageNew.tsx` (`-mt-8`), `ProductsPage.tsx`/`ServicesPage.tsx` tickers (`-mx-4 sm:-mx-6 lg:-mx-[100px]`).

Using negative margins to pull a section flush against its container edge, or to reduce accidental double-spacing between stacked sections, is a legitimate technique — but this many independent, uncoordinated instances (each with its own hand-tuned pixel value) suggests the app doesn't have an agreed vertical-rhythm/spacing scale, and each section was nudged into place by trial and error. This is brittle: content-length changes, a font-size bump, or a container width change elsewhere can silently reintroduce the gap these hacks were compensating for.

**Recommendation:** Define a vertical-rhythm scale (e.g., section spacing lives on the parent via `space-y-*` only, not on children via negative margins) and a single "full-bleed" utility for edge-to-edge sections, rather than one-off negative margins per component.

## 8. Two competing spacing idioms: `space-x-*`/`space-y-*` vs. `gap-*`

Both are used heavily and inconsistently within the same component types (e.g. `Header.tsx` uses `space-x-2` for the logo but `gap-*`-free flex rows elsewhere; `PointsCard.tsx` mixes both in adjacent blocks). Not a bug, but a consistency/maintainability nit — pick one idiom (recommend `gap-*`, since it composes better with `flex-wrap` and doesn't leak margin onto the last/first child) and standardize.
