# BlueTech Visitor & Funnel Tracking — Build Plan

_Created: 2026-11-20_

## Ground truth

- `page_views`, `sessions`, `cart_events`, `booking_intent` — tables do not exist in production DB. Each gets its own migration.
- Link clicks (`link_clicks` / `link_destinations`) already work via `/go/{slug}` redirects.
- Client is Vite + React SPA with React Router — all page transitions are client-side, so we instrument at the router level, not `window.onload`.
- Backend is FastAPI. All new tracking endpoints are fire-and-forget (client does not wait for a response).
- Admin daily ops has 5 tabs: Operations / Leads / Logistics / Cash / EOD. We add a **Traffic** tab.

---

## Feature map

| # | Feature | Status |
|---|---------|--------|
| F1 | Website visitor tracking | 🔲 next |
| F2 | Purchase funnel (cart events) | 🔲 |
| F3 | Booking intent — service wishlist (Option A) | 🔲 |
| F4 | Booking intent — request callback (Option A→B hybrid) | 🔲 |
| F5 | Daily Ops Traffic tab (surfaces F1 + F2 + F3 + link clicks) | 🔲 |
| F6 | Social & referrer breakdown in Traffic tab | 🔲 |

Dependencies: F1 → F2, F3 → F4 → F5 → F6

---

## F1 — Website Visitor Tracking

**Goal:** Every page load on the client fires a lightweight background ping.
Track unique sessions per day, pages visited, referrer, device type.
Zero impact on page load — fire and forget.

### DB migration `033_visitor_tracking.sql`

```sql
-- one row per browser session (keyed by anonymous uuid in sessionStorage)
CREATE TABLE visitor_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   TEXT NOT NULL UNIQUE,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    referrer     TEXT,         -- document.referrer on first page load
    utm_source   TEXT,         -- ?utm_source=
    utm_medium   TEXT,         -- ?utm_medium=
    utm_campaign TEXT,         -- ?utm_campaign=
    device_type  TEXT,         -- mobile | tablet | desktop
    page_count   INT NOT NULL DEFAULT 1
);

-- one row per page navigation
CREATE TABLE page_views (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    path       TEXT NOT NULL,  -- e.g. /products, /services
    referrer   TEXT,
    viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Backend `analytics/router.py`

- `POST /api/v1/analytics/page-view` — public, no auth. Receives `{session_id, path, referrer, device_type, utm_source, utm_medium, utm_campaign}`. Upserts session row + inserts page_view row.
- `GET /api/v1/analytics/today` — admin JWT required. Returns: unique sessions, total page views, top 10 pages, top referrers, hourly session breakdown.

### Client `src/lib/analytics.ts`

- On app load: generate or retrieve `session_id` from `sessionStorage`
- Detect `device_type` from `navigator.userAgent`
- Parse `utm_*` params from URL on first load
- Export `trackPageView(path)` — posts to backend in background, never throws

### Client `src/App.tsx`

- `useEffect` on `location.pathname` → calls `trackPageView(path)`
- One line of instrumentation

### Admin daily ops — Traffic tab (F1 portion)

- Stat cards: unique visitors today, total page views, avg pages/session
- Top 5 pages table
- Referrer breakdown (direct / google / instagram / etc.)
- Hourly sparkline of sessions through the day

### Tests

1. Open client → DB has a row in `visitor_sessions` and `page_views`
2. Navigate 3 pages → `page_count` increments on the session row
3. Open a second tab → new `session_id` → second session row
4. Admin Traffic tab → numbers match DB counts
5. UTM params in URL → stored on session row

---

## F2 — Purchase Funnel (Cart Events)

**Goal:** Automatic tracking of the 4 purchase funnel steps. No staff action needed.

### DB migration `034_cart_events.sql`

```sql
CREATE TABLE cart_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    TEXT NOT NULL,
    event_type    TEXT NOT NULL,   -- add_to_cart | remove_from_cart | checkout_started | checkout_completed
    product_id    UUID,
    product_title TEXT,
    quantity      INT,
    value_kes     NUMERIC(12,2),
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Client fires events at

