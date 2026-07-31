# BlueTech Kenya Admin — Security & Styling Audit

**Date:** 2026-07-31  
**Scope:** Full codebase review of `admin/` (Next.js 14, App Router)

---

## Security Issues

### SEC-01 · Session cookie not httpOnly ✅ FIXED
**File:** `app/api/auth/route.ts`  
**Severity:** Critical  
The `admin_session` cookie was set with `httpOnly: false`, making the JWT token readable via `document.cookie` from any JavaScript running on the page. A single XSS vector would expose every admin session.  
**Fix:** Set `httpOnly: true` on the cookie.

---

### SEC-02 · Bare `JSON.parse` on cookie value — crash on malformed input ✅ FIXED
**Files:** `app/api/auth/list/route.ts`, `create-admin/route.ts`, `change-password/route.ts`, `deactivate/[id]/route.ts`, `app/api/proxy/[...path]/route.ts`  
**Severity:** High  
Every route called `JSON.parse(raw)` without a try/catch. A tampered or corrupted cookie value would throw an unhandled exception, crashing the route handler and returning a 500 with a stack trace.  
**Fix:** Wrapped all cookie reads in a `getToken()` helper with try/catch that returns `null` on failure, then returns 401.

---

### SEC-03 · Proxy route had no authentication gate ✅ FIXED
**File:** `app/api/proxy/[...path]/route.ts`  
**Severity:** High  
The proxy forwarded requests to the backend even when no valid session cookie was present — it would just omit the `Authorization` header. Any unauthenticated caller could probe backend endpoints directly through the proxy.  
**Fix:** Added an explicit `if (!token) return 401` guard before any upstream fetch.

---

### SEC-04 · Proxy leaked raw error messages to client ✅ FIXED
**File:** `app/api/proxy/[...path]/route.ts`  
**Severity:** Medium  
On fetch failure, the catch block returned `{ detail: err.message }` — exposing internal network topology, hostnames, or stack details to the browser.  
**Fix:** Returns a generic `{ detail: "Proxy error" }` with status 502.

---

### SEC-05 · Middleware did not protect `/api/proxy/*` ✅ FIXED
**File:** `middleware.ts`  
**Severity:** Medium  
The middleware bypass list included `/api/auth/*` (correct) but the proxy route `/api/proxy/*` was not in the matcher exclusion — however the middleware was also not explicitly protecting it either, relying solely on the proxy's own (broken) auth. Combined with SEC-03 this was a full bypass.  
**Fix:** SEC-03 fix makes the proxy self-protecting; middleware now uses a single-line condition for clarity.

---

### SEC-06 · Wildcard image hostname in `next.config.js` ✅ FIXED
**File:** `next.config.js`  
**Severity:** Medium  
`hostname: "**"` allows Next.js Image Optimization to proxy and cache images from any URL on the internet. This can be abused to proxy malicious content through your domain or exhaust bandwidth/cost.  
**Fix:** Scoped to `*.supabase.co` and `*.supabase.in` only. Add other specific hostnames as needed.

---

### SEC-07 · `SUPABASE_SERVICE_ROLE_KEY` in `.env.local.example` ✅ FIXED
**File:** `.env.local.example`  
**Severity:** Medium  
The example env file included a `SUPABASE_SERVICE_ROLE_KEY` placeholder. This key bypasses all Supabase Row Level Security. Including it in the example normalises its presence and risks developers accidentally committing it or exposing it via a `NEXT_PUBLIC_` variable.  
**Fix:** Removed the key entirely and replaced with a comment explaining it is not needed in this project.

---

### SEC-08 · `NEXT_PUBLIC_API_URL` used as proxy base — no validation
**File:** `app/api/proxy/[...path]/route.ts`  
**Severity:** Low / Informational  
If `NEXT_PUBLIC_API_URL` is undefined at runtime, the proxy constructs `undefined/api/v1/...` and the fetch will throw. There is no startup validation.  
**Recommendation:** Add a build-time check or assert the env var is set at module load:
```ts
const BASE = process.env.NEXT_PUBLIC_API_URL;
if (!BASE) throw new Error("NEXT_PUBLIC_API_URL is not set");
```

---

### SEC-09 · No rate limiting on login endpoint
**File:** `app/api/auth/route.ts`  
**Severity:** Low / Informational  
The login route proxies credentials to the backend with no rate limiting at the Next.js layer. Brute-force protection relies entirely on the FastAPI backend.  
**Recommendation:** Add an edge-compatible rate limiter (e.g. `@upstash/ratelimit`) on the login route, or ensure the backend enforces account lockout.

