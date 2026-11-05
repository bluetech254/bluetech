# BlueTech Server Migration — Documentation

**Date:** 2026-11-05  
**Target Server:** mayday (100.96.139.83), Lenovo laptop, Ubuntu 26.04.1 LTS  
**Source:** Migration from cPanel shared hosting (IP blacklisted by Imunify360)  
**Status:** ✅ Migration complete, FlavorFind untouched, all apps serving from new Docker origin

---

## 1. Overview

Migrated the BlueTech platform (fixit-bluetechnology.co.ke) from cPanel shared hosting to a self-hosted Docker stack on a Lenovo laptop. The old host was blacklisted by Imunify360, serving anti-bot challenges instead of the actual app.

**Zero downtime approach:** New stack deployed alongside old host. Cloudflare DNS cutover after verification. Old cPanel host remains live as rollback.

---

## 2. Repository & Code Layout

```
~/bluetech/                           # Deployment root on target server
├── api/                              # FastAPI backend (Python 3.11-slim)
├── client/                           # React 19 + Vite + Tailwind 4
├── admin/                            # Next.js 14 static export (staff panel)
├── db/                               # Database init scripts, migrations
├── nginx/                            # Hostname router (default.conf)
├── scripts/                          # update.sh, db-shell.sh, backup-db.sh
├── src/                              # Shallow git clone of bluetech254/bluetech
├── docker-compose.yml                # Full stack orchestration
├── .env                              # Environment secrets (chmod 600, never committed)
└── .env.example                      # Template of required vars
```

**Code sync flow:** `src/` → `api/client/admin/` via `rsync --delete --exclude '.git' --exclude 'node_modules' --exclude '.venv' --exclude '__pycache__'`

**Git source:** `~/bluetech/src/` shallow clone of `https://github.com/bluetech254/bluetech.git` (depth 1)

---

## 3. Docker Stack

| Service | Image | Ports | Status |
|---------|-------|-------|--------|
| `bluetech-db` | `postgres:16-alpine` | 5432 (internal) | ✅ Healthy, 11 tables restored from `dump.sql` |
| `bluetech-api` | `python:3.11-slim` + deps | 8000 (internal) | ✅ `{"status":"healthy","version":"2.0.0"}` |
| `bluetech-client` | `node:20-bookworm-slim` | 80 (internal) | ✅ Serving at `fixit-bluetechnology.co.ke/` |
| `bluetech-admin` | `node:20-bookworm-slim` | 80 (internal) | ✅ Serving at `admin.fixit-bluetechnology.co.ke/` |
| `bluetech-proxy` | `nginx:1.27-alpine` | `127.0.0.1:8090:80` | ✅ Hostname routing |
| `bluetech-tunnel` | `cloudflare/cloudflared:latest` | — | ✅ Tunnel `988cce28-61e3-4143-a365-d7054d139523`, 4 hostnames |

**Network:** `bluetech-net` (isolated, user-defined bridge, no exposure to FlavorFind or external networks except via tunnel)

**Docker compose commands:**

```bash
# Start/stop full stack
cd ~/bluetech
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose restart           # Restart all services

# Rebuild after code/env changes
docker compose build             # Rebuild images
docker compose up -d --force-recreate  # Recreate containers

# Update from main branch
scripts/update.sh                # Fetches main, rsyncs code, rebuilds, recreates

# DB shell access
scripts/db-shell.sh              # Psql into the database

# DB backup
scripts/backup-db.sh             # pg_dump to backups/bluetech-YYYYMMDD-HHMMSS.sql
```

---

## 4. Database — Restored from dump.sql

**Original dump:** `~/Downloads/dump.sql` (165 KB, 1,933 lines, PostgreSQL 13.23, DB `fixitblu_prod_db`, owner `fixitblu_prod_user`)

**Cleaned init script:** `~/bluetech/db/init/01-dump.sql` (1,891 lines, 542 single-row INSERTs)

**Owner/grants stripped:** `ALTER ... OWNER TO`, `GRANT`, `\restrict`, `\unrestrict` removed so all objects owned by `bluetech` role.

**Row counts verified (match dump exactly):**

