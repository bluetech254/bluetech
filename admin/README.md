# BlueTech Kenya — Admin Panel

Next.js 14 (App Router, TypeScript, Tailwind) admin panel wired to the
BlueTech Kenya backend, styled after the supplied dark-theme dashboard
reference (purple/violet accent, card-based layout, sidebar nav).

## Setup

```bash
npm install
cp .env.local.example .env.local
# then fill in .env.local with your real Supabase keys
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Log in
with an admin account created on the backend (`admins` table).

## ⚠️ Security note

The original spec document included a **live Supabase service role key**
in plaintext. That key bypasses row-level security entirely and must
never be shipped to the browser or committed to source control:

1. Rotate the key in the Supabase dashboard (Settings → API) — treat the
   one in the doc as already compromised.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` only (already
   gitignored) and never reference it in any `NEXT_PUBLIC_*` variable
   or client component.
3. This admin panel doesn't call Supabase directly anyway — all data
   goes through the FastAPI backend, per the original spec — so the
   service key isn't actually needed here at all.

## Structure

- `app/(app)/*` — authenticated pages (dashboard, orders, repairs,
  products, zones, services, users, loyalty, analytics, admins)
- `app/login` — login page
- `app/api/auth/*` — Next.js API routes that proxy to the backend and
  set the httpOnly `admin_session` cookie
- `middleware.ts` — redirects to `/login` if the session cookie is
  missing or expired
- `lib/api.ts` — typed client for every backend endpoint in the spec
- `lib/types.ts` — shared TypeScript types
- `components/layout` — `Sidebar`, `Topbar`
- `components/ui` — `StatCard`, `StatusBadge`

## What's fully wired vs. read-only

Orders, repair bookings, products, users, loyalty/referrals, and admin
accounts are fully interactive (status updates, bulk actions, CRUD,
point awards). Delivery zones and repair services are read-only in the
UI, matching the backend (no write endpoints were specified for them).
