# Database Migration Plan: Supabase → PostgreSQL Abstraction Layer

## Objective
Replace Supabase client with scalable PostgreSQL abstraction layer that:
- Works with both Supabase (dev) and raw PostgreSQL (prod/cPanel)
- All credentials from environment variables only
- Can easily swap database backends without code changes
- Maintains RLS policies in Supabase, bypasses in raw PostgreSQL

---

## Architecture

```
┌─────────────────────┐
│   Application       │
│   (routers, etc)    │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │  DB Layer   │  ← New abstraction
    │  (db.py)    │
    ├─────────────┤
    │ - init()    │
    │ - query()   │
    │ - execute() │
    │ - table()   │ ← Backwards-compatible API
    └──────┬──────┘
           │
    ┌──────▼──────────────────┐
    │  Environment Config      │
    │  DATABASE_TYPE: "pg"    │
    │  DATABASE_URL or        │
    │  DB_HOST/PORT/etc       │
    └─────────────────────────┘
```

---

## Phase 1: Database Connection Layer

### Milestone 1.1: Create PostgreSQL connection module
**Objective:** Unified connection management for both Supabase and raw PostgreSQL

**Files to create:**
- `backend/app/core/db_connection.py` — Connection factory

**What it does:**
- Read `DATABASE_TYPE` env var (`supabase` or `postgresql`)
- For Supabase: connect via Supabase URL + keys
- For PostgreSQL: connect via `psycopg2.connect()` with host/port/user/password
- Lazy initialization (connect on first query)
- Connection pooling

**Dependencies to add:**
```
psycopg2-binary==2.9.9
psycopg2-pool==1.1
```

**Testing:**
- Dev: connect to Supabase via URL
- Local: connect to localhost PostgreSQL
- Both return a working connection object

---

### Milestone 1.2: Create database query abstraction
**Objective:** Abstract away differences between Supabase and raw PostgreSQL

**Files to create:**
- `backend/app/core/db.py` — Query builder abstraction

**What it does:**
- Provide unified API:
  - `db.table(name).select(...).execute()`
  - `db.table(name).insert(data).execute()`
  - `db.table(name).update(data).eq(...).execute()`
  - `db.table(name).delete().eq(...).execute()`
- For Supabase: use existing Supabase client
- For PostgreSQL: translate to raw SQL queries and execute
- Handle transactions, error handling, connection pooling

**Backwards compatibility:**
- Existing code `from core.database import supabase` → `from core.db import db`
- All existing queries continue to work unchanged

---

## Phase 2: Query Translation Engine

### Milestone 2.1: Build query translator (Supabase syntax → SQL)
**Objective:** Convert `.table().select().eq()` chains to SQL

**What it does:**
- `.select("col1,col2")` → `SELECT col1, col2 FROM table`
- `.eq("id", value)` → `WHERE id = %s`
- `.in_("status", ["a","b"])` → `WHERE status IN (%s, %s)`
- `.order("created_at", desc=True)` → `ORDER BY created_at DESC`
- `.limit(10)` → `LIMIT 10`
- Nested relations: `.select("*, orders(*)").eq(...)` → SQL JOINs

**Testing:**
- Unit tests for each filter type
- Compare Supabase result vs SQL result on same data

---

### Milestone 2.2: Implement insert/update/delete translators
**Objective:** Handle mutations (not just reads)

**What it does:**
- `.insert(data)` → `INSERT INTO table (...) VALUES (%s, ...)`
- `.update(data).eq(...)` → `UPDATE table SET ... WHERE ...`
- `.delete().eq(...)` → `DELETE FROM table WHERE ...`
- Return `count`, `data`, `error` in same format as Supabase

---

## Phase 3: Systematic Query Rewrite

### Milestone 3.1: Map all existing queries
**Objective:** Inventory every `supabase.table()` call

**What it does:**
- Scan all router and service files
- List:
  - File path
  - Line number
  - Query type (select/insert/update/delete)
  - Filters used
- Prioritize by:
  - Auth/payment (critical)
  - Products (frequently used)
  - Admin ops (lower priority)