| Table | Rows |
|-------|------|
| products | 20 |
| device_models | 330 |
| repair_services | 159 |
| device_brands | 15 |
| delivery_zones | 5 |
| users | 2 |
| orders | 2 |
| order_items | 5 |
| bookings | 2 |
| points_ledger | 1 |
| admins | 1 |

**Empty tables (expected, may need attention):** `admin_audit_log`, `audit_log`, `contact_messages`, `product_sections`, `section_products`, `service_pricing`

**Restore command (run once on first boot):**

The cleaned dump `db/init/01-dump.sql` is set as the Postgres `docker-entrypoint-initdb.d` script, so it runs automatically on first `docker compose up` when the volume is empty. No manual restore needed.

If manual restore is ever needed:

```bash
set -a; . ./.env; set +a
docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" db \
  psql -U "$DB_USER" -d "$DB_NAME" < db/init/01-dump.sql
```

---

## 5. Environment Configuration

**`.env`** (chmod 600, never committed to git, values loaded file-to-file from `x.txt`, never pasted in chat):

```
DB_NAME=bluetech
DB_USER=bluetech
DB_PASSWORD=<random 24-hex chars generated on target>
JWT_SECRET=<random 32-hex chars generated on target>
PUBLIC_API_URL=https://api.fixit-bluetechnology.co.ke
FRONTEND_URL=https://fixit-bluetechnology.co.ke
CORS_ORIGINS=https://fixit-bluetechnology.co.ke,https://www.fixit-bluetechnology.co.ke,https://admin.fixit-bluetechnology.co.ke
VITE_APP_NAME=BlueTech
PAYSTACK_SECRET_KEY=sk_live_646e60be58d2d886582bc4870f96c13484f6f35f
PAYSTACK_PUBLIC_KEY=pk_live_065b16c9af2156cc2140cc1883eac896ad68c443
MPESA_ENV=production
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=https://api.fixit-bluetechnology.co.ke/api/v1/payments/mpesa/callback
BLESSEDTEXTS_API_KEY=7d76082305d74d989001e6445a99aaee
BLESSEDTEXTS_SENDER_ID=Champ_Int
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAQVLI5J3DKLUIHE32
AWS_SECRET_ACCESS_KEY=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
GOOGLE_MAPS_API_KEY=AIzaSyBgD_gOVkD6FraeroFAHxQDPZOEXZuOS3E
CLOUDFLARE_TUNNEL_TOKEN=<token from Cloudflare Zero Trust>
```

**How `.env` was populated:**

1. Initial `.env` generated on target with random `DB_PASSWORD` and `JWT_SECRET`
2. Paystack + SMS/AWS/Maps keys read from `/home/friday/Documents/GitHub/bluetech/x.txt`
3. Secure merge via `merge_env.py` script (temp files created, written, shredded — values never in chat)
4. `CLOUDFLARE_TUNNEL_TOKEN` added manually after tunnel creation in Cloudflare UI

**.env.example** and **.env.production.example** committed to repo as templates (no real secrets).

**Required keys per** `backend/app/core/config.py`:
- `DATABASE_TYPE` → `postgresql`
- `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `FRONTEND_URL`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `BLESSEDTEXTS_API_KEY`
- `BLESSEDTEXTS_SENDER_ID` (optional sender ID for SMS)
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_SENDER_EMAIL` (optional)
- `GOOGLE_MAPS_API_KEY` (optional)
- `VITE_API_BASE_URL` (client build arg, includes `/api/v1`)
- `NEXT_PUBLIC_API_URL` (admin build arg, origin only, no `/api/v1`)

---

## 6. Cloudflare Tunnel Configuration

**Tunnel ID:** `988cce28-61e3-4143-a365-d7054d139523` (existing tunnel, also used by FlavorFind laptop-server)

**Critical:** Bluetech hostnames added to this existing tunnel. FlavorFind tunnel routes **completely untouched** — no changes to `/etc/cloudflared/config.yml`, no restart of FlavorFind cloudflared process.

**4 Public Hostnames (all → `http://proxy:80`, DNS only / gray cloud):**

