# Daily Ops & EOD Module — Progress

_Last updated: 2026-11-19_

This records the actual state of the Daily Ops / EOD module after the build &
hardening session. The original spec lives in `EOD_BUILD_PLAN.md`; the build
steps there (1–20) were mostly written in a prior session, but Step 1 (the DB
migration) was missing and several latent bugs had never been exercised against
a real database. This session closed those gaps and added Phases 1–3.

Server: `ssh mayday@100.96.139.83`, deploy at `~/bluetech` (not a git clone —
files are synced; backend = `api/`, not `backend/`). Containers are built images
under `docker-compose.yml`: `bluetech-db`, `bluetech-api`, `bluetech-admin`,
`bluetech-client`, `bluetech-proxy`, `bluetech-tunnel`.

---

## Commits this session (on `origin/main`)

| Commit | What |
|---|---|
| `f357bd0` | Step 1 — DB migration `supabase/030_daily_ops.sql` (daily_reports/leads/logistics/expenses) |
| `5b0839a` | fix: `admin["admin_id"]` (was `admin["id"]` → KeyError) in lock_report & add_expense |
| `1053cf5` | fix: `get_or_create_report` race-safe (duplicate-key 500 on concurrent page load) |
| `e3336e9` | Phases 1–3 — lead sources, link click tracking, Customer 360 CRM |

Working tree is clean and in sync with `origin/main`.

---

## Status

| Item | State |
|---|---|
| Step 1 — DB migration (4 daily tables) | ✅ committed + applied to prod |
| Steps 2–4 — backend service/router/registration | ✅ (prior session) + hardened this session |
| Step 5 — admin API lib (`daily*` methods) | ✅ (prior session) |
| Steps 6–18 — frontend (shell, tabs, print, WhatsApp, lock, carry-forward, sidebar) | ✅ (prior session) |
| Step 19 — admin build check | ✅ `next build` passed on the Phase 1–3 rebuild |
| Phase 1 — expanded lead sources | ✅ code + deployed (api + admin) |
| Phase 2 — link click tracking | ✅ backend + admin deployed; ⚠️ client footer not live yet (see below) |
| Phase 3 — Customer 360 CRM | ✅ backend + admin deployed; backfill run |

### Phase 1 — Lead sources (done)
`VALID_SOURCES` expanded to: google, google_maps, website, instagram, facebook,
tiktok, youtube, threads, referral, other, unknown. The source selector is now
always shown (not gated to Call/WhatsApp). Source labels in the lead table
expanded to match.

### Phase 2 — Link click tracking (backend+admin done; client pending)
- New tables: `link_destinations` (7 seeded from the footer socials), `link_clicks`.
- `GET /api/v1/go/{slug}` — public, logs a click (slug, referrer, UA, IP) then 302s to the destination.
- `GET /api/v1/daily/report/{date}/clicks` — admin: per-source click counts for the day.
- Operations tab shows a "Link Clicks Today" card.
- Client `Footer.tsx` social links now point to `${API_BASE_URL}/go/${slug}`.
- ⚠️ The `bluetech-client` container has **not** been rebuilt, so the public site
  still serves the old footer (direct external links). The source on the server
  is updated; a client rebuild is required to make tracking live.

### Phase 3 — Customer 360 / CRM (done)
- New table `customer_profiles`, keyed by **normalized phone** (`2547XXXXXXXX`).
- Auto-capture via `AFTER INSERT` triggers on `orders`, `bookings`,
  `contact_messages`, `daily_leads` — every website customer is logged
  automatically, with **no app-code changes** to the order/booking/contact flows.
- Admin **Customers** page (`/customers`): search by name/phone/email, list with
  aggregates (orders / repairs / leads / total spend / last seen), and a per-customer
  detail view with a full timeline (orders, bookings, contact messages, leads).
- Backfill run once → 6 profiles created from historical rows.
- SQL helper `normalize_phone()` mirrors the Python `normalize_phone()`.

---

## Bugs found & fixed (these existed in the prior session's code but were never run against a real DB, because Step 1 was missing)

1. **`admin["id"]` KeyError** — `get_current_admin` returns the JWT payload
   (keyed `admin_id`), but `service.py` read `admin["id"]` in `lock_report` and
   `add_expense`. Crashed Lock Day and expense add. Fixed → `admin["admin_id"]`.
2. **`get_or_create_report` race** — the page fires several endpoints on mount,
   each calling `get_or_create_report`. On first load for a date the concurrent
   SELECTs all miss, then INSERTs collide on the `report_date` UNIQUE constraint
   → 500 "duplicate key". Fixed: on insert failure, re-fetch and return the
   existing report (idempotent under races). Verified: 15 concurrent calls →
   15 successes, 0 errors, exactly 1 row.

---

## Deploy state on the server

| Container | Rebuilt this session? | Status |
|---|---|---|
| `bluetech-db` | n/a (migrations applied) | migrations 030/031/032 applied; 4 customer triggers active |
| `bluetech-api` | ✅ | healthy; daily + link_tracking + customers routers live |
| `bluetech-admin` | ✅ | rebuilt; Customers page + clicks card + source dropdown live |
| `bluetech-client` | ❌ | running old image; footer `/go/` tracking not live yet |

Migrations applied to prod: `030_daily_ops.sql`, `031_link_tracking.sql`,
`032_customer_profiles.sql` (idempotent; aligned to prod's existing schema).

---

## Verification (run live in the `bluetech-api` container)
- Lead add/update/list: ✅ (3+1 leads, status→closed, phone updated).
- Lock Day + Add Expense (the `admin["id"]` fix): ✅ write correct admin id.
- Race fix: ✅ 15 concurrent `get_or_create_report` → 0 errors, 1 row.
- Click tracking: unknown slug → HTTP 404 (route mounted, public); `record_click`
  → `get_clicks_for_date` returns the count.
- CRM trigger: adding a lead with a phone → `customer_profiles` row auto-created.
- Backfill: 6 profiles created from historical orders/bookings/contacts/leads.

---

## Remaining / next

1. **Rebuild `bluetech-client`** so the footer `/go/{slug}` tracking links go live
   on the public site: `cd ~/bluetech && docker compose up -d --build client`.
   (Verify the client build-args, esp. `VITE_API_BASE_URL`, are set in compose
   so the footer links resolve to the right API host.)
2. **Hard-refresh the admin** in the browser (or incognito) — the "WhatsApp only"
   lead issue and the missing sidebar item were stale-browser-cache; the new
   build has all sources + Customers + clicks card.
3. **Phase 4 (optional, deferred)** — closed-loop attribution (click → lead →
   order) via a stored correlation id. Not built.
4. **Smoke-test the admin UI end-to-end** with a real admin login: add a lead
   with a new source, view the Customers page, confirm click counts populate
   after the client rebuild.
