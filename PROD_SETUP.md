# Production Setup Guide

## Step 1: Get Production Supabase Credentials

1. Go to your new Supabase prod project dashboard
2. Click **Settings** → **Database**
3. Copy the **Connection String** (looks like: `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres`)
4. Also copy from **Settings** → **API**:
   - Project URL (e.g., `https://PROJECT_REF.supabase.co`)
   - `anon` key (public, safe for frontend)
   - `service_role` key (secret, backend only)

---

## Step 2: Run Migrations on Production Database

The production database needs the same schema as dev.

**Option A: Using the migration script (recommended)**

```bash
cd /path/to/bluetech/scripts

# Create .env with prod credentials
cat > .env << EOF
DB_HOST=db.your-prod-project-ref.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-prod-db-password
EOF

# Run migrations
node migrate.js
```

**Option B: Using psql directly**

```bash
# Connect to prod database and run the migration SQL
psql "postgresql://postgres:PASSWORD@db.your-prod-project-ref.supabase.co:5432/postgres" \
  -f supabase/001_schema.sql
```

**Option C: Using Supabase SQL Editor (web)**

1. In Supabase dashboard → **SQL Editor**
2. Click **+ New Query**
3. Copy contents of `supabase/001_schema.sql` and paste
4. Click **Run**

After migrations, verify tables exist:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

---

## Step 3: Update Backend Environment on cPanel

SSH into cPanel or use their file manager to update your backend `.env`:

```bash
# backend/.env (production on cPanel)
SUPABASE_URL=https://your-prod-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi... (anon key from prod project)
SUPABASE_SERVICE_KEY=eyJhbGciOi... (service_role key from prod project)

# Everything else stays the same
PAYSTACK_SECRET_KEY=sk_live_...
BLESSEDTEXTS_API_KEY=...
# ... etc
```

---

## Step 4: Update GitHub Secret for Backups

1. Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add new secret:
   - **Name**: `SUPABASE_DB_URL`
   - **Value**: `postgresql://postgres:PASSWORD@db.your-prod-project-ref.supabase.co:5432/postgres`
3. Save

This enables weekly automated backups to GitHub.

---

## Step 5: Enable RLS (Row Level Security)

In Supabase prod dashboard → **Authentication** → **Policies**

Enable RLS for these tables (click toggle for each):
- `users`
- `orders`
- `order_items`
- `bookings`
- `products`
- `points_ledger`
- `admin_audit_log`

Then run this SQL to create basic policies:

```sql
-- Users: can only see their own profile
CREATE POLICY "Users see own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Orders: clients see only their own
CREATE POLICY "Users see own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id OR (SELECT role FROM admins WHERE id = auth.uid()) = 'admin');

-- Bookings: clients see only their own
CREATE POLICY "Users see own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id OR (SELECT role FROM admins WHERE id = auth.uid()) = 'admin');

-- Products: everyone can read (public)
CREATE POLICY "Public can read products"
  ON products FOR SELECT
  USING (true);

-- Points ledger: users see only their own
CREATE POLICY "Users see own points"
  ON points_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- Admin audit log: admins only
CREATE POLICY "Admins see audit log"
  ON admin_audit_log FOR SELECT
  USING ((SELECT role FROM admins WHERE id = auth.uid()) = 'admin');
```

---

## Step 6: Test Connection

From cPanel, test the backend can reach the prod database:

```bash
# SSH into cPanel and run
python3 << 'EOF'
import os
from supabase import create_client

url = "https://your-prod-project-ref.supabase.co"
key = "your-prod-service-key"

client = create_client(url, key)
result = client.table("products").select("count", count="exact").execute()
print(f"✅ Connected. Products in DB: {result.count}")
EOF
```

---

## Step 7: Verify Render (dev) Still Works

Confirm Render backend is still using the **original dev** Supabase project and has NOT been changed:

```bash
# Render backend env vars should still point to:
SUPABASE_URL=https://ureebvpesbkbholidlrn.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Checklist

- [ ] New prod Supabase project created
- [ ] Prod credentials copied (URL, keys)
- [ ] Migrations run on prod database
- [ ] Backend .env updated on cPanel with prod credentials
- [ ] GitHub backup secret set with prod DB URL
- [ ] RLS enabled on all tables
- [ ] Backend connection test passed
- [ ] Render dev environment still pointing to dev Supabase
- [ ] Ready for deployment

---

## Rollback (if needed)

If something goes wrong, Render will continue working on the dev database. cPanel backend will fail until you fix the prod .env file. No data loss.
