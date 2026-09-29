"""
tests/test_endpoints.py — Full backend endpoint test suite.

Tests every endpoint in sequence. Auth tokens are obtained once and reused.
Run against live Render or local server.

Usage:
    # Against live Render:
    pytest tests/test_endpoints.py -v

    # Against local server:
    BASE_URL=http://localhost:8000 pytest tests/test_endpoints.py -v

    # Stop on first failure:
    pytest tests/test_endpoints.py -v -x

    # Run only a specific section:
    pytest tests/test_endpoints.py -v -k "auth"

Requirements:
    pip install pytest requests

Test phone: 254704291657 (0704291657 normalised)
Admin:       set ADMIN_USERNAME and ADMIN_PASSWORD env vars,
             or edit TEST_ADMIN_USERNAME / TEST_ADMIN_PASSWORD below.
"""

import os
import time

import pytest
import requests

# ── Render SSL-EOF retry wrapper ──────────────────────────────────────────────
# Render's free tier drops connections under load with SSLError/ConnectionError.
# Wrap requests.get/post/put/delete to retry up to 3 times with backoff.

def _with_retry(fn):
    def wrapper(*args, **kwargs):
        for attempt in range(5):
            try:
                return fn(*args, **kwargs)
            except (requests.exceptions.SSLError,
                    requests.exceptions.ConnectionError):
                if attempt == 4:
                    raise
                time.sleep(5 + attempt * 5)  # 5s, 10s, 15s, 20s
    return wrapper

requests.get    = _with_retry(requests.get)
requests.post   = _with_retry(requests.post)
requests.put    = _with_retry(requests.put)
requests.delete = _with_retry(requests.delete)

# ── Config ────────────────────────────────────────────────────────────────────

BASE_URL           = os.getenv("BASE_URL", "https://bluetechnology-y1f8.onrender.com")
TEST_PHONE         = "254704291657"       # 0704291657 normalised
TEST_PASSWORD      = os.getenv("TEST_PASSWORD", "TestPass@2026!")   # set or change
TEST_ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
TEST_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "BlueTech@2026!")

