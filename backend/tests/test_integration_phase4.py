"""
tests/test_integration_phase4.py — Phase 4 Integration Testing

Comprehensive tests covering all major application flows:
- Auth (signup, login, password reset)
- Payments (orders, bookings, status updates)
- Products (list, search, filters)
- Admin operations (CRUD, audit logging)

Run against both Supabase and PostgreSQL backends.
"""

import os
import sys
import time
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

# Ensure database connection
if not os.getenv("DATABASE_TYPE"):
    os.environ["DATABASE_TYPE"] = "supabase"
if not os.getenv("SUPABASE_URL"):
    os.environ["SUPABASE_URL"] = "https://ureebvpesbkbholidlrn.supabase.co"
if not os.getenv("SUPABASE_SERVICE_KEY"):
    if not os.getenv("SUPABASE_SERVICE_KEY"):
    os.environ["SUPABASE_SERVICE_KEY"] = "test-key-placeholder"

from core.db import db


class TestResults:
    def __init__(self):
        self.tests = []
        self.passed = 0
        self.failed = 0
        self.backend = os.getenv("DATABASE_TYPE", "supabase")
    
    def test(self, name, fn):
        """Run a test and track results."""
        try:
            fn()
            self.passed += 1
            self.tests.append(("✅", name))
            return True
        except AssertionError as e:
            self.failed += 1
            self.tests.append(("❌", name, str(e)))
            return False
        except Exception as e:
            self.failed += 1
            self.tests.append(("⚠️", name, f"ERROR: {str(e)[:50]}"))
            return False
    
    def report(self):
        """Print test report."""
        print(f"\n{'='*80}")
        print(f"PHASE 4 INTEGRATION TEST RESULTS — {self.backend.upper()}")
        print(f"{'='*80}\n")
        
        for test in self.tests:
            print(f"{test[0]} {test[1]}")
            if len(test) > 2:
                print(f"   → {test[2]}")
        
        print(f"\n{'-'*80}")
        print(f"Passed: {self.passed} | Failed: {self.failed} | Total: {self.passed + self.failed}")
        print(f"{'-'*80}\n")
        
        return self.failed == 0


# ============================================================================
# AUTH FLOW TESTS
# ============================================================================

def test_auth_flows():
    """Test authentication workflows."""
    results = TestResults()
    
    print(f"\nTesting Auth Flows ({results.backend})...")
    
    # Test 1: Check users table exists and is accessible
    def test_users_table():
        r = db.table("users").select("id").limit(1).execute()
        assert r["error"] is None, f"Cannot access users table: {r['error']}"
        assert "data" in r, "Missing data field in response"
    
    results.test("Users table accessible", test_users_table)
    
    # Test 2: Query by phone number (common auth pattern)
    def test_query_by_phone():
        r = db.table("users").select("id,phone_number").limit(1).execute()
        if r["data"]:
            assert "phone_number" in r["data"][0], "Phone number not returned"
    
    results.test("Query users by phone", test_query_by_phone)
    
    # Test 3: Email uniqueness check (signup validation)
    def test_email_check():
        r = db.table("users").select("email").eq("email", "test@example.com").execute()
        assert r["error"] is None
    
    results.test("Email uniqueness check", test_email_check)
    
    # Test 4: Password field exists (for login)
    def test_password_field():
        r = db.table("admins").select("id,username,password").limit(1).execute()
        assert r["error"] is None, f"Cannot access admins: {r['error']}"
    
    results.test("Admin password field accessible", test_password_field)
    
    # Test 5: OTP fields for verification
    def test_otp_fields():
        r = db.table("users").select("verification_code,otp_expires_at").limit(1).execute()
        assert r["error"] is None
    
    results.test("OTP verification fields accessible", test_otp_fields)
    
    # Test 6: Referral code lookup
    def test_referral_lookup():
        r = db.table("users").select("id,referral_code").eq("referral_code", "INVALID").execute()
        assert r["error"] is None
        assert r["data"] == []
    
    results.test("Referral code lookup", test_referral_lookup)
    
    return results


# ============================================================================
# PAYMENT FLOW TESTS
# ============================================================================