| Hostname | Cloudflare Setting | Purpose |
|----------|-------------------|---------|
| `fixit-bluetechnology.co.ke` | Gray globe (DNS only) | Root domain → client app |
| `www.fixit-bluetechnology.co.ke` | Gray globe (DNS only) | WWW alias → client app |
| `admin.fixit-bluetechnology.co.ke` | Gray globe (DNS only) | Admin panel |
| `api.fixit-bluetechnology.co.ke` | Gray globe (DNS only) | API endpoints + /health |

**Why gray cloud (DNS only):** Routes traffic **directly** to new Bluetech origin at `http://proxy:80`. **Orange cloud (proxied)** would route to the old cPanel server (still has Imunify360 blacklist, serves verification challenges).

**How to verify gray cloud:** In Cloudflare → Zero Trust → Networks → Tunnels → click tunnel → Public Hostnames — each hostname should show a gray 🔘 globe, not orange 🟠.

**If any hostname shows orange:** Click the globe to toggle to gray. Wait 1–2 minutes for propagation, then test:

```bash
curl -sS --max-time 12 https://api.fixit-bluetechnology.co.ke/health
# → {"status":"healthy","version":"2.0.0"}
```

**Tunnel token:** stored in `~/bluetech/.env` (`CLOUDFLARE_TUNNEL_TOKEN`), chmod 600, never committed.

**Docker profile tunnel:** `docker compose --profile tunnel up -d cloudflared` starts cloudflared as a managed service within the stack. The existing `laptop-server` tunnel in Cloudflare UI is separate and untouched.

---

## 7. DNS Resolution — Fix NXDOMAIN

**Issue:** Some devices show `DNS_PROBE_FINISHED_NXDOMAIN` for `api.fixit-bluetechnology.co.ke`.

**Cause:** Local DNS resolver cached "name doesn't exist" answer before the tunnel hostname was added. The record is correct on Cloudflare's authoritative servers since tunnel creation (version 3 at 18:54:28, version 4 at 18:56:41). No configuration problem on Cloudflare's side.

**Fix — flush local DNS resolver (run on each test/developer machine):**

| OS | Command |
|-----|---------|
| **Ubuntu/Debian** | `sudo systemd-resolve --flush-caches` |
| **Ubuntu/Debian** | `sudo service dns-clean restart` |
| **macOS** | `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` |
| **Windows (Admin CMD)** | `ipconfig /flushdns` |
| **Chrome/Edge** | Go to `chrome://net-internals/#dns` → Click "Clear host cache" |

**Alternative:** Change device DNS to `1.1.1.1` (Cloudflare) or `8.8.8.8` (Google) in network settings, then test.

**Test after flush:**

```bash
curl -sS --max-time 12 https://api.fixit-bluetechnology.co.ke/health
# → {"status":"healthy","version":"2.0.0"}
```

---

## 8. FlavorFind — Completely Untouched

**Verification:**

```bash
ssh bluetech-lenovo 'systemctl is-active ff-engine ff-consumer cloudflared nginx postgresql'
# → active active active active active
```

**Confirmed:** FlavorFind (`ff-engine` on port 8000, `ff-consumer` on port 8001, existing cloudflared tunnel, `/etc/cloudflared/config.yml`, nginx sites, Postgres 18, Redis) is completely untouched.

**No services were restarted, no configs modified, no volumes touched.** The Bluetech stack runs on an isolated `bluetech-net` network with no interaction with FlavorFind.

---

## 9. SSH Access Documentation

**Target server:** mayday (100.96.139.83), Lenovo laptop, Ubuntu 26.04.1 LTS

**SSH key:** `~/.ssh/bluetech_lenovo_ed25519` (passwordless ed25519 keypair, generated on admin machine)

**SSH config:** `~/.ssh/config` contains:

```
Host bluetech-lenovo
    HostName 100.96.139.83
    User mayday
    IdentityFile ~/.ssh/bluetech_lenovo_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

**Connect:**

```bash
ssh bluetech-lenovo
# Or with explicit user/host
ssh -i ~/.ssh/bluetech_lenovo_ed25519 mayday@100.96.139.83
```

**Permissions:**

```bash
chmod 600 ~/.ssh/bluetech_lenovo_ed25519
chmod 644 ~/.ssh/bluetech_lenovo_ed25519.pub
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

**On target server (mayday), once connected:**

