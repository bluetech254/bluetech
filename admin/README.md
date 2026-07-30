# BlueTech Kenya — Admin Console

Full admin panel for BlueTech Kenya (e-commerce + repair bookings), built with
Next.js 14 (App Router), TypeScript, Tailwind CSS, and Recharts.

Design follows the reference dashboard screenshot: dark base, colorful KPI
tiles, chart-forward dashboard, right-hand activity feed — restyled in
BlueTech's blue/amber/lime/coral palette.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Everything is powered by deterministic mock
data in `lib/mock-data.ts` — no backend or database needed to explore the UI.

## Pages

- `/` — Dashboard: KPIs, 30-day revenue trend, activity feed, pipelines, stock alerts
- `/orders` — Orders table, filters, inline status/payment, detail drawer
- `/repairs` — 8-stage repair pipeline, cost fields, SMS log
- `/products` — Grid/table catalog, add/edit, soft delete
- `/zones` — Delivery zone fees, inline edit
- `/services` — Repair service catalog CRUD
- `/loyalty` — Points balances, manual awards, referral tracking, transaction history
- `/analytics` — Revenue split, top products, orders/day, revenue by zone
- `/users` — Client accounts, activate/deactivate
- `/login` — Admin sign-in screen

## Wiring up your real backend

Everything currently reads from `lib/mock-data.ts`. To connect your FastAPI +
Supabase backend:

1. Replace the arrays exported from `lib/mock-data.ts` with `fetch()` calls to
   your FastAPI endpoints (e.g. inside `useEffect` or by converting pages to
   Server Components with `async`/`await`).
2. Swap the local `useState` mutations in each page (`updateOrder`,
   `updateBooking`, `saveProduct`, etc.) for API `PATCH`/`POST` calls.
3. Add real auth on `/login` — call your JWT endpoint and store the token
   (e.g. httpOnly cookie set by a Next.js route handler), then gate the
   `(app)` route group with middleware that checks for a valid session.
4. For the M-Pesa/SMS-triggered fields (payment status, SMS log), have your
   backend push updates and either poll every 2 minutes (as your spec
   describes) or move to websockets/SSE for true real-time updates.

## Notes

- Fonts use the locally-bundled Geist family (no external font fetch needed).
- Charts are Recharts; icons are lucide-react.
- All currency is formatted as KES.
