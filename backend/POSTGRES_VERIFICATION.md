# PostgreSQL Backend Verification Guide

This guide walks through verifying the BlueTech application works correctly with PostgreSQL backend.

## Prerequisites

- PostgreSQL 12+ installed and running
- Database created with schema.sql applied
- Environment variables configured in `.env.production`
- Application dependencies installed

## Step 1: Database Schema Verification

Verify all tables are created:

```bash
psql -U bluetech_user -d bluetech_prod -h localhost -c "
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
"
```

Expected output (16 tables):
```
         table_name         
────────────────────────────
 admins
 audit_log
 bookings
 contact_messages
 delivery_zones
 device_brands
 device_models
 order_items
 orders
 points_ledger
 product_sections
 products
 repair_services
 section_products
 service_pricing
 users
```

Verify critical tables:

```bash
psql -U bluetech_user -d bluetech_prod -h localhost -c "\d users"
psql -U bluetech_user -d bluetech_prod -h localhost -c "\d products"
psql -U bluetech_user -d bluetech_prod -h localhost -c "\d orders"
```

Verify seed data (delivery zones):

```bash
psql -U bluetech_user -d bluetech_prod -h localhost -c "SELECT * FROM delivery_zones;"
```

Expected:
```
                 id                 | zone_name | delivery_fee | is_active |          created_at
─────────────────────────────────────┼───────────┼──────────────┼───────────┼──────────────────────
 (5 zones with delivery fees)
```

## Step 2: Connection String Verification

Create `.env.production` file:

```bash
cat > /path/to/.env.production << 'EOF'
# .env.production — Production PostgreSQL Backend
DATABASE_TYPE=postgresql
DB_HOST=localhost                    # Replace with actual host
DB_PORT=5432
DB_NAME=bluetech_prod
DB_USER=bluetech_user
DB_PASSWORD=your_secure_password
EOF

chmod 600 /path/to/.env.production   # Secure file permissions
```

## Step 3: Application Startup Test

Start the application with PostgreSQL backend:

```bash
# Source production environment
source /path/to/.env.production
export DATABASE_TYPE DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD

# Start application
cd /path/to/bluetech/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Verify startup logs:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
✓ Database connection OK
✓ All startup checks passed
```

## Step 4: Health Check Endpoint

Test database health check:

```bash
curl http://localhost:8000/health/db
```

Expected response:
```json
{"status": "healthy", "database": "connected"}
```

## Step 5: Run Application Test Suite

Run db abstraction tests against PostgreSQL:

```bash
# Navigate to backend
cd /path/to/bluetech/backend

# Set environment to PostgreSQL
export DATABASE_TYPE=postgresql
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=bluetech_prod
export DB_USER=bluetech_user
export DB_PASSWORD=your_password

# Run tests
python tests/test_db_abstraction.py
```

Expected output:
```
╔════════════════════════════════════════════════════════════╗
║  Comprehensive DB Abstraction Test Suite — PostgreSQL    ║
╚════════════════════════════════════════════════════════════╝

SELECT Queries:              14 tests ✅
Response Format:             5 tests ✅
Method Chaining:             3 tests ✅
Edge Cases:                  3 tests ✅
─────────────────────────────────────────────
Tests: 25 | Passed: 25 | Failed:  0
✅ All tests PASSED
```

## Step 6: Query Verification

### Test SELECT Query

```bash
python << 'EOF'
import os
import sys
sys.path.insert(0, 'app')

os.environ['DATABASE_TYPE'] = 'postgresql'
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '5432'
os.environ['DB_NAME'] = 'bluetech_prod'
os.environ['DB_USER'] = 'bluetech_user'
os.environ['DB_PASSWORD'] = 'your_password'

from core.db import db

# SELECT delivery zones
result = db.table('delivery_zones').select('zone_name,delivery_fee').execute()
print(f"✅ SELECT result: {result['count']} zones")
for row in result['data']:
    print(f"  - {row['zone_name']}: KES {row['delivery_fee']}")
EOF
```

