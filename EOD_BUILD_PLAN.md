# Daily Operations & EOD Reporting Module — Build Plan

## Overview

A unified daily operations workspace living under a single sidebar entry **"Daily Ops"** in the admin
panel. Inside that one page, horizontal sub-tabs handle all four modules. Everything within the page
shares the same `daily_report` record for the active date — leads, logistics, cash drawer, and the EOD
report are all connected to that single daily record, so data flows automatically between tabs with no
duplication.

```
Sidebar → Daily Ops
            └── [Operations] [Leads] [Logistics] [Cash] [EOD Report]   ← horizontal tabs
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Sales     Daily Report — 2026-11-19     💬  Lock Day     │  ← header bar
│  Grand Total: KES 0        Total Bills: 0                           │  ← live KPI badges
├─────────────────────────────────────────────────────────────────────┤
│  [Operations]  [Leads]  [Logistics]  [Cash]  [EOD Report]           │  ← horizontal tabs
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   (active tab content renders here)                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

All tabs read from and write to the **same** `daily_report` record for the selected date.
Switching tabs never loses state — the report date stays fixed at the top.

---

## Tab Breakdown

### Tab 1 — Operations (Overview)
Quick-glance dashboard for the active day. No data entry here — purely aggregated.

- Date selector (defaults today, historical dates load as read-only if locked)
- KPI cards: Total Sales, Cash Collected, Card Collected, Online Collected, Total Expenses, Net Cash in Drawer
- Mini leads summary: Total / Closed / Conversion %
- Mini logistics summary: Pickups / Deliveries
- Cash drawer equation preview: Opening + Cash In − Expenses = Expected
- "View Full EOD Report" shortcut button → jumps to EOD Report tab

### Tab 2 — Leads
Full leads inquiry tracker.

**Quick-add bar:**
- Channel: Calls / WhatsApp / Walk-in
- Source (shown for Calls & WhatsApp): Google / Website / Instagram / Unknown
- Quantity: 1–10 numeric selector
- `+ Add Leads` button — appends immediately, no reload

**KPI strip (live, recalculates on every status change):**
- Total · Closed (green) · Pending (grey) · No-Go (red) · Conversion % (cyan) · Linked Sales (KES)

**Lead log table:**
- Grouped by channel with subtotals
- Columns: # / Channel · Source / Status
- Each row: inline 3-pill toggle — `Pending` `Closed` `No-Go`
- Clicking Closed optionally prompts: attach Invoice # or Customer Phone (for Linked Sales calc)
- Delete button per row (blocked when day is locked)

### Tab 3 — Logistics
Pickup and delivery movement tracker.

**Quick-add bar:**
- Movement type: Pickup / Delivery
- Fulfillment: Us / Not-Us
- Zone: Nairobi CBD / Westlands / Eastlands / Parklands / Karen / Ngong Road / Thika Road / Mombasa Road / Other *(configurable)*
- Quantity: 0–20
- `+ Add` button

**Summary strip:**
- Pickups: X (Us Y / Not-Us Z)
- Deliveries: X (Us Y / Not-Us Z)

**Logistics table:**
- Grouped by movement type + zone
- Columns: # / Driver (Us / Not-Us) / Zone / Qty
- Delete per row (blocked when locked)

### Tab 4 — Cash
Cash drawer reconciliation for the shift.

**Fields:**
| Field | Behaviour |
|---|---|
| Opening Cash | Editable input; auto-filled from yesterday's `counted_cash` on new day |
| + Cash In | Auto-pulled from cash payments recorded today (read-only) |
| − Cash Expenses | Auto-pulled from expenses logged today with `payment_method = cash` (read-only) |
| = Expected in Drawer | Computed: Opening + Cash In − Expenses (read-only) |
| Counted Cash | Editable input — cashier enters physical count at close |
| Difference (Variance) | Computed: Counted − Expected. Green if 0, red if negative, amber if positive |

**Expenses sub-section (within this tab):**
- Quick-add: Vendor / Reason / Bill Ref / Payment Method (Cash / Card / Transfer) / Amount → `+ Add`
- Expenses table: Vendor / Reason / Bill # / Paid By / Amount / Delete
- Footer: total by payment method

### Tab 5 — EOD Report
Locked, timestamped, printable end-of-day executive summary.

**Sections:**
1. **Report header** — Business name, date (Wednesday, 19 November 2026), Audit stamp (Saved by [user] · [time])
2. **Financial cards** — Today's Sales (after discounts, bill count), Cash collected, Card collected, Online collected
3. **Summary totals** — Grand Total / Total Cash in Drawer / Total Expenses
4. **Payments ledger** — Invoice # / Client / Method / Time / Amount
5. **Expenses ledger** — Vendor / Reason / Bill # / Paid By / Amount, footer by method
6. **Cash drawer block** — Full equation: Opening + Cash In − Expenses = Expected / Counted / Difference
7. **Unpaid bills (AR)** — Invoice # / Client / Pending Amount
8. **Leads snapshot** — KPI badges + channel breakdown (Calls: X, WhatsApp: Y — Google N, Walk-in: Z)
9. **Logistics snapshot** — Pickup/Delivery counts or "None." if zero

**Actions:**
- `Download PDF` — renders the report card as a downloadable PDF
- `Share via WhatsApp` — formats a plain-text digest and opens `wa.me` pre-filled
- `Lock Day` (admin only) — locks all entries for the date, writes `closed_by` + `closed_at`, shows lock badge

---

## Database Schema

### `daily_reports`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
report_date     DATE NOT NULL UNIQUE
branch_id       UUID  -- future multi-branch support
opening_cash    NUMERIC(12,2) DEFAULT 0
counted_cash    NUMERIC(12,2) DEFAULT 0
status          TEXT DEFAULT 'open'   -- open | closed
closed_by       UUID REFERENCES admin_users(id)
closed_at       TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### `daily_leads`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
daily_report_id UUID NOT NULL REFERENCES daily_reports(id)
channel         TEXT NOT NULL   -- call | whatsapp | walk_in
source          TEXT            -- google | website | instagram | unknown | null
status          TEXT DEFAULT 'pending'  -- pending | closed | no_go | scheduled
customer_name   TEXT
phone           TEXT
invoice_id      UUID            -- optional link to invoice for Linked Sales
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

### `daily_logistics`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
daily_report_id UUID NOT NULL REFERENCES daily_reports(id)
movement_type   TEXT NOT NULL   -- pickup | delivery
fulfillment_by  TEXT NOT NULL   -- us | not_us
driver_id       UUID            -- optional, for future named driver assignment
zone            TEXT NOT NULL
quantity        INT DEFAULT 1
invoice_id      UUID            -- optional link
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

### `daily_expenses`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
daily_report_id UUID NOT NULL REFERENCES daily_reports(id)
vendor          TEXT NOT NULL
reason          TEXT NOT NULL
bill_ref        TEXT
payment_method  TEXT NOT NULL   -- cash | card | transfer
amount          NUMERIC(12,2) NOT NULL
recorded_by     UUID
created_at      TIMESTAMPTZ DEFAULT now()
```

