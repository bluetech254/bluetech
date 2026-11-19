# Bluetech Payments Microservice — Architecture Plan

A standalone **FastAPI** payments microservice with its own dedicated PostgreSQL
database, called over an HTTP API by the other Bluetech applications (core
FastAPI API, client storefront, admin panel).

**Gateway: Payhero only.** This service integrates exclusively with Payhero
(Yetu Sacco custom paybill). It does not contain a Paystack integration. The
legacy Paystack code that still lives in the core app is untouched and separate.

Payment status is written to **two** databases:

- `bluetech-db` — **authoritative** source of truth for order/booking payment
  status. All existing apps keep reading from here, unchanged.
- `payments-db` — **isolated historical/audit** store for gateway transactions,
  reconciliation and disputes.

No Django. No shared schema. Full isolation, incremental wiring.

---

## 1. Goals & Constraints

| Goal | Decision |
|---|---|
| Framework | FastAPI (matches existing Bluetech backend) |
| Isolation | Dedicated `payments-db` container + own volume |
| Integration | Called via API by other apps (not direct DB access to payments data) |
| Source of truth for order/booking status | `bluetech-db` (existing DB) |
| Gateway | **Payhero only** (Yetu Sacco custom paybill) |
| Rollout | Incremental: ordering → bookings → admin |
| Paystack | Not part of this service; remains in the core app until retired separately |

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Bluetech ecosystem                      │
│                                                                │
│   ┌────────────┐   ┌────────────┐   ┌──────────────────────┐   │
│   │ Client UI  │   │ Admin UI   │   │ Core FastAPI (orders │   │
│   │ (React)    │   │ (Next.js)  │   │ bookings, users)     │   │
│   └─────┬──────┘   └─────┬──────┘   └──────────┬───────────┘   │
│         │  HTTP API      │  HTTP API           │  HTTP API     │
│         └────────────────┼─────────────────────┘               │
│                          ▼                                     │
│              ┌───────────────────────────┐                     │
│              │   payments-api (FastAPI)  │                     │
│              │   port 8001, X-API-Key    │                     │
│              └───────────┬───────────────┘                     │
│                          │ dual-write                          │
│            ┌─────────────┴──────────────┐                      │
│            ▼                            ▼                      │
│   ┌──────────────────┐         ┌──────────────────┐            │
│   │  bluetech-db     │         │   payments-db    │            │
│   │  (authoritative) │         │  (isolated/audit)│            │
│   └──────────────────┘         └──────────────────┘            │
│                                                                │
│                          ┌──────────────────┐                  │
│                          │  Payhero (Yetu   │                  │
│                          │  Sacco paybill)  │                  │
│                          └──────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

### Data ownership

| Database | Owns | Read by |
|---|---|---|
| `bluetech-db` | `orders.payment_*`, `bookings.commitment_payment_*`, `bookings.final_payment_*` | Core FastAPI, client, admin |
| `payments-db` | `payments_transaction`, `payments_audit_log`, gateway config | Payments microservice only |

**Key rule:** the payments service writes order/booking status into
`bluetech-db`; it never expects other apps to read `payments-db`.

---

## 3. Infrastructure

### 3.1 docker-compose services

Both services join the existing **external** `bluetech-net` network and use
explicitly named volumes so a compose run can never create a second copy of the
production database.

```yaml
payments-db:
  image: postgres:16-alpine
  container_name: payments-db
  restart: unless-stopped
  environment:
    POSTGRES_DB: payments
    POSTGRES_USER: payments_user
    POSTGRES_PASSWORD: ${PAYMENTS_DB_PASSWORD}
  volumes:
    - payments_pgdata:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U payments_user -d payments"]
    interval: 10s
    timeout: 5s
    retries: 12
  networks:
    - bluetech

payments-api:
  build: ./payments
  container_name: payments-api
  restart: unless-stopped
  env_file:
    - .env
  environment:
    PAYMENTS_GATEWAY: ${PAYMENTS_GATEWAY:-payhero}
  depends_on:
    payments-db:
      condition: service_healthy
    db:
      condition: service_healthy
  networks:
    - bluetech

networks:
  bluetech:
    external: true
    name: bluetech-net

volumes:
  payments_pgdata:
    name: bluetech_payments_pgdata
```

`payments-api` is not published on the host; nginx reaches it at
`http://payments-api:8001` over the Docker network.

### 3.2 Environment variables

