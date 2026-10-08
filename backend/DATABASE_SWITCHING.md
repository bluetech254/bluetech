# Database Backend Switching Guide

This document explains how to switch between Supabase (dev) and PostgreSQL (prod) backends using the unified database abstraction layer.

## Architecture

The application uses a unified database API (`db.table()`) that transparently routes queries to either:
- **Supabase** (dev/staging)
- **PostgreSQL** (production/cPanel)

No code changes required—switching is purely configuration-driven via environment variables.

## Environment Variables

### For Supabase Backend (Dev/Staging)

```bash
DATABASE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOi... (service role key)
```

**Example:**
```bash
DATABASE_TYPE=supabase
SUPABASE_URL=https://ureebvpesbkbholidlrn.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWVidnBlc2JrYmhvbGlkbHJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjcyMzgyNywiZXhwIjoyMDk4Mjk5ODI3fQ.B9u-wElfqgPDlstwTVR18CSKf2vVa3EKbrgFHcO_aPI
```

### For PostgreSQL Backend (Production/cPanel)

```bash
DATABASE_TYPE=postgresql
DB_HOST=your-host.com          # or localhost for dev
DB_PORT=5432                   # default PostgreSQL port
DB_NAME=bluetech_prod
DB_USER=postgres
DB_PASSWORD=your_secure_password
```

**Example (cPanel production):**
```bash
DATABASE_TYPE=postgresql
DB_HOST=ns1.example.com
DB_PORT=5432
DB_NAME=bluetech_prod
DB_USER=bluetech_user
DB_PASSWORD=secure_password_here
```

**Example (local development PostgreSQL):**
```bash
DATABASE_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bluetech_test
DB_USER=postgres
DB_PASSWORD=dev_password
```

## Switching Backends

### 1. Update `.env` file

For development (Supabase):
```bash
export DATABASE_TYPE=supabase
export SUPABASE_URL=https://ureebvpesbkbholidlrn.supabase.co
export SUPABASE_SERVICE_KEY=eyJhbGciOi...
```

For production (PostgreSQL):
```bash
export DATABASE_TYPE=postgresql
export DB_HOST=prod-db.example.com
export DB_PORT=5432
export DB_NAME=bluetech_prod
export DB_USER=bluetech_user
export DB_PASSWORD=secure_password
```

### 2. Restart the application

```bash
# If using systemd
sudo systemctl restart bluetech-api

# Or if running locally
python -m uvicorn app.main:app --reload
```

### 3. Verify database connection

Health check endpoint:
```bash
curl http://localhost:8000/health/db
# Response: {"status": "healthy", "database": "connected"}
```

## Application Code

All database queries use the same unified API:

```python
from core.db import db

# Works identically on both Supabase and PostgreSQL:
result = db.table("users").select("*").eq("id", "123").execute()
result = db.table("users").insert({"name": "Alice"}).execute()
result = db.table("users").update({"name": "Bob"}).eq("id", "123").execute()
result = db.table("users").delete().eq("id", "123").execute()
```

**Response format (same on both backends):**
```python
{
    "data": [...],      # List of rows or single dict (.single())
    "count": int,       # Number of rows affected/returned
    "error": None       # None on success, error message on failure
}
```

## Supported Query Operations

Both backends support the full query API:

### Filters
- `.eq(column, value)` — equality
- `.neq(column, value)` — not equal
- `.gt(column, value)` — greater than
- `.gte(column, value)` — greater than or equal
- `.lt(column, value)` — less than
- `.lte(column, value)` — less than or equal
- `.in_(column, [values])` — IN operator
- `.ilike(column, pattern)` — case-insensitive LIKE
- `.like(column, pattern)` — case-sensitive LIKE
- `.is_(column, value)` — IS operator (NULL checks)

### Query Building
- `.select(columns)` — specify columns (e.g., "id,title")
- `.order(column, desc=True/False)` — ORDER BY (chainable)
- `.limit(n)` — LIMIT
- `.range(start, end)` — offset/limit range
- `.single()` — return single row (error if != 1)

### Mutations
- `.insert(data)` — INSERT
- `.update(data)` — UPDATE
- `.delete()` — DELETE

## Testing

Run the test suite on your backend:

```bash
# Test Supabase backend
export DATABASE_TYPE=supabase
python backend/tests/test_db_abstraction.py

# Test PostgreSQL backend
export DATABASE_TYPE=postgresql
python backend/tests/test_db_abstraction.py
```

Results: **25 tests covering all major operations and edge cases**

## Connection Pooling

### Supabase
- Lazy initialization: client created on first query
- No explicit connection management needed

### PostgreSQL
- Connection pooling: 5-20 connections maintained
- Automatic connection reuse
- Connections returned to pool after query execution
- No explicit connection management needed

## Error Handling

All errors follow a consistent format:

```python
result = db.table("users").select("id").execute()

if result["error"]:
    # Handle error
    print(f"Query failed: {result['error']}")
else:
    # Process data
    for row in result["data"]:
        print(row)
```

## Performance Considerations

### Supabase
- Network latency: queries over HTTPS
- Suitable for: development, staging, small production deployments
- Rate limiting: Supabase-managed

### PostgreSQL
- Direct connection: lower latency
- Suitable for: high-volume production workloads
- Connection pooling: optimized for concurrent queries
- Recommended for: 1000+ req/sec applications

## Migration Path

1. **Develop locally** with Supabase (`DATABASE_TYPE=supabase`)
2. **Test PostgreSQL** with local/test instance (`DATABASE_TYPE=postgresql`)
3. **Deploy production** with cPanel PostgreSQL (`DATABASE_TYPE=postgresql`)

No code changes needed at any stage—only environment variables.

## Troubleshooting

### "Database unreachable at startup"

**For Supabase:**
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Verify Supabase project is not paused
- Check internet connectivity

**For PostgreSQL:**
- Check `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Verify PostgreSQL server is running: `psql -h $DB_HOST -U $DB_USER -d $DB_NAME`
- Check firewall rules allow connection on port 5432

### "psycopg2 is required for PostgreSQL backend"

Install PostgreSQL driver:
```bash
pip install psycopg2-binary==2.9.9
```

### Slow queries

**For Supabase:**
- Check Supabase dashboard for rate limits
- Consider query optimization (select specific columns, use filters)

**For PostgreSQL:**
- Check database indexes on filtered columns
- Use EXPLAIN ANALYZE to profile queries
- Verify connection pooling is working

## See Also

- [Database Architecture](./docs/DB_MIGRATION_PLAN.md)
- [Connection Factory](./backend/app/core/db_connection.py)
- [Query Abstraction Layer](./backend/app/core/db.py)
- [Test Suite](./backend/tests/test_db_abstraction.py)