> Note: Check if an `expenses` table already exists and either extend it or use `daily_expenses` as a
> scoped replacement. Do not drop anything before confirming.

---

## Backend Endpoints

All routes under `/api/v1/daily`, all require `get_current_admin`.
Write endpoints return `403` if `daily_reports.status = 'closed'` (except the lock endpoint itself).

### Daily Report
| Method | Path | Description |
|---|---|---|
| GET | `/daily/report/{date}` | Fetch or auto-create report for date. Returns report + aggregated totals |
| PATCH | `/daily/report/{date}` | Update `opening_cash`, `counted_cash` |
| POST | `/daily/report/{date}/lock` | Lock the day — admin only |

### Leads
| Method | Path | Description |
|---|---|---|
| GET | `/daily/report/{date}/leads` | All leads for date |
| POST | `/daily/report/{date}/leads` | Add one or more leads (quantity field) |
| PATCH | `/daily/leads/{id}` | Update status, attach invoice_id / phone |
| DELETE | `/daily/leads/{id}` | Remove lead |

### Logistics
| Method | Path | Description |
|---|---|---|
| GET | `/daily/report/{date}/logistics` | All logistics for date |
| POST | `/daily/report/{date}/logistics` | Add a movement record |
| DELETE | `/daily/logistics/{id}` | Remove a logistics entry |

### Expenses
| Method | Path | Description |
|---|---|---|
| GET | `/daily/report/{date}/expenses` | All expenses for date |
| POST | `/daily/report/{date}/expenses` | Add an expense |
| DELETE | `/daily/expenses/{id}` | Remove an expense |

### EOD Aggregation
| Method | Path | Description |
|---|---|---|
| GET | `/daily/report/{date}/eod` | Full EOD snapshot — sales, collections, AR, cash drawer equation, leads/logistics summaries |