---

### SEC-10 · `admin_session` cookie stores full session payload including `full_name` and `role`
**File:** `app/api/auth/route.ts`, `app/(app)/layout.tsx`  
**Severity:** Low / Informational  
The cookie stores `{ token, exp, full_name, role }`. With `httpOnly: true` (now fixed) this is safe from JS access, but the payload is not signed or encrypted — it can be decoded by the browser (it's just JSON, not a JWT). The `role` field read from the cookie in `layout.tsx` is used to conditionally show the "Admin Accounts" nav item. This is UI-only gating; the backend must enforce role checks on every request (which it does via the JWT). No code change needed, but worth documenting.

---

## Styling Issues

### STY-01 · `select-field` missing `w-full` ✅ FIXED
**File:** `app/globals.css`  
Select elements using `.select-field` did not inherit full width, causing them to size to their content. Pages were using inline `!w-auto` or wrapping hacks to compensate.  
**Fix:** Added `w-full` to the `.select-field` component class.

---

### STY-02 · `nav-item-active` hover state overrides white text ✅ FIXED
**File:** `app/globals.css`  
`.nav-item` sets `hover:text-ink` which applies on hover even when `.nav-item-active` is also present (since both classes are on the element). Active nav items would flash from white to dark on hover.  
**Fix:** Added `hover:text-white` to `.nav-item-active` to win the specificity race.

---

### STY-03 · `StatCard` change pill logic bug — gradient branch always renders white ✅ FIXED
**File:** `components/ui/StatCard.tsx`  
The `clsx` call had:
```ts
positive ? "bg-good/20 text-good" : "bg-bad/20 text-bad",
gradient && (positive ? "bg-white/20 text-white" : "bg-white/20 text-white")
```
Both branches of the inner ternary were identical (`bg-white/20 text-white`), so on gradient cards the positive/negative distinction was lost — both showed the same white pill.  
**Fix:** Collapsed to a single ternary: `gradient ? "bg-white/20 text-white" : positive ? "bg-good/20 text-good" : "bg-bad/20 text-bad"`.

---

### STY-04 · `main` content area missing `overflow-x-hidden` ✅ FIXED
**File:** `app/(app)/layout.tsx`  
Wide tables or charts on narrow viewports could cause horizontal scroll on the entire page rather than being clipped within the content area.  
**Fix:** Added `overflow-x-hidden` to the `<main>` element.

---

### STY-05 · Sidebar not responsive — fixed `w-[260px]` with no mobile breakpoint
**File:** `components/layout/Sidebar.tsx`  
**Status:** Not fixed — requires design decision  
The sidebar is always `w-[260px]` with no collapse/drawer behaviour on mobile. On small screens the layout breaks.  
**Recommendation:** Add a hamburger toggle and a mobile drawer (e.g. using a `translate-x` transition) or use `hidden lg:flex` on the sidebar and a mobile nav alternative.

---

### STY-06 · `card-gradient` in Sidebar uses `text-white` but no explicit icon colour
**File:** `components/layout/Sidebar.tsx`  
**Status:** Informational  
The `<Sparkles>` icon inside the promo card inherits `text-white` from the parent correctly, but has `opacity-90` applied directly. This is fine but inconsistent with how other icons use explicit colour classes. No functional issue.

---

## Summary Table

| ID | Category | Severity | Status |
|----|----------|----------|--------|
| SEC-01 | Cookie not httpOnly | Critical | ✅ Fixed |
| SEC-02 | Bare JSON.parse crash | High | ✅ Fixed |
| SEC-03 | Proxy unauthenticated | High | ✅ Fixed |
| SEC-04 | Proxy error message leak | Medium | ✅ Fixed |
| SEC-05 | Middleware proxy gap | Medium | ✅ Fixed |
| SEC-06 | Wildcard image hostname | Medium | ✅ Fixed |
| SEC-07 | Service role key in example | Medium | ✅ Fixed |
| SEC-08 | No env var validation | Low | Open |
| SEC-09 | No login rate limiting | Low | Open |
| SEC-10 | Role gating is UI-only | Info | Accepted |
| STY-01 | select-field no w-full | Medium | ✅ Fixed |
| STY-02 | nav-item-active hover text | Low | ✅ Fixed |
| STY-03 | StatCard pill logic bug | Low | ✅ Fixed |
| STY-04 | main overflow-x-hidden | Low | ✅ Fixed |
| STY-05 | Sidebar not responsive | Medium | Open |
| STY-06 | Sparkles icon opacity | Info | Accepted |