**Deliverable:** Query inventory spreadsheet

---

### Milestone 3.2: Rewrite critical queries (Phase A)
**Objective:** Get payment and auth working first

**Files to update:**
- `backend/app/auth/service.py` — All user queries
- `backend/app/payments/service.py` — All order/booking queries
- `backend/app/core/security.py` — Password/OTP queries

**Process:**
1. Read existing Supabase query
2. Translate to SQL equivalent
3. Test against both Supabase (dev) and PostgreSQL (local)
4. Verify same results

**Verify:**
- Run full auth flow (signup, login, password reset)
- Run payment flow (initiate, verify)

---

### Milestone 3.3: Rewrite product/order queries (Phase B)
**Objective:** Get commerce working

**Files to update:**
- `backend/app/products/service.py`
- `backend/app/orders/service.py`
- `backend/app/bookings/service.py`
- `backend/app/orders/router.py`

**Verify:**
- List products
- Create order
- Update order status
- Query order history

---

### Milestone 3.4: Rewrite admin queries (Phase C)
**Objective:** Get admin panel working

**Files to update:**
- `backend/app/admin_ops/router.py`
- `backend/app/admin_auth/service.py`
- `backend/app/devices/router.py`

**Verify:**
- Admin dashboard loads
- Admin can list/create/update products
- Admin audit log works

---

## Phase 4: Testing & Validation

### Milestone 4.1: Integration tests
**Objective:** Verify all queries work on both Supabase and PostgreSQL

**What it does:**
- Run full test suite against Supabase (dev)
- Run full test suite against PostgreSQL (local)
- Compare results — should be identical
- No code changes between runs, only env var changes

**Tests to run:**
```bash
# Dev (Supabase)
DATABASE_TYPE=supabase pytest tests/ -v

# Prod (PostgreSQL)
DATABASE_TYPE=postgresql pytest tests/ -v
```

---

### Milestone 4.2: Load testing
**Objective:** Ensure PostgreSQL can handle prod traffic

**What it does:**
- Simulate 100 concurrent users
- Run 1000 queries per second
- Monitor connection pool, memory, query time
- Identify bottlenecks

---

## Phase 5: Deployment

### Milestone 5.1: Deploy to cPanel with PostgreSQL
**Objective:** Run prod backend on cPanel PostgreSQL

**Steps:**
1. Create cPanel PostgreSQL database
2. Run migrations
3. Set cPanel `.env` with PostgreSQL credentials
4. Deploy backend code
5. Verify all endpoints work

---

## Timeline

| Phase | Milestone | Est. Time | Owner |
|-------|-----------|-----------|-------|
| 1 | Connection layer | 4h | |
| 1 | Query abstraction | 6h | |
| 2 | Query translator (SELECT) | 4h | |
| 2 | Query translator (INSERT/UPDATE/DELETE) | 4h | |
| 3 | Query inventory | 2h | |
| 3 | Auth/Payment queries | 6h | |
| 3 | Product/Order queries | 6h | |
| 3 | Admin queries | 4h | |
| 4 | Integration tests | 4h | |
| 4 | Load testing | 2h | |
| 5 | Deploy to prod | 2h | |
| **Total** | | **44 hours** | |

---

## Success Criteria

- ✅ All existing tests pass on both Supabase and PostgreSQL
- ✅ No code changes between dev (Supabase) and prod (PostgreSQL) — only `.env`
- ✅ All endpoints return identical results on both databases
- ✅ Production deployment works on cPanel PostgreSQL
- ✅ Can add new database backend (MySQL, etc.) without touching query code
- ✅ Performance within acceptable limits (< 100ms p50, < 500ms p99)

---

## Rollback Plan

If something breaks during migration:
1. Revert code changes: `git checkout main`
2. Redeploy to cPanel with Supabase credentials
3. App continues working
4. No data loss

---

## Next Steps

1. Review this plan — are the phases correct?
2. Get approval to start Phase 1
3. Set up local PostgreSQL for testing
4. Begin connection layer implementation
