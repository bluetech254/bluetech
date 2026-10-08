# PostgreSQL Setup Guide for cPanel

Complete step-by-step guide to set up PostgreSQL database and user on cPanel for BlueTech production.

## Prerequisites

- cPanel hosting account with PostgreSQL support
- SSH access to cPanel server
- PostgreSQL already installed on cPanel (verify: `psql --version`)
- Database quotas available in cPanel

## Step 1: Create Database via cPanel UI

1. Log into cPanel
2. Navigate to **Databases → PostgreSQL Databases**
3. Click **Create New Database**
4. Enter database name: `bluetech_prod` (or `bluetech_yourdomain`)
5. Click **Create Database**
6. Note the database name (will be used in connection string)

**Database Name Format on cPanel:**
```
cpanel_username_databasename
```
Example: If your cPanel username is `hosting` and you enter `bluetech_prod`, the actual database name will be:
```
hosting_bluetech_prod
```

## Step 2: Create Database User via cPanel UI

1. In **PostgreSQL Users**, click **Create New User**
2. Enter username: `bluetech_user` (or similar)
3. Enter and confirm password: Use a strong password (20+ chars, mix of upper/lower/numbers/symbols)
4. Click **Create User**
5. Note the username (will be cpanel_username_bluetech_user)

**Example User Format:**
```
hosting_bluetech_user
```

## Step 3: Assign Privileges

1. In **PostgreSQL User Assignment**
2. Select the user from dropdown: `hosting_bluetech_user`
3. Select the database: `hosting_bluetech_prod`
4. Check **ALL PRIVILEGES**
5. Click **Assign Privileges to Database**

## Step 4: Verify Connection Locally (via SSH)

Test the PostgreSQL connection:

```bash
# SSH into cPanel server
ssh cpanel_username@your.cpanel.domain.com

# Test connection with psql
psql -U hosting_bluetech_user -d hosting_bluetech_prod -h localhost

# Password: (enter the password you created)

# If successful, you'll see:
# psql (14.0, server 14.0)
# hosting_bluetech_prod=>

# Exit psql
\q
```

## Step 5: Find Your PostgreSQL Connection Details

### Local Connection (from cPanel server)

```bash
DATABASE_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hosting_bluetech_prod
DB_USER=hosting_bluetech_user
DB_PASSWORD=your_secure_password
```

### Remote Connection (from external server, if allowed)

Some cPanel hosts allow remote PostgreSQL connections. Check:

```bash
# SSH to server and check if remote access is enabled
grep -i "listen_addresses" /var/lib/pgsql/data/postgresql.conf

# Should show: listen_addresses = '*' or listen_addresses = 'your.server.ip'
```

If remote access is enabled:

```bash
DATABASE_TYPE=postgresql
DB_HOST=your.cpanel.domain.com    # or direct IP address
DB_PORT=5432                       # usually 5432, may be different
DB_NAME=hosting_bluetech_prod
DB_USER=hosting_bluetech_user
DB_PASSWORD=your_secure_password
```

### Finding Your Host Address

```bash
# SSH to server
ssh cpanel_username@your.cpanel.domain.com

# Get server IP/hostname
hostname -f           # Returns FQDN
ip addr show          # Shows IP addresses

# For cPanel, use the primary IP or domain name
# Usually: dedicated-ip.example.com or your.cpanel.domain.com
```

## Step 6: Test Remote Connection (Optional)

From your local machine:

```bash
# Install psql client (if not already installed)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql-client

# Test connection
psql -h your.cpanel.domain.com \
     -p 5432 \
     -U hosting_bluetech_user \
     -d hosting_bluetech_prod

# If successful, you'll see the psql prompt
# If fails, remote access may not be enabled
```

## Step 7: Create Database Schema

See `schema.sql` (to be generated in next task) for the complete schema setup.

Quick setup:

```bash
# SSH to cPanel server
ssh cpanel_username@your.cpanel.domain.com

# Navigate to project directory
cd /home/cpanel_username/public_html/bluetech  # or wherever deployed

# Run schema migration
psql -U hosting_bluetech_user -d hosting_bluetech_prod < backend/schema.sql

# Verify tables were created
psql -U hosting_bluetech_user -d hosting_bluetech_prod

# In psql prompt:
\dt                    # List all tables
\d users               # Describe users table
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
\q
```

## Connection Details Reference

Fill in your actual values:

| Parameter | Value | Notes |
|-----------|-------|-------|
| DATABASE_TYPE | postgresql | Required |
| DB_HOST | `hosting.cpanel.domain.com` | From Step 5 |
| DB_PORT | 5432 | Default PostgreSQL port |
| DB_NAME | `hosting_bluetech_prod` | From Step 1 (includes cpanel_username prefix) |
| DB_USER | `hosting_bluetech_user` | From Step 2 (includes cpanel_username prefix) |
| DB_PASSWORD | (your password) | From Step 2 |

## Troubleshooting

### "psql: could not connect to server"

**Check 1:** Is PostgreSQL running?
```bash
# SSH to server
sudo systemctl status postgresql
# Should show: active (running)
```

**Check 2:** Are credentials correct?
- Double-check username and password (note cPanel username prefix)
- Verify database name includes prefix

**Check 3:** Is remote access allowed?
- Some cPanel hosts restrict remote PostgreSQL connections
- Check with hosting provider or cPanel admin
- May need to request firewall rule opening

### "FATAL: Ident authentication failed"

This means the server requires identity-based authentication. Contact hosting provider to enable password authentication.

### "Database does not exist" or "Role does not exist"

- Verify you're using the full cPanel-prefixed names
- Check cPanel UI to confirm exact database and user names
- Recheck Step 1 and Step 2

### "Password authentication failed"

- Verify password is correct (copy from cPanel)
- Check for special characters in password (may need escaping)
- Reset password in cPanel UI if uncertain

## Security Best Practices

1. **Strong Password**
   - 20+ characters
   - Mix uppercase, lowercase, numbers, symbols
   - No dictionary words or patterns
   - Generated password recommended: `$(openssl rand -base64 20)`

2. **Limit Privileges**
   - Never use cPanel admin account for app database
   - Create dedicated database user with minimum required privileges
   - Avoid `SUPERUSER` privilege

3. **Firewall Rules**
   - If remote access enabled, restrict to known IPs only
   - Use cPanel CSF (ConfigServer Firewall) if available
   - Monitor connection logs for suspicious activity

4. **Connection String Storage**
   - Never commit `.env.production` to git
   - Use environment variables or secrets manager
   - Rotate credentials periodically

5. **Regular Backups**
   - Schedule automatic PostgreSQL backups
   - Store backups outside production server
   - Test restore procedure monthly

## Environment Variable Setup

Create `.env.production` file (never commit to git):

```bash
# .env.production
DATABASE_TYPE=postgresql
DB_HOST=hosting.cpanel.domain.com
DB_PORT=5432
DB_NAME=hosting_bluetech_prod
DB_USER=hosting_bluetech_user
DB_PASSWORD=your_secure_password
```

Load in application startup:

```bash
# In deployment script or systemd service file
source /path/to/.env.production
export DATABASE_TYPE DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD

# Then start application
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Verify Setup

Once schema is loaded and application started:

```bash
# Health check endpoint
curl http://localhost:8000/health/db
# Expected response: {"status": "healthy", "database": "connected"}

# Application logs should show:
# ✓ Database connection OK
# ✓ All startup checks passed
```

## Next Steps

1. Load schema via `schema.sql`
2. Set environment variables in production
3. Start application with PostgreSQL backend
4. Run test suite to verify all operations
5. Monitor logs for any connection or query errors

See `DATABASE_SWITCHING.md` for runtime switching between backends.