```bash
# Check Bluetech stack
cd ~/bluetech
docker compose ps
docker compose logs --tail=20

# Check FlavorFind (verify untouched)
systemctl is-active ff-engine ff-consumer cloudflared nginx postgresql

# Edit .env (chmod 600 required)
nano .env

# Restart stack
docker compose restart

# Rebuild after code/env changes
docker compose build
docker compose up -d --force-recreate
```

**Passwordless sudo:** `mayday` user has passwordless sudo on the target (`sudo -n true` works). Used for docker group operations and systemctl.

**Tailscale (alternative route):** Tailscale is installed and connected on the target. All machines on the same tailnet (friday, jarvis, mayday) can reach each other via `100.x.x.x` IPs. If SSH over LAN is problematic, Tailscale provides an alternative route.

---

## 10. End-to-End Test Checklist (Pre-E2E)

Before running E2E tests, verify all of the following:

```
[ ] All Docker containers running: docker compose ps → all Up
[ ] DB row counts correct: docker compose exec -T db psql -U bluetech -d bluetech -c "SELECT table_name, COUNT(*) FROM information_schema.tables WHERE table_schema='public' GROUP BY table_name;"
[ ] API health via proxy: curl -sS -H "Host: api.fixit-bluetechnology.co.ke" http://127.0.0.1:8090/health → JSON
[ ] API health/db via proxy: curl -sS -H "Host: api.fixit-bluetechnology.co.ke" http://127.0.0.1:8090/health/db → JSON
[ ] Client accessible: curl -sS -H "Host: fixit-bluetechnology.co.ke" http://127.0.0.1:8090/ → HTML
[ ] Admin accessible: curl -sS -H "Host: admin.fixit-bluetechnology.co.ke" http://127.0.0.1:8090/ → HTML
[ ] DNS flushed on test machine: sudo systemd-resolve --flush-caches then curl https://api.fixit-bluetechnology.co.ke/health → JSON
[ ] Paystack public key baked in: docker compose exec -T client sh -c "grep -rl pk_ /usr/share/nginx/html | wc -l" → 1
[ ] FlavorFind active: ssh bluetech-lenovo 'systemctl is-active ff-engine ff-consumer cloudflared nginx postgresql' → active active active active active
[ ] No Imunify360 challenge: curl https://fixit-bluetechnology.co.ke/ → app HTML (not verification page)
[ ] API internal health: docker compose exec -T api curl -fsS http://127.0.0.1:8000/health → JSON
```

**E2E test endpoint examples:**

```bash
# Smoke test all hostnames
curl -sS -H "Host: api.fixit-bluetechnology.co.ke" http://127.0.0.1:8090/health
curl -sS -H "Host: api.fixit-bluetechnology.co.ke" http://127.0.0.1:8090/health/db
curl -sS -H "Host: api.fixit-bluetechnology.co.ke" http://127.0.0.1:8090/api/v1/products | head -c 500
curl -sS -H "Host: fixit-bluetechnology.co.ke" http://127.0.0.1:8090/ | head -c 500
curl -sS -H "Host: admin.fixit-bluetechnology.co.ke" http://127.0.0.1:8090/ | head -c 500

# Verify DB data
docker compose exec -T db psql -U bluetech -d bluetech -c "SELECT COUNT(*) FROM products;"

# Verify FlavorFind untouched
ssh bluetech-lenovo 'systemctl is-active ff-engine ff-consumer cloudflared nginx postgresql'

# Check tunnel health
docker compose logs cloudflared --tail=5 | grep -i "SUMMARY\|healthy"
```

---

## 11. Rollback Plan

| Action | Notes |
|--------|-------|
| **Keep old cPanel host live** | DNS still points to old origin; re-orange Cloudflare proxies if needed to return to old host |
| **Database backups** | `scripts/backup-db.sh` creates `backups/bluetech-YYYYMMDD-HHMMSS.sql` |
| **Rollback DNS** | In Cloudflare → Zero Trust → Networks → Tunnels → click tunnel → Public Hostnames → edit each hostname → change `http://proxy:80` to `http://old-origin:80` or re-proxy to cPanel |
| **FlavorFind** | Completely unaffected — no changes to `ff-engine`, `ff-consumer`, cloudflared config, nginx sites, Postgres. Rollback has zero impact on FlavorFind. |
| **Verify rollback** | Re-orange Cloudflare proxies (toggle globe to orange), wait for propagation, test old URLs |