---

## EOD Aggregation Logic (backend)

```
today_sales       = SUM(invoices.total_amount)   WHERE DATE(paid_at) = date AND status = 'paid'
cash_in           = SUM(payments.amount)          WHERE method = 'cash' AND DATE = date
card_in           = SUM(payments.amount)          WHERE method = 'card' AND DATE = date
online_in         = SUM(payments.amount)          WHERE method IN ('mpesa','transfer') AND DATE = date
total_expenses    = SUM(daily_expenses.amount)    WHERE daily_report_id = report.id
cash_expenses     = SUM(daily_expenses.amount)    WHERE payment_method = 'cash'
expected_cash     = opening_cash + cash_in - cash_expenses
variance          = counted_cash - expected_cash
unpaid_invoices   = invoices WHERE DATE(created_at) = date AND balance_due > 0
linked_sales      = SUM(invoices.paid_amount)     WHERE id IN (leads WHERE status='closed' AND invoice_id NOT NULL)
conversion_pct    = closed_leads / total_leads * 100
```

---

## Frontend File Structure

```
admin/app/(app)/daily/
  page.tsx                  ← shell: date state, tab state, shared report fetch
  components/
    DailyHeader.tsx         ← date picker, KPI badges, Lock Day button
    TabBar.tsx              ← horizontal tab navigation
    tabs/
      OperationsTab.tsx     ← overview cards + mini summaries
      LeadsTab.tsx          ← quick-add bar + KPI strip + lead table
      LogisticsTab.tsx      ← quick-add bar + summary strip + logistics table
      CashTab.tsx           ← cash drawer fields + expenses sub-section
      EodReportTab.tsx      ← full printable EOD report + export actions
    shared/
      StatusPill.tsx        ← reusable 3-pill status toggle (Pending/Closed/No-Go)
      KpiBadge.tsx          ← reusable coloured badge
      SectionCard.tsx       ← reusable card wrapper used in EOD report
```

---

## Build Steps (Execution Order)

```
Step 1   DB migration — create daily_reports, daily_leads, daily_logistics, daily_expenses
Step 2   Backend service layer — EOD aggregation query + CRUD helpers
Step 3   Backend router — all endpoints wired, lock guard on writes
Step 4   Register router in main.py, smoke test all endpoints
Step 5   Admin API lib — add all daily/* methods to admin/lib/api.ts
Step 6   Page shell (daily/page.tsx) — date state, tab state, report fetch on mount
Step 7   DailyHeader component — date picker, live KPI badges, Lock Day button
Step 8   TabBar component — horizontal tab switcher
Step 9   OperationsTab — aggregated overview cards
Step 10  LeadsTab — quick-add, KPI strip, table with inline status toggle
Step 11  LogisticsTab — quick-add, summary strip, grouped table
Step 12  CashTab — drawer fields (auto-computed), expenses sub-section
Step 13  EodReportTab — full report layout, all sections
Step 14  PDF export (react-to-print)
Step 15  WhatsApp share — plain-text digest, wa.me link
Step 16  Shift lock — POST /lock endpoint, UI lock badge, write guard
Step 17  Auto opening cash carry-forward (backend: on report create, check yesterday)
Step 18  Sidebar link — add Daily Ops to admin nav
Step 19  Build check — npm run build, fix any TS errors
Step 20  Deploy — git commit, push, docker rebuild + restart
```

---

## Open Questions (answer before Step 1)

| # | Question | Why it matters |
|---|---|---|
| 1 | Does an `expenses` table already exist in the DB? | Avoid schema conflict |
| 2 | Zones/regions to use for logistics? | Nairobi areas or configurable list? |
| 3 | Named driver assignment needed now or future? | Affects `daily_logistics` schema |
| 4 | Currency KES throughout? | EOD report formatting |
| 5 | Who can lock a day — any admin, or manager role only? | Lock endpoint auth guard |

---

## Key Design Decisions

- **One sidebar entry, one route** (`/daily`) — no extra sidebar clutter
- **Horizontal tabs share state** — date and report record never reset on tab switch
- **Single backend fetch on page load** — `GET /daily/report/{date}` returns everything; individual mutations update local state optimistically
- **Write guard on lock** — backend enforces it, not just the UI
- **Auto carry-forward** — opening cash pre-filled from yesterday, editable if wrong
- **Connected data** — Cash In comes from actual payment records, Expenses feed the drawer equation, Closed leads with invoice_id feed Linked Sales — nothing is manually duplicated