- `CartPage.tsx` — add / remove item
- `CheckoutPage.tsx` — on mount (`checkout_started`)
- `OrderSuccessPage.tsx` — on mount (`checkout_completed`)

### Admin Traffic tab gains

Conversion funnel: `visitors → cart → checkout → paid` with drop-off percentages.

---

## F3 — Booking Intent / Service Wishlist (Option A)

**Goal:** Customer can bookmark services while browsing `/services`.
A floating tray appears when items are saved. Tray leads to a summary with "Book now" and "Request callback" buttons.

### DB migration `035_booking_intent.sql`

```sql
CREATE TABLE booking_intent (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    TEXT NOT NULL,
    service_ids   TEXT[] NOT NULL,
    service_names TEXT[] NOT NULL,   -- denormalized snapshot
    phone         TEXT,              -- filled only when callback requested (F4)
    status        TEXT NOT NULL DEFAULT 'browsing',
                                     -- browsing | callback_requested | booked | expired
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Client changes

- `ServicesPage.tsx` — bookmark icon on each service card, state in `localStorage`
- New `ServiceWishlistTray.tsx` — floating bottom bar: "X services saved · View list"
- New wishlist modal/drawer — saved services list, Book Now + Request Callback per item or in bulk

### Admin Traffic tab gains

"Booking intents today: X browsing, X callback requested" stat card.

---

## F4 — Request Callback (Option A→B hybrid)

**Builds on F3.** When customer taps "Request Callback":

1. Modal: enter phone number (pre-filled if logged in)
2. Submit → `POST /api/v1/booking-intent` → upserts intent row with `status = callback_requested` and phone
3. Client opens WhatsApp deep link with pre-filled message listing the saved services
4. Admin sees the intent in daily ops Traffic tab with phone, service list, timestamp
5. Admin can click phone to call or WhatsApp directly from the admin UI

---

## F5 — Traffic Tab in Daily Ops (full assembly)

Combines all signals into one dashboard view.

```
┌─ TODAY AT A GLANCE ─────────────────────────────────────────────┐
│  142 visitors   38 cart adds   12 checkouts   8 orders paid     │
│  7 booking intents   3 callback requests   91 link clicks       │
└─────────────────────────────────────────────────────────────────┘

[Hourly chart: sessions through the day]

[Funnel: visitors → cart → checkout → paid  + conversion %]

[Top pages table]   [Referrer breakdown]   [Social clicks]

[Booking intents table: service names | phone | status | time → call/WA button]
```

---

## F6 — Social & Referrer Attribution

Enhanced correlation: of visitors who came from Instagram today, how many
visited `/services`, how many saved a service, how many requested a callback.

Combines `visitor_sessions.utm_source` + `visitor_sessions.referrer` + `booking_intent` + `cart_events`.

---

## Build order & dependencies

```
F1  visitor tracking        ← build now, no dependencies
     ↓ (session_id flows into all downstream features)
F2  cart events             ← after F1
F3  service wishlist        ← after F1
     ↓
F4  callback request        ← after F3
     ↓
F5  traffic tab (full)      ← after F1 + F2 + F3
     ↓
F6  social attribution      ← after F1 + F5
```

---

## Conventions for this build

- Every tracking endpoint: public, no auth, returns `{"ok": true}` immediately — never blocks the client
- `session_id`: anonymous UUID, lives in `sessionStorage` (clears on tab close), never tied to user identity unless user explicitly provides phone (F4)
- No cookies, no fingerprinting, no PII collected without explicit user action
- Backend errors in tracking endpoints are silently swallowed — a failed analytics write must never break the user's page load
- All new DB tables: `CREATE TABLE IF NOT EXISTS`, idempotent migrations