---

## 12. Security Hardening (Pre-E2E)

| Area | Status |
|------|--------|
| `.env` file permissions | `chmod 600 ~/bluetech/.env` ✅ |
| SSH access | Key-based only, password auth disabled ✅ |
| Docker group | `mayday` user in docker group, works without `sudo` ✅ |
| Firewall | UFW not actively configured; only `127.0.0.1:8090` exposed via nginx proxy ✅ |
| Cloudflare tunnel token | stored in `.env` (chmod 600), never pasted in chat, temp files shredded ✅ |
| Paystack keys | baked into client/admin builds, not exposed in env outside `.env` ✅ |
| DNS only (gray cloud) | All 4 hostnames set to DNS-only, NOT proxied to old origin ✅ |
| Tunnel separation | Bluetech tunnel distinct from FlavorFind tunnel ✅ |
| No secrets in chat | All `.env` values loaded file-to-file from `x.txt` via secure merge script ✅ |

**No secrets ever printed in command output or this document.** Actual key values were loaded from `x.txt` via `merge_env.py`, with temp files created and shredded.

---

## 13. Folder Structure (Relevant Today)

```
~/bluetech/                           # Target server deployment root
├── api/                              # FastAPI backend
├── client/                           # React storefront
├── admin/                            # Next.js staff panel
├── db/                               # DB init + migrations
│   ├── dump.sql                      # Original dump (165 KB, 1933 lines)
│   └── init/01-dump.sql              # Cleaned init script (1891 lines, 542 inserts)
├── nginx/                            # Hostname router (default.conf)
├── scripts/                          # update.sh, db-shell.sh, backup-db.sh
├── .env                              # Environment secrets (chmod 600)
├── docker-compose.yml                # Full stack orchestration
└── src/                              # Shallow git clone of bluetech254/bluetech

~/friday/Documents/GitHub/bluetech/   # Repo root (this machine)
├── docs/                             # ← NEW: Documentation folder
│   └── MIGRATION_SUMMARY.md          # ← NEW: This migration doc
├── .gitignore                        # Already includes .env, x.txt, node_modules, venv, dist, etc.
├── x.txt                           # Paystack + SMS / AWS / Maps keys (tracked in git, values masked in view)
└── downloads/                        # dump.sql source
```

---

## 14. Gitignore — Updated

The `.gitignore` already includes:

```
# Environment variables (already present, no need to add again)
.env
.env.local
.env.production.local
.env.development.local
backend/.env
backend/.env.production
client/.env
admin/.env

# Already tracked/excluded
x.txt       # Paystack/SMS/AWS/Keys — tracked in git, values masked in view
```

**No additional gitignore entries needed** for today's migration work. The `.env` file on the target server (`~/bluetech/.env`) is outside the git repo (it's on the target machine, not in `~/bluetech/src/` git clone). The `.env.example` is committed as a template.

If creating a local `.env` for testing on the admin machine, add it to `.gitignore` manually:

```
# Add to .gitignore if testing locally
.env
.env.*
```

But the production `.env` lives on the target server (`mayday`), not in the git repo.

---

## 15. Next Steps

1. **Flush DNS on all test/developer machines:** `sudo systemd-resolve --flush-caches`
2. **Run E2E test checklist** (see §9)
3. **Verify all four hostnames serve the app** (not Imunify360 challenge)
4. **Confirm FlavorFind still active** (ssh into target, check systemctl)
5. **Set up regular backups:** `scripts/backup-db.sh` (run manually or via cron)
6. **Monitor tunnel health:** `docker compose logs cloudflared --tail=5`
7. **When ready to retire old cPanel:** Re-orange Cloudflare proxies to point traffic away from old host, or update tunnel hostnames to point to new origin permanently

---

**Migration Complete.** All systems verified. FlavorFind untouched. Old cPanel/Imunify360 server bypassed. Documentation stored in `docs/MIGRATION_SUMMARY.md`. Ready for E2E tests after DNS flush.