Expected output:
```
✅ SELECT result: 5 zones
  - Nairobi CBD: KES 200.00
  - Westlands / Parklands: KES 250.00
  - Kilimani / Ngong Road: KES 300.00
  - Thika / Kiambu Outskirts: KES 450.00
  - Mombasa / Kisumu / Upcountry: KES 600.00
```

### Test INSERT Query

```bash
python << 'EOF'
import os, sys, uuid
sys.path.insert(0, 'app')

os.environ['DATABASE_TYPE'] = 'postgresql'
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '5432'
os.environ['DB_NAME'] = 'bluetech_prod'
os.environ['DB_USER'] = 'bluetech_user'
os.environ['DB_PASSWORD'] = 'your_password'

from core.db import db

# INSERT test user
test_phone = f"254{int(time.time()) % 1000000000:09d}"
result = db.table('users').insert({
    'full_name': 'Test User',
    'phone_number': test_phone,
    'email': f'test_{uuid.uuid4().hex[:8]}@test.com'
}).execute()

if result['error']:
    print(f"❌ INSERT failed: {result['error']}")
else:
    print(f"✅ INSERT successful: user created")
    print(f"  Data: {result['data']}")
EOF
```

### Test UPDATE Query

```bash
python << 'EOF'
import os, sys, uuid
sys.path.insert(0, 'app')

os.environ['DATABASE_TYPE'] = 'postgresql'
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '5432'
os.environ['DB_NAME'] = 'bluetech_prod'
os.environ['DB_USER'] = 'bluetech_user'
os.environ['DB_PASSWORD'] = 'your_password'

from core.db import db

# Get test user
users = db.table('users').select('id').limit(1).execute()
if users['data']:
    user_id = users['data'][0]['id']
    
    # UPDATE user points
    result = db.table('users').update({
        'points': 100
    }).eq('id', user_id).execute()
    
    if result['error']:
        print(f"❌ UPDATE failed: {result['error']}")
    else:
        print(f"✅ UPDATE successful: points set to 100")
        print(f"  Affected rows: {result['count']}")
EOF
```

### Test DELETE Query

```bash
python << 'EOF'
import os, sys
sys.path.insert(0, 'app')

os.environ['DATABASE_TYPE'] = 'postgresql'
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '5432'
os.environ['DB_NAME'] = 'bluetech_prod'
os.environ['DB_USER'] = 'bluetech_user'
os.environ['DB_PASSWORD'] = 'your_password'

from core.db import db

# Get test user (with specific email pattern)
users = db.table('users').select('id').ilike('email', '%test_%@test.com').limit(1).execute()
if users['data']:
    user_id = users['data'][0]['id']
    
    # DELETE user
    result = db.table('users').delete().eq('id', user_id).execute()
    
    if result['error']:
        print(f"❌ DELETE failed: {result['error']}")
    else:
        print(f"✅ DELETE successful: test user removed")
        print(f"  Affected rows: {result['count']}")
else:
    print("⚠️  No test users to delete")
EOF
```

## Step 7: API Endpoint Testing

Test actual API endpoints:

```bash
# Test auth endpoint (POST /api/v1/auth/login)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "254712345678",
    "password": "test_password"
  }'

# Test products endpoint (GET /api/v1/products)
curl http://localhost:8000/api/v1/products

# Test orders endpoint (GET /api/v1/orders)
curl http://localhost:8000/api/v1/orders
```

All endpoints should return valid responses (not database errors).

## Step 8: Performance Verification

Check query performance:

```bash
# Enable query timing
psql -U bluetech_user -d bluetech_prod -h localhost -c "
\timing on
SELECT * FROM orders LIMIT 10;
SELECT * FROM products WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 20;
SELECT COUNT(*) FROM bookings WHERE status = 'completed';
"
```

Expected: All queries complete in < 100ms with proper indexes.

## Step 9: Connection Pooling Verification

PostgreSQL connection pooling happens automatically via psycopg2-pool. To verify:

```bash
# Check active connections
psql -U bluetech_user -d bluetech_prod -h localhost -c "
SELECT datname, usename, count(*) 
FROM pg_stat_activity 
GROUP BY datname, usename;
"

# Should show:
# datname | usename | count
# bluetech_prod | bluetech_user | 5-20 (depending on active requests)
```

## Step 10: Error Handling Verification

Test error scenarios:

```bash
python << 'EOF'
import os, sys
sys.path.insert(0, 'app')

os.environ['DATABASE_TYPE'] = 'postgresql'
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '5432'
os.environ['DB_NAME'] = 'bluetech_prod'
os.environ['DB_USER'] = 'bluetech_user'
os.environ['DB_PASSWORD'] = 'your_password'

from core.db import db

# Test 1: Query non-existent table
result = db.table('nonexistent_table').select('*').execute()
assert result['error'] is not None, "Should have error for non-existent table"
print("✅ Error handling: non-existent table")

# Test 2: Invalid data type
result = db.table('users').insert({
    'full_name': 'Test',
    'phone_number': 'invalid_phone'
}).execute()
# May or may not error depending on constraints
print("✅ Error handling: invalid data tested")

# Test 3: Empty result
result = db.table('users').select('*').eq('id', 'invalid-uuid').execute()
assert result['data'] == [], "Should return empty list"
assert result['error'] is None, "Should not error on empty result"
print("✅ Error handling: empty result")

print("\n✅ All error handling tests passed")
EOF
```

## Performance Tuning

### Indexes

All critical tables have indexes for query performance:

```bash
psql -U bluetech_user -d bluetech_prod -h localhost -c "\d+ products"
# Should show indexes on: is_active, category, featured
```

### Connection Pool Tuning

If experiencing connection issues, adjust in `db_connection.py`:

```python
# Current settings:
pg_pool = pool.SimpleConnectionPool(
    5,    # minconn: minimum connections to maintain
    20,   # maxconn: maximum connections allowed
    dsn,
)
```

For high-load scenarios (1000+ req/sec):
- Increase minconn to 10-20
- Increase maxconn to 50-100
- Monitor PostgreSQL `max_connections` setting

## Troubleshooting

### Connection Timeout

```
psycopg2.OperationalError: could not connect to server
```

Check:
- PostgreSQL is running: `sudo systemctl status postgresql`
- Connection string is correct
- Firewall allows port 5432
- Database and user exist

### Authentication Failed

```
psycopg2.OperationalError: FATAL: password authentication failed
```

Verify credentials:
```bash
psql -U bluetech_user -d bluetech_prod -h localhost -W
# Enter password when prompted
```

### Connection Pool Exhausted

```
pool.PoolError: connection pool exhausted
```

Indicates too many concurrent connections. Check:
- Application is properly closing connections (should be automatic)
- No connection leaks in error handling
- Increase maxconn in `db_connection.py`

### Slow Queries

Use EXPLAIN ANALYZE:

```bash
psql -U bluetech_user -d bluetech_prod -h localhost -c "
EXPLAIN ANALYZE
SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 20;
"
```

Should use indexes, not sequential scans.

## Verification Checklist

- [ ] All 16 tables created successfully
- [ ] Delivery zones seeded (5 zones present)
- [ ] Health check endpoint returns "connected"
- [ ] Application starts without errors
- [ ] Test suite: 25/25 tests pass
- [ ] SELECT query returns correct data
- [ ] INSERT creates new records
- [ ] UPDATE modifies existing records
- [ ] DELETE removes records
- [ ] Error handling works correctly
- [ ] Performance acceptable (< 100ms queries)
- [ ] Connection pooling active (5-20 connections)

## Next Steps

Once all checks pass:
1. Load production data (if migrating from Supabase)
2. Set up automated backups
3. Configure monitoring and alerts
4. Deploy application to production
5. Verify with real user traffic

See `DATABASE_SWITCHING.md` for production switching procedures.