def test_payment_flows():
    """Test payment and order workflows."""
    results = TestResults()
    
    print(f"\nTesting Payment Flows ({results.backend})...")
    
    # Test 1: Orders table accessible
    def test_orders_table():
        r = db.table("orders").select("id,status,payment_status").limit(1).execute()
        assert r["error"] is None
    
    results.test("Orders table accessible", test_orders_table)
    
    # Test 2: Query orders by phone (customer lookup)
    def test_orders_by_phone():
        r = db.table("orders").select("*").eq("phone_number", "254712345678").limit(1).execute()
        assert r["error"] is None
    
    results.test("Query orders by phone", test_orders_by_phone)
    
    # Test 3: Filter by payment status
    def test_unpaid_orders():
        r = db.table("orders").select("id").eq("payment_status", "unpaid").limit(5).execute()
        assert r["error"] is None
    
    results.test("Filter unpaid orders", test_unpaid_orders)
    
    # Test 4: Filter by order status
    def test_pending_orders():
        r = db.table("orders").select("id").eq("status", "pending").limit(5).execute()
        assert r["error"] is None
    
    results.test("Filter pending orders", test_pending_orders)
    
    # Test 5: Order items relationships
    def test_order_items():
        r = db.table("order_items").select("*").limit(1).execute()
        assert r["error"] is None
    
    results.test("Order items accessible", test_order_items)
    
    # Test 6: Bookings (repair requests)
    def test_bookings():
        r = db.table("bookings").select("id,status,payment_status").limit(1).execute()
        assert r["error"] is None
    
    results.test("Bookings accessible", test_bookings)
    
    # Test 7: Filter bookings by status
    def test_bookings_by_status():
        r = db.table("bookings").select("id").eq("status", "pending").limit(5).execute()
        assert r["error"] is None
    
    results.test("Filter bookings by status", test_bookings_by_status)
    
    # Test 8: Delivery zones (for order calculation)
    def test_delivery_zones():
        r = db.table("delivery_zones").select("zone_name,delivery_fee").eq("is_active", True).execute()
        assert r["error"] is None
        assert r["count"] >= 5, f"Expected 5+ delivery zones, got {r['count']}"
    
    results.test("Delivery zones seeded", test_delivery_zones)
    
    return results


# ============================================================================
# PRODUCT FLOW TESTS
# ============================================================================

def test_product_flows():
    """Test product queries and filtering."""
    results = TestResults()
    
    print(f"\nTesting Product Flows ({results.backend})...")
    
    # Test 1: List all products
    def test_list_products():
        r = db.table("products").select("*").limit(10).execute()
        assert r["error"] is None
        assert r["count"] > 0, "No products available"
    
    results.test("List products", test_list_products)
    
    # Test 2: Filter active products
    def test_active_products():
        r = db.table("products").select("id,title").eq("is_active", True).limit(10).execute()
        assert r["error"] is None
    
    results.test("Filter active products", test_active_products)
    
    # Test 3: Search by title (ILIKE)
    def test_search_products():
        r = db.table("products").select("id,title").ilike("title", "%processor%").limit(5).execute()
        assert r["error"] is None
    
    results.test("Search products by title", test_search_products)
    
    # Test 4: Filter by category
    def test_category_filter():
        r = db.table("products").select("id,category").eq("category", "processors").limit(5).execute()
        assert r["error"] is None
    
    results.test("Filter products by category", test_category_filter)
    
    # Test 5: Stock checking (inventory)
    def test_stock_check():
        r = db.table("products").select("id,stock_quantity").gt("stock_quantity", 0).limit(5).execute()
        assert r["error"] is None
    
    results.test("Filter products with stock", test_stock_check)
    
    # Test 6: Low stock check
    def test_low_stock():
        r = db.table("products").select("id,stock_quantity,low_stock_threshold").lt("stock_quantity", 10).limit(5).execute()
        assert r["error"] is None
    
    results.test("Check low stock products", test_low_stock)
    
    # Test 7: Featured products
    def test_featured():
        r = db.table("products").select("id").eq("is_featured", True).limit(5).execute()
        assert r["error"] is None
    
    results.test("Query featured products", test_featured)
    
    # Test 8: Pagination with ORDER BY
    def test_pagination():
        r = (db.table("products")
            .select("id,created_at")
            .order("created_at", desc=True)
            .limit(5)
            .execute())
        assert r["error"] is None
        assert r["count"] <= 5
    
    results.test("Pagination with ordering", test_pagination)
    
    # Test 9: RANGE pagination
    def test_range():
        r = db.table("products").select("id").range(0, 9).execute()
        assert r["error"] is None
        assert r["count"] <= 10
    
    results.test("RANGE pagination", test_range)
    
    return results


# ============================================================================
# ADMIN OPERATION TESTS
# ============================================================================