```env
# Payments DB (isolated)
PAYMENTS_DB_HOST=payments-db
PAYMENTS_DB_PORT=5432
PAYMENTS_DB_NAME=payments
PAYMENTS_DB_USER=payments_user
PAYMENTS_DB_PASSWORD=<secure>

# Bluetech main DB (authoritative)
DB_HOST=db
DB_PORT=5432
DB_NAME=bluetech
DB_USER=postgres
DB_PASSWORD=<existing>

# Payments microservice
PAYMENTS_API_KEY=<long-random-string>

# Gateway (Payhero only)
PAYMENTS_GATEWAY=payhero
PAYHERO_API_URL=https://api.payhero.co.ke/api/v2
PAYHERO_API_USERNAME=<payhero username>
PAYHERO_API_PASSWORD=<payhero password>
PAYHERO_CHANNEL_ID=<channel id>
PAYHERO_CALLBACK_SECRET=<callback shared secret>
```

No `PAYSTACK_*` variables are read by this service.

### 3.3 nginx routing

```
pay.fixit-bluetechnology.co.ke  ->  http://payments-api:8001
```

Exposed through the Cloudflare tunnel like the other hostnames.

---

## 4. Project Structure (`/payments`)

```
payments/
├── ARCHITECTURE.md
├── Dockerfile
├── requirements.txt
├── .env.example
├── app/
│   ├── main.py               # FastAPI app factory + routers
│   ├── config.py             # settings from env
│   ├── db.py                 # two pools: bluetech + payments
│   ├── auth.py               # X-API-Key dependency
│   ├── schemas.py            # Pydantic request/response models
│   ├── limiter.py            # rate limiting
│   ├── api/
│   │   ├── order.py          # order init / verify / status
│   │   ├── commitment.py     # booking commitment init / verify / status
│   │   ├── final.py          # booking final request / verify / status
│   │   └── webhook.py        # Payhero webhook
│   ├── gateways/
│   │   ├── base.py           # Gateway interface (protocol)
│   │   └── payhero.py        # the only gateway
│   └── services/
│       ├── payments.py       # dual-write + verification logic
│       └── audit.py          # audit logging
└── scripts/
    └── init_db.py            # create payments-db tables
```

---

## 5. Gateway Interface (Payhero only)

The registry exposes exactly one gateway; there is no selection between
providers. `PAYMENTS_GATEWAY` must be `payhero`.

```python
# app/gateways/base.py
from typing import Protocol

class Gateway(Protocol):
    name: str

    def initialize_transaction(
        self,
        *,
        email: str,
        amount_kes: float,
        reference: str,
        callback_url: str | None,
        phone_number: str,
        metadata: dict | None = None,
    ) -> dict:  # {reference, gateway, requires_stk, raw, ...}
        ...

    def verify_transaction(self, reference: str) -> dict:
        # {status, amount_kes, reference, gateway, receipt, raw}
        ...

    def verify_webhook(self, raw_body: bytes, headers: dict) -> bool: ...
```

- `payhero.py` — Payhero STK push against the Yetu Sacco custom paybill.

Because Payhero pushes an STK prompt, `initiate` returns `requires_stk: true`
and no `authorization_url`. The customer approves on their phone; status is
confirmed by webhook and/or polling `verify`.

---

## 6. API Contract

All routes require `X-API-Key` (except the public Payhero webhook, which is
authenticated by the callback shared secret).

### Order payments
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/order/{order_id}/initiate` | Send STK prompt |
| POST | `/api/v1/order/verify/{reference}` | Verify + dual-write, return status |
| GET  | `/api/v1/order/{order_id}/status` | Read current status |

### Booking commitment (20% fee)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/booking/{booking_id}/commitment/initiate` | Send STK prompt |
| POST | `/api/v1/booking/commitment/verify/{reference}` | Verify + dual-write |
| GET  | `/api/v1/booking/{booking_id}/commitment/status` | Read current status |

### Booking final payment
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/booking/{booking_id}/final/request` | Admin requests final payment |
| POST | `/api/v1/booking/final/verify/{reference}` | Verify, move ready → completed |
| GET  | `/api/v1/booking/{booking_id}/final/status` | Read current status |

### Webhooks
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/webhook/payhero` | Payhero payment callback |

### Health
| Method | Path |
|---|---|
| GET | `/health` |

---

## 7. Dual-Write Logic

The core of the design. Runs inside `verify_transaction` and the webhook path.