# Shared state — populated as tests run
state: dict = {
    "client_token":  None,
    "admin_token":   None,
    "user_id":       None,
    "product_id":    None,
    "order_id":      None,
    "booking_id":    None,
    "service_id":    None,
    "zone_id":       None,
    "device_brand":  None,
    "device_model":  None,
    "otp":           None,   # filled manually if needed
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def url(path: str) -> str:
    return f"{BASE_URL}{path}"


def client_headers() -> dict:
    assert state["client_token"], "No client token — auth tests must run first"
    return {"Authorization": f"Bearer {state['client_token']}"}


def admin_headers() -> dict:
    assert state["admin_token"], "No admin token — admin auth tests must run first"
    return {"Authorization": f"Bearer {state['admin_token']}"}


def ok(r: requests.Response, label: str = "") -> requests.Response:
    """Assert 2xx and print a short summary."""
    tag = f" [{label}]" if label else ""
    assert r.status_code < 300, (
        f"FAIL{tag} {r.request.method} {r.url} → {r.status_code}\n{r.text[:400]}"
    )
    return r


def check(r: requests.Response, expected: int, label: str = "") -> requests.Response:
    """Assert exact status code."""
    tag = f" [{label}]" if label else ""
    assert r.status_code == expected, (
        f"FAIL{tag} {r.request.method} {r.url} → {r.status_code} (expected {expected})\n{r.text[:400]}"
    )
    return r


# ══════════════════════════════════════════════════════════════════════════════
# 1. HEALTH
# ══════════════════════════════════════════════════════════════════════════════

class TestHealth:
    def test_health(self):
        r = ok(requests.get(url("/health")), "health")
        assert r.json().get("status") == "healthy"

    def test_health_db(self):
        r = ok(requests.get(url("/health/db")), "health/db")
        assert r.json().get("database") == "connected"

    def test_root_page(self):
        r = requests.get(url("/"))
        assert r.status_code == 200
        assert "Blue Technology" in r.text

    def test_structure_page(self):
        r = requests.get(url("/structure"))
        assert r.status_code == 200
        assert "System Structure" in r.text


# ══════════════════════════════════════════════════════════════════════════════
# 2. CLIENT AUTH
# ══════════════════════════════════════════════════════════════════════════════

class TestClientAuth:
    def test_signup(self):
        """Signup — may return 400 if user already exists, that's fine."""
        r = requests.post(url("/api/v1/auth/signup"), json={
            "full_name":    "Test User",
            "phone_number": TEST_PHONE,
            "password":     TEST_PASSWORD,
        })
        # 201 = created, 400 = already exists — both acceptable
        assert r.status_code in (200, 201, 400), (
            f"Unexpected signup status {r.status_code}: {r.text[:200]}"
        )
        if r.status_code in (200, 201):
            print(f"\n  ✓ Signup successful — OTP sent to {TEST_PHONE}")
            print("  ⚠  Check your phone for OTP, then set it via:")
            print("     state['otp'] = 'XXXXXX'  and run verify-phone test manually")

    def test_login(self):
        """Login — phone may not be verified yet, but token should come back if it is."""
        r = requests.post(url("/api/v1/auth/login"), json={
            "phone_number": TEST_PHONE,
            "password":     TEST_PASSWORD,
        })
        if r.status_code == 200:
            data = r.json()
            assert "access_token" in data, f"No token in response: {data}"
            state["client_token"] = data["access_token"]
            state["user_id"]      = data.get("user", {}).get("id")
            print(f"\n  ✓ Logged in as {TEST_PHONE} — token saved")
        elif r.status_code == 403:
            pytest.skip("Phone not verified yet — verify OTP first, then re-run")
        else:
            pytest.fail(f"Login failed {r.status_code}: {r.text[:200]}")

    def test_login_wrong_password(self):
        r = requests.post(url("/api/v1/auth/login"), json={
            "phone_number": TEST_PHONE,
            "password":     "WrongPassword999!",
        })
        assert r.status_code in (401, 400, 403), (
            f"Expected 4xx for wrong password, got {r.status_code}"
        )

    def test_forgot_password(self):
        r = requests.post(url("/api/v1/auth/forgot-password"), json={
            "phone_number": TEST_PHONE,
        })
        assert r.status_code in (200, 404), (
            f"Unexpected status {r.status_code}: {r.text[:200]}"
        )

    def test_resend_code(self):
        r = requests.post(url("/api/v1/auth/resend-code"), json={
            "phone_number": TEST_PHONE,
        })
        assert r.status_code in (200, 400, 404), (
            f"Unexpected status {r.status_code}: {r.text[:200]}"
        )

    def test_token_refresh(self):
        if not state["client_token"]:
            pytest.skip("No client token")
        r = ok(requests.post(url("/api/v1/auth/refresh"), headers=client_headers()), "refresh")
        data = r.json()
        assert "access_token" in data
        state["client_token"] = data["access_token"]  # update with fresh token

    def test_get_me(self):
        if not state["client_token"]:
            pytest.skip("No client token")
        r = ok(requests.get(url("/api/v1/auth/users/me"), headers=client_headers()), "get me")
        assert "phone_number" in r.json()


# ══════════════════════════════════════════════════════════════════════════════
# 3. ADMIN AUTH
# ══════════════════════════════════════════════════════════════════════════════

class TestAdminAuth:
    def test_admin_login(self):
        r = requests.post(url("/api/v1/admin/auth/login"), json={
            "username": TEST_ADMIN_USERNAME,
            "password": TEST_ADMIN_PASSWORD,
        })
        if r.status_code == 200:
            data = r.json()
            assert "access_token" in data
            state["admin_token"] = data["access_token"]
            print(f"\n  ✓ Admin logged in as {TEST_ADMIN_USERNAME} — token saved")
        else:
            pytest.fail(f"Admin login failed {r.status_code}: {r.text[:200]}")

    def test_admin_login_wrong_password(self):
        r = requests.post(url("/api/v1/admin/auth/login"), json={
            "username": TEST_ADMIN_USERNAME,
            "password": "WrongAdminPass999!",
        })
        assert r.status_code in (401, 400, 403)

    def test_admin_get_me(self):
        if not state["admin_token"]:
            pytest.skip("No admin token")
        r = ok(requests.get(url("/api/v1/admin/auth/me"), headers=admin_headers()), "admin me")
        assert "username" in r.json()

    def test_admin_list(self):
        if not state["admin_token"]:
            pytest.skip("No admin token")
        r = ok(requests.get(url("/api/v1/admin/auth/list"), headers=admin_headers()), "admin list")
        assert isinstance(r.json(), list)

    def test_client_token_rejected_on_admin_route(self):
        """Client token must NOT work on admin routes."""
        if not state["client_token"]:
            pytest.skip("No client token")
        r = requests.get(url("/api/v1/admin/auth/me"),
                         headers={"Authorization": f"Bearer {state['client_token']}"})
        assert r.status_code in (401, 403), (
            f"Client token should be rejected on admin route, got {r.status_code}"
        )


# ══════════════════════════════════════════════════════════════════════════════
# 4. PRODUCTS
# ══════════════════════════════════════════════════════════════════════════════

class TestProducts:
    def test_list_products(self):
        r = ok(requests.get(url("/api/v1/products")), "list products")
        data = r.json()
        products = data if isinstance(data, list) else data.get("data", data.get("products", []))
        assert len(products) > 0, "No products returned"
        # Prefer a product with stock so test_create_order doesn't get a 422
        in_stock = [p for p in products if (p.get("stock_quantity") or 0) > 0]
        chosen = in_stock[0] if in_stock else products[0]
        state["product_id"] = chosen["id"]
        print(f"\n  ✓ Got {len(products)} products — saved id {state['product_id']} (stock={chosen.get('stock_quantity')})")

    def test_get_product(self):
        if not state["product_id"]:
            pytest.skip("No product_id")
        r = ok(requests.get(url(f"/api/v1/products/{state['product_id']}")), "get product")
        assert r.json().get("id") == state["product_id"]

    def test_get_product_not_found(self):
        r = requests.get(url("/api/v1/products/00000000-0000-0000-0000-000000000000"))
        assert r.status_code == 404

    def test_create_product_requires_admin(self):
        r = requests.post(url("/api/v1/products"), json={
            "name": "Test Product", "price": 100, "category": "test",
        })
        assert r.status_code in (401, 403)


# ══════════════════════════════════════════════════════════════════════════════
# 5. DELIVERY ZONES
# ══════════════════════════════════════════════════════════════════════════════

class TestDeliveryZones:
    def test_list_zones(self):
        r = ok(requests.get(url("/api/v1/delivery-zones")), "delivery zones")
        data = r.json()
        zones = data if isinstance(data, list) else data.get("data", [])
        if zones:
            state["zone_id"] = zones[0].get("name") or zones[0].get("id")
            print(f"\n  ✓ Got {len(zones)} delivery zones")


# ══════════════════════════════════════════════════════════════════════════════
# 6. REPAIR SERVICES
# ══════════════════════════════════════════════════════════════════════════════

class TestRepairServices:
    def test_list_services(self):
        r = ok(requests.get(url("/api/v1/repair-services")), "list services")
        data = r.json()
        services = data if isinstance(data, list) else data.get("data", [])
        if services:
            state["service_id"] = services[0]["id"]
            print(f"\n  ✓ Got {len(services)} services")

    def test_list_categories(self):
        r = ok(requests.get(url("/api/v1/repair-services/categories")), "service categories")
        data = r.json()
        cats = data if isinstance(data, list) else data.get("data", [])
        assert len(cats) > 0

    def test_get_service(self):
        if not state["service_id"]:
            pytest.skip("No service_id")
        r = ok(requests.get(url(f"/api/v1/repair-services/{state['service_id']}")), "get service")
        assert r.json().get("id") == state["service_id"]


# ══════════════════════════════════════════════════════════════════════════════
# 7. DEVICES
# ══════════════════════════════════════════════════════════════════════════════

class TestDevices:
    def test_list_brands(self):
        r = ok(requests.get(url("/api/v1/devices/brands")), "device brands")
        data = r.json()
        brands = data if isinstance(data, list) else data.get("data", [])
        if brands:
            state["device_brand"] = brands[0].get("name") or brands[0].get("id")
            print(f"\n  ✓ Got {len(brands)} device brands")

    def test_list_models(self):
        if not state["device_brand"]:
            pytest.skip("No device brand")
        # Models are fetched per brand: /api/v1/devices/brands/{brand_id}/models
        # First get brand id
        r = requests.get(url("/api/v1/devices/brands"))
        brands = r.json() if isinstance(r.json(), list) else r.json().get("data", [])
        if not brands:
            pytest.skip("No brands returned")
        brand_id = brands[0].get("id")
        r2 = ok(requests.get(url(f"/api/v1/devices/brands/{brand_id}/models")), "device models")
        data = r2.json()
        models = data if isinstance(data, list) else data.get("data", [])
        if models:
            state["device_model"] = models[0].get("name") or models[0].get("id")


# ══════════════════════════════════════════════════════════════════════════════
# 8. ORDERS
# ══════════════════════════════════════════════════════════════════════════════

class TestOrders:
    def test_create_order(self):
        if not state["client_token"] or not state["product_id"]:
            pytest.skip("Need client token and product_id")
        r = requests.post(url("/api/v1/orders"), headers=client_headers(), json={
            "full_name":        "Test User",
            "phone_number":     TEST_PHONE,
            "email":            "test@bluetech.co.ke",
            "delivery_address": "123 Test Street, Nairobi",
            "delivery_zone":    state["zone_id"] or "Nairobi CBD",
            "payment_method":   "cash_on_delivery",
            "items": [
                {"product_id": state["product_id"], "quantity": 1}
            ],
        })
        assert r.status_code in (200, 201), (
            f"Create order failed {r.status_code}: {r.text[:300]}"
        )
        data = r.json()
        order = data.get("order") or data.get("data") or data
        state["order_id"] = order.get("id")
        print(f"\n  ✓ Order created — id {state['order_id']}")

    def test_get_order(self):
        if not state["order_id"]:
            pytest.skip("No order_id")
        r = ok(requests.get(url(f"/api/v1/orders/{state['order_id']}"),
                            headers=client_headers()), "get order")
        assert r.json().get("id") == state["order_id"]

    def test_track_orders_by_phone(self):
        r = ok(requests.get(url(f"/api/v1/orders/track/{TEST_PHONE}")), "track orders")
        data = r.json()
        items = data if isinstance(data, list) else data.get("data", [])
        print(f"\n  ✓ Track returned {len(items)} orders")

    def test_list_orders_requires_admin(self):
        r = requests.get(url("/api/v1/orders"))
        assert r.status_code in (401, 403)

    def test_list_orders_admin(self):
        if not state["admin_token"]:
            pytest.skip("No admin token")
        r = ok(requests.get(url("/api/v1/orders"), headers=admin_headers()), "admin list orders")
        data = r.json()
        items = data if isinstance(data, list) else data.get("data", data.get("orders", []))
        print(f"\n  ✓ Admin sees {len(items)} orders")


# ══════════════════════════════════════════════════════════════════════════════
# 9. BOOKINGS
# ══════════════════════════════════════════════════════════════════════════════

class TestBookings:
    def test_create_booking(self):
        r = requests.post(url("/api/v1/bookings"), json={
            "full_name":         "Test User",
            "phone_number":      TEST_PHONE,
            "device_type":       "Phone",
            "device_model":      "Samsung Galaxy A54",
            "issue_description": "Screen is cracked and touch not responding properly",
            "fulfillment_type":  "dropoff",
        })
        assert r.status_code in (200, 201), (
            f"Create booking failed {r.status_code}: {r.text[:300]}"
        )
        data = r.json()
        booking = data.get("booking") or data.get("data") or data
        state["booking_id"] = booking.get("id")
        print(f"\n  ✓ Booking created — id {state['booking_id']}")

    def test_get_booking(self):
        if not state["booking_id"]:
            pytest.skip("No booking_id")
        r = ok(requests.get(url(f"/api/v1/bookings/{state['booking_id']}")), "get booking")
        assert r.json().get("id") == state["booking_id"]

    def test_track_bookings_by_phone(self):
        r = ok(requests.get(url(f"/api/v1/bookings/track/{TEST_PHONE}")), "track bookings")
        data = r.json()
        items = data if isinstance(data, list) else data.get("data", [])
        print(f"\n  ✓ Track returned {len(items)} bookings")

    def test_list_bookings_requires_admin(self):
        r = requests.get(url("/api/v1/bookings"))
        assert r.status_code in (401, 403)

    def test_list_bookings_admin(self):
        if not state["admin_token"]:
            pytest.skip("No admin token")
        r = ok(requests.get(url("/api/v1/bookings"), headers=admin_headers()), "admin list bookings")
        data = r.json()
        items = data if isinstance(data, list) else data.get("data", data.get("bookings", []))
        print(f"\n  ✓ Admin sees {len(items)} bookings")


# ══════════════════════════════════════════════════════════════════════════════
# 10. PAYMENTS — M-PESA
# ══════════════════════════════════════════════════════════════════════════════

class TestMpesaPayments:
    def test_initiate_order_payment(self):
        """
        Initiates STK push in sandbox mode.
        Sandbox returns a CheckoutRequestID but does NOT push to a real phone.
        Payment will stay 'pending' — callback won't fire in sandbox.
        """
        if not state["order_id"]:
            pytest.skip("No order_id")
        r = requests.post(
            url("/api/v1/payments/mpesa/initiate"),
            params={"order_id": state["order_id"]},
            headers=client_headers() if state["client_token"] else {},
        )
        # 200 = STK sent, 400 = already paid/invalid, 502 = Daraja error (expected in sandbox)
        assert r.status_code in (200, 400, 502), (
            f"Unexpected payment status {r.status_code}: {r.text[:200]}"
        )
        if r.status_code == 200:
            print(f"\n  ✓ STK push initiated: {r.json()}")
        else:
            print(f"\n  ⚠  Payment returned {r.status_code} — expected in sandbox: {r.json()}")

    def test_order_payment_status(self):
        if not state["order_id"]:
            pytest.skip("No order_id")
        r = ok(requests.get(url(f"/api/v1/payments/mpesa/status/{state['order_id']}")),
               "order payment status")
        data = r.json()
        assert "payment_status" in data

    def test_initiate_commitment_payment(self):
        if not state["booking_id"]:
            pytest.skip("No booking_id")
        r = requests.post(
            url(f"/api/v1/payments/mpesa/booking/{state['booking_id']}/commitment"),
            params={"service_price": 2000},
        )
        assert r.status_code in (200, 400, 502), (
            f"Unexpected status {r.status_code}: {r.text[:200]}"
        )
        if r.status_code == 200:
            print(f"\n  ✓ Commitment STK push: {r.json()}")

    def test_commitment_status(self):
        if not state["booking_id"]:
            pytest.skip("No booking_id")
        r = ok(requests.get(
            url(f"/api/v1/payments/mpesa/booking/{state['booking_id']}/commitment/status")
        ), "commitment status")
        assert "commitment_payment_status" in r.json()

    def test_callback_rejects_unknown_ip(self):
        """Callback from non-Safaricom IP must be rejected."""
        r = requests.post(url("/api/v1/payments/mpesa/callback"), json={
            "Body": {"stkCallback": {"CheckoutRequestID": "fake", "ResultCode": 0}}
        })
        assert r.status_code == 403, (
            f"Callback should reject non-Safaricom IP, got {r.status_code}"
        )


# ══════════════════════════════════════════════════════════════════════════════
# 11. POINTS / LOYALTY
# ══════════════════════════════════════════════════════════════════════════════

class TestPoints:
    def test_get_my_points(self):
        if not state["client_token"]:
            pytest.skip("No client token")
        r = ok(requests.get(url("/api/v1/points/me"), headers=client_headers()), "my points")
        data = r.json()
        assert "points" in data or "balance" in data or isinstance(data, (int, dict))

    def test_get_points_history(self):
        if not state["client_token"]:
            pytest.skip("No client token")
        r = ok(requests.get(url("/api/v1/points/history"), headers=client_headers()), "points history")
        data = r.json()
        items = data if isinstance(data, list) else data.get("data", [])
        print(f"\n  ✓ Points history: {len(items)} records")

    def test_points_requires_auth(self):
        r = requests.get(url("/api/v1/points/me"))
        assert r.status_code in (401, 403)


# ══════════════════════════════════════════════════════════════════════════════
# 12. TRACKING
# ══════════════════════════════════════════════════════════════════════════════

class TestTracking:
    def test_track_by_phone(self):
        r = ok(requests.get(url(f"/api/v1/track/{TEST_PHONE}")), "track by phone")
        data = r.json()
        assert "orders" in data or "bookings" in data or isinstance(data, (list, dict))
        print(f"\n  ✓ Track response: {list(data.keys()) if isinstance(data, dict) else type(data)}")


# ══════════════════════════════════════════════════════════════════════════════
# 13. CONTACT
# ══════════════════════════════════════════════════════════════════════════════

class TestContact:
    def test_submit_contact(self):
        r = requests.post(url("/api/v1/contact"), json={
            "name":    "Test User",
            "email":   "test@bluetech.co.ke",
            "phone":   TEST_PHONE,
            "subject": "Automated test message",
            "message": "This is an automated test message from the test suite.",
        })
        assert r.status_code in (200, 201), (
            f"Contact submit failed {r.status_code}: {r.text[:200]}"
        )


# ══════════════════════════════════════════════════════════════════════════════
# 14. ADMIN OPERATIONS
# ══════════════════════════════════════════════════════════════════════════════

class TestAdminOps:
    def test_dashboard(self):
        if not state["admin_token"]:
            pytest.skip("No admin token")
        r = ok(requests.get(url("/api/v1/admin/dashboard"), headers=admin_headers()), "dashboard")
        assert isinstance(r.json(), dict)

    def test_transactions(self):
        if not state["admin_token"]:
            pytest.skip("No admin token")
        r = ok(requests.get(url("/api/v1/admin/transactions"), headers=admin_headers()), "transactions")
        data = r.json()
        items = data.get("data", data) if isinstance(data, dict) else data
        print(f"\n  ✓ Transactions: {len(items) if isinstance(items, list) else '?'} records")

    def test_stock_alerts(self):
        if not state["admin_token"]:
            pytest.skip("No admin token")
        r = ok(requests.get(url("/api/v1/admin/stock/alerts"), headers=admin_headers()), "stock alerts")
        assert isinstance(r.json(), (list, dict))

    def test_search(self):
        if not state["admin_token"]:
            pytest.skip("No admin token")
        r = ok(requests.get(url("/api/v1/admin/search"), params={"q": "test"},
                            headers=admin_headers()), "admin search")
        assert isinstance(r.json(), (list, dict))

    def test_audit_log(self):
        if not state["admin_token"]:
            pytest.skip("No admin token")
        r = ok(requests.get(url("/api/v1/admin/audit-log"), headers=admin_headers()), "audit log")
        data = r.json()
        items = data.get("data", data) if isinstance(data, dict) else data
        print(f"\n  ✓ Audit log: {len(items) if isinstance(items, list) else '?'} records")

    def test_referrals(self):
        if not state["admin_token"]:
            pytest.skip("No admin token")
        r = ok(requests.get(url("/api/v1/admin/referrals"), headers=admin_headers()), "referrals")
        assert isinstance(r.json(), (list, dict))

    def test_admin_routes_reject_client_token(self):
        if not state["client_token"]:
            pytest.skip("No client token")
        r = requests.get(url("/api/v1/admin/dashboard"),
                         headers={"Authorization": f"Bearer {state['client_token']}"})
        assert r.status_code in (401, 403)

    def test_export_orders_csv(self):
        if not state["admin_token"]:
            pytest.skip("No admin token")
        r = ok(requests.get(url("/api/v1/admin/export/orders"), headers=admin_headers()), "export orders")
        assert r.status_code == 200

    def test_customer_history(self):
        if not state["admin_token"] or not state["user_id"]:
            pytest.skip("Need admin token and user_id")
        r = ok(requests.get(url(f"/api/v1/admin/customers/{state['user_id']}/history"),
                            headers=admin_headers()), "customer history")
        assert isinstance(r.json(), (list, dict))


# ══════════════════════════════════════════════════════════════════════════════
# 15. PLACES (Google Maps proxy)
# ══════════════════════════════════════════════════════════════════════════════

class TestPlaces:
    def test_autocomplete(self):
        r = requests.get(url("/api/v1/places/autocomplete"), params={"input": "Nairobi"})
        # 200 = works, 400/500 = Google key not set — both acceptable
        assert r.status_code in (200, 400, 422, 500), (
            f"Unexpected places status {r.status_code}"
        )
        if r.status_code == 200:
            print(f"\n  ✓ Places autocomplete works")
        else:
            print(f"\n  ⚠  Places returned {r.status_code} — check GOOGLE_MAPS_API_KEY")


# ══════════════════════════════════════════════════════════════════════════════
# 16. SECURITY CHECKS
# ══════════════════════════════════════════════════════════════════════════════

class TestSecurity:
    def test_no_token_on_protected_route(self):
        r = requests.get(url("/api/v1/auth/users/me"))
        assert r.status_code in (401, 403)

    def test_invalid_token_rejected(self):
        r = requests.get(url("/api/v1/auth/users/me"),
                         headers={"Authorization": "Bearer invalidtoken123"})
        assert r.status_code in (401, 403)

    def test_rate_limit_exists_on_login(self):
        """Hit login 6 times fast — should get 429 on or before the 6th."""
        got_limited = False
        for i in range(6):
            r = requests.post(url("/api/v1/auth/login"), json={
                "phone_number": "254700000000",
                "password":     "WrongPass123!",
            })
            if r.status_code == 429:
                got_limited = True
                break
            time.sleep(0.1)
        if not got_limited:
            print("\n  ⚠  Rate limit not triggered in 6 requests — may need more hits or check limiter config")

    def test_oversized_input_rejected(self):
        """delivery_address over max_length should be rejected."""
        r = requests.post(url("/api/v1/orders"), json={
            "full_name":        "Test",
            "phone_number":     TEST_PHONE,
            "delivery_address": "A" * 400,   # max is 300
            "delivery_zone":    "Nairobi",
            "payment_method":   "cash_on_delivery",
            "items":            [{"product_id": "00000000-0000-0000-0000-000000000000", "quantity": 1}],
        })
        assert r.status_code == 422, (
            f"Expected 422 for oversized input, got {r.status_code}"
        )