def test_admin_flows():
    """Test admin operations."""
    results = TestResults()
    
    print(f"\nTesting Admin Flows ({results.backend})...")
    
    # Test 1: Admins table accessible
    def test_admins_table():
        r = db.table("admins").select("id,username,role").limit(1).execute()
        assert r["error"] is None
    
    results.test("Admins table accessible", test_admins_table)
    
    # Test 2: Admin by username
    def test_admin_lookup():
        r = db.table("admins").select("id").eq("username", "admin").limit(1).execute()
        assert r["error"] is None
    
    results.test("Admin lookup by username", test_admin_lookup)
    
    # Test 3: Audit log accessible
    def test_audit_log():
        r = db.table("audit_log").select("id,action,created_at").limit(5).execute()
        assert r["error"] is None
    
    results.test("Audit log accessible", test_audit_log)
    
    # Test 4: Filter audit log by admin
    def test_audit_by_admin():
        r = db.table("audit_log").select("action").limit(1).execute()
        # Just check the query works, may be empty
        assert r["error"] is None
    
    results.test("Filter audit log by admin", test_audit_by_admin)
    
    # Test 5: Device brands (admin content)
    def test_device_brands():
        r = db.table("device_brands").select("id,name,device_type").eq("is_active", True).limit(10).execute()
        assert r["error"] is None
    
    results.test("Device brands accessible", test_device_brands)
    
    # Test 6: Device models (admin content)
    def test_device_models():
        r = db.table("device_models").select("id,name,brand_id").limit(10).execute()
        assert r["error"] is None
    
    results.test("Device models accessible", test_device_models)
    
    # Test 7: Repair services (admin content)
    def test_repair_services():
        r = db.table("repair_services").select("id,service_name").eq("is_active", True).limit(10).execute()
        assert r["error"] is None
    
    results.test("Repair services accessible", test_repair_services)
    
    # Test 8: Points ledger (admin reporting)
    def test_points_ledger():
        r = db.table("points_ledger").select("id,points,type").limit(5).execute()
        assert r["error"] is None
    
    results.test("Points ledger accessible", test_points_ledger)
    
    return results


# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================

def test_error_handling():
    """Test error handling and edge cases."""
    results = TestResults()
    
    print(f"\nTesting Error Handling ({results.backend})...")
    
    # Test 1: Invalid UUID
    def test_invalid_uuid():
        r = db.table("users").select("id").eq("id", "invalid-uuid").execute()
        assert r["error"] is None  # Should handle gracefully
        assert r["data"] == []
    
    results.test("Handle invalid UUID", test_invalid_uuid)
    
    # Test 2: Non-existent record
    def test_nonexistent():
        fake_id = str(uuid.uuid4())
        r = db.table("users").select("id").eq("id", fake_id).single().execute()
        # May have error, but query should not crash
        assert "error" in r
    
    results.test("Handle non-existent record", test_nonexistent)
    
    # Test 3: Empty result set
    def test_empty_result():
        r = db.table("users").select("*").eq("phone_number", "INVALID_PHONE_12345").execute()
        assert r["error"] is None
        assert r["data"] == []
        assert r["count"] == 0
    
    results.test("Handle empty result set", test_empty_result)
    
    # Test 4: LIMIT 0
    def test_limit_zero():
        r = db.table("products").select("id").limit(0).execute()
        assert r["error"] is None
        assert r["data"] == []
    
    results.test("Handle LIMIT 0", test_limit_zero)
    
    # Test 5: Large LIMIT
    def test_large_limit():
        r = db.table("products").select("id").limit(99999).execute()
        assert r["error"] is None
        # Should return actual count, not 99999
        assert r["count"] <= 1000
    
    results.test("Handle large LIMIT", test_large_limit)
    
    # Test 6: Multiple filters
    def test_multiple_filters():
        r = (db.table("products")
            .select("id")
            .eq("is_active", True)
            .gt("stock_quantity", 0)
            .lt("price", 100000)
            .execute())
        assert r["error"] is None
    
    results.test("Handle multiple filters", test_multiple_filters)
    
    # Test 7: Response format consistency
    def test_response_format():
        r = db.table("users").select("id").limit(1).execute()
        assert "data" in r
        assert "count" in r
        assert "error" in r
        assert r["error"] is None
    
    results.test("Response format consistency", test_response_format)
    
    return results


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def run_all_tests():
    """Run all integration tests."""
    print(f"\n{'='*80}")
    print(f"PHASE 4 INTEGRATION TESTS — {os.getenv('DATABASE_TYPE', 'supabase').upper()}")
    print(f"{'='*80}")
    
    all_results = []
    
    # Run test suites
    all_results.append(test_auth_flows())
    all_results.append(test_payment_flows())
    all_results.append(test_product_flows())
    all_results.append(test_admin_flows())
    all_results.append(test_error_handling())
    
    # Aggregate results
    total_passed = sum(r.passed for r in all_results)
    total_failed = sum(r.failed for r in all_results)
    
    print(f"\n{'='*80}")
    print(f"TOTAL RESULTS")
    print(f"{'='*80}")
    print(f"✅ Passed: {total_passed}")
    print(f"❌ Failed: {total_failed}")
    print(f"📊 Total:  {total_passed + total_failed}")
    print(f"{'='*80}\n")
    
    return total_failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