```python
def apply_payment_result(kind, reference, receipt, result):
    # 1) Authoritative write -> bluetech-db
    if kind == "order":
        bluetech.execute(
            """UPDATE orders
                  SET payment_status = 'paid',
                      payment_receipt = %s
                WHERE payment_reference = %s""",
            (receipt, reference),
        )
    elif kind == "commitment":
        bluetech.execute(
            """UPDATE bookings
                  SET commitment_payment_status = 'paid',
                      commitment_receipt = %s
                WHERE commitment_payment_reference = %s""",
            (receipt, reference),
        )
    elif kind == "final":
        bluetech.execute(
            """UPDATE bookings
                  SET final_payment_status = 'paid',
                      final_receipt = %s,
                      status = CASE WHEN status = 'ready'
                                    THEN 'completed'::booking_status
                                    ELSE status END
                WHERE final_payment_reference = %s""",
            (receipt, reference),
        )

    # 2) Historical write -> payments-db (best effort)
    payments.execute(
        """INSERT INTO payments_transaction
             (gateway, gateway_ref, kind, entity_id, amount_kes, status, raw,
              created_at, updated_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, NOW(), NOW())
           ON CONFLICT (gateway_ref) DO UPDATE SET
             status = EXCLUDED.status,
             raw = EXCLUDED.raw,
             updated_at = NOW()""",
        (result["gateway"], reference, kind, entity_id,
         result["amount_kes"], result["status"], json.dumps(result["raw"])),
    )
```

### Consistency rules
- `bluetech-db` is authoritative. If that write fails, the request fails and the
  caller retries — no half-applied status.
- `payments-db` is best-effort/historical: if it is down, order/booking status in
  `bluetech-db` is still correct and the payment is not blocked.
- Webhooks are idempotent: re-processing the same `reference` updates the same
  rows (unique constraint on `gateway_ref`) and does not double-apply.

---

## 8. Frontend Integration (STK, no redirect)

There is no Paystack inline JS in this flow. The app calls `initiate`, then waits
for the customer to approve the STK prompt and polls `status`/`verify`.

```tsx
const res = await fetch(`${PAYMENTS_API_URL}/api/v1/order/${orderId}/initiate`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-Key": PAYMENTS_API_KEY },
  body: JSON.stringify({ metadata: { phone: phoneNumber } }),
});
const { reference, requires_stk } = await res.json();
// show "Check your phone and enter your M-Pesa PIN"
// then poll GET /api/v1/order/{orderId}/status until paid
```

Admin final-payment requests follow the same pattern.

---

## 9. Rollout Plan (incremental)

| Step | Change | Risk |
|---|---|---|
| 1 | Stand up `payments-db` + `payments-api`, no traffic | none |
| 2 | Add Payhero credentials, sandbox test STK + webhook | none |
| 3 | Route **order** payments to payments-api | low |
| 4 | Route **booking commitment** payments | low |
| 5 | Route **booking final** payments (admin) | low |
| 6 | Retire the legacy Paystack flow in the core app (separate task) | none |

Each step is independently reversible by flipping the calling route.

---

## 10. Security

- `X-API-Key` required on all non-webhook routes (long random secret, rotated).
- Payhero webhook verified by the callback shared secret.
- `payments-db` reachable only on the internal Docker network; not published.
- `payments-api` exposed only through nginx/Cloudflare.
- Payhero credentials live in `.env`, never in code or git.
- Audit log records caller, IP, action and timestamp for every status change.

---

## 11. Testing Checklist

- [ ] `docker compose config` validates compose file
- [ ] `payments-db` healthy; `init_db.py` creates tables
- [ ] `/health` returns 200 with both databases `up`
- [ ] Order initiate sends an STK prompt (`requires_stk: true`)
- [ ] Order verify updates `orders.payment_status` in `bluetech-db`
- [ ] Commitment init/verify updates `bookings.commitment_payment_status`
- [ ] Final request/verify moves booking `ready → completed`
- [ ] Payhero webhook replayed twice does not double-apply (idempotent)
- [ ] Invalid `X-API-Key` returns 403
- [ ] Invalid webhook secret returns 400
- [ ] `POST /api/v1/webhook/paystack` returns 404 (Paystack not part of this service)
- [ ] Payhero custom paybill routes to Yetu Sacco
- [ ] `payments-db` contains one transaction row per successful payment

---

## 12. Success Criteria

| Metric | Target |
|---|---|
| Uptime | 99.9% (parity with core API) |
| Payment init/verify latency | < 2 s |
| Status consistency | 100% between Payhero and `bluetech-db` |
| Breaking changes to existing apps | 0 |
| Audit coverage | every transaction recorded in `payments-db` |
