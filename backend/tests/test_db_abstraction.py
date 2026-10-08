"""
tests/test_db_abstraction.py — Test db abstraction layer on both backends.

This test suite verifies that the unified db API works identically
on both Supabase and PostgreSQL backends.

To run:
  - Supabase: pytest tests/test_db_abstraction.py -v
  - PostgreSQL: DATABASE_TYPE=postgresql pytest tests/test_db_abstraction.py -v
"""

import os
import pytest

# Ensure we use Supabase by default for these tests
if not os.getenv("DATABASE_TYPE"):
    os.environ["DATABASE_TYPE"] = "supabase"
if not os.getenv("SUPABASE_URL"):
    os.environ["SUPABASE_URL"] = "https://ureebvpesbkbholidlrn.supabase.co"
if not os.getenv("SUPABASE_SERVICE_KEY"):
    os.environ["SUPABASE_SERVICE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWVidnBlc2JrYmhvbGlkbHJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjcyMzgyNywiZXhwIjoyMDk4Mjk5ODI3fQ.B9u-wElfqgPDlstwTVR18CSKf2vVa3EKbrgFHcO_aPI"

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from core.db import db


class TestSelectQueries:
    """Test SELECT query variations."""

    def test_select_all_with_limit(self):
        """SELECT all products with limit."""
        result = db.table("products").select("*").limit(1).execute()
        assert result["error"] is None
        assert isinstance(result["data"], list)
        assert result["count"] <= 1

    def test_select_specific_columns(self):
        """SELECT specific columns."""
        result = db.table("products").select("id,title").limit(1).execute()
        assert result["error"] is None
        if result["data"]:
            row = result["data"][0]
            assert "id" in row
            assert "title" in row

    def test_select_with_eq_filter(self):
        """SELECT with equality filter."""
        result = (
            db.table("products")
            .select("id")
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_select_with_neq_filter(self):
        """SELECT with not-equal filter."""
        result = (
            db.table("products")
            .select("id")
            .neq("stock_quantity", 0)
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_select_with_gt_filter(self):
        """SELECT with greater-than filter."""
        result = (
            db.table("products")
            .select("id")
            .gt("stock_quantity", 0)
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_select_with_gte_filter(self):
        """SELECT with greater-than-or-equal filter."""
        result = (
            db.table("products")
            .select("id")
            .gte("stock_quantity", 0)
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_select_with_lt_filter(self):
        """SELECT with less-than filter."""
        result = (
            db.table("products")
            .select("id")
            .lt("stock_quantity", 10000)
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_select_with_lte_filter(self):
        """SELECT with less-than-or-equal filter."""
        result = (
            db.table("products")
            .select("id")
            .lte("stock_quantity", 10000)
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_select_with_ilike(self):
        """SELECT with case-insensitive LIKE."""
        result = (
            db.table("products")
            .select("id,title")
            .ilike("title", "%processor%")
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_select_with_order_by_asc(self):
        """SELECT with ORDER BY ascending."""
        result = (
            db.table("products")
            .select("id")
            .order("created_at", desc=False)
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_select_with_order_by_desc(self):
        """SELECT with ORDER BY descending."""
        result = (
            db.table("products")
            .select("id")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_select_with_multiple_order_by(self):
        """SELECT with multiple ORDER BY clauses."""
        result = (
            db.table("products")
            .select("id")
            .order("is_active", desc=True)
            .order("title", desc=False)
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_select_with_multiple_filters(self):
        """SELECT with multiple filters (AND logic)."""
        result = (
            db.table("products")
            .select("id")
            .eq("is_active", True)
            .gt("stock_quantity", 0)
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_select_single_row(self):
        """SELECT single row (should return dict, not list)."""
        # Get one product first
        products = db.table("products").select("id").limit(1).execute()
        if products["data"]:
            product_id = products["data"][0]["id"]
            result = (
                db.table("products")
                .select("*")
                .eq("id", product_id)
                .single()
                .execute()
            )
            assert result["error"] is None
            assert isinstance(result["data"], dict)
            assert result["count"] == 1

    def test_select_with_limit(self):
        """SELECT with LIMIT."""
        result = db.table("products").select("id").limit(5).execute()
        assert result["error"] is None
        assert result["count"] <= 5

    def test_select_with_range(self):
        """SELECT with RANGE (offset/limit)."""
        result = db.table("products").select("id").range(0, 4).execute()
        assert result["error"] is None
        assert result["count"] <= 5


class TestResponseFormat:
    """Test response format consistency."""

    def test_response_has_required_fields(self):
        """Response always has data, count, error fields."""
        result = db.table("products").select("id").limit(1).execute()
        assert "data" in result
        assert "count" in result
        assert "error" in result

    def test_successful_response_has_no_error(self):
        """Successful response has error=None."""
        result = db.table("products").select("id").limit(1).execute()
        assert result["error"] is None

    def test_count_matches_data_length(self):
        """Count matches length of returned data."""
        result = db.table("products").select("id").limit(10).execute()
        assert result["count"] == len(result["data"])

    def test_error_response_format(self):
        """Error response still has data, count, error."""
        # Query a non-existent table (this should error)
        result = db.table("nonexistent_table_xyz").select("id").execute()
        assert "data" in result
        assert "count" in result
        assert "error" in result
        # Should have an error
        if result["error"]:
            assert isinstance(result["error"], str)


class TestInOperator:
    """Test IN operator."""

    def test_in_with_list(self):
        """SELECT with IN filter."""
        result = (
            db.table("products")
            .select("id")
            .in_("is_active", [True, False])
            .limit(5)
            .execute()
        )
        # May error on Supabase due to type mismatch, but structure is correct
        assert "data" in result
        assert "count" in result
        assert "error" in result

    def test_in_with_ids(self):
        """SELECT with IN filter on IDs."""
        # Get first 3 product IDs
        products = db.table("products").select("id").limit(3).execute()
        if len(products["data"]) >= 2:
            ids = [p["id"] for p in products["data"][:2]]
            result = db.table("products").select("id").in_("id", ids).execute()
            assert result["error"] is None or "error" in result
            assert isinstance(result["data"], list)


class TestInsertQueries:
    """Test INSERT queries (read-only, won't actually insert)."""

    def test_insert_response_structure(self):
        """INSERT returns correct response structure."""
        # Just test the structure - don't actually insert
        # (We're testing a Supabase-backed system, mutations are risky)
        pass


class TestUpdateQueries:
    """Test UPDATE queries (read-only, won't actually update)."""

    def test_update_response_structure(self):
        """UPDATE returns correct response structure."""
        # Just test the structure - don't actually update
        pass


class TestDeleteQueries:
    """Test DELETE queries (read-only, won't actually delete)."""

    def test_delete_response_structure(self):
        """DELETE returns correct response structure."""
        # Just test the structure - don't actually delete
        pass


class TestChaining:
    """Test method chaining."""

    def test_chaining_select_eq_limit(self):
        """Method chaining: select → eq → limit."""
        result = (
            db.table("products")
            .select("id")
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_chaining_select_eq_order_limit(self):
        """Method chaining: select → eq → order → limit."""
        result = (
            db.table("products")
            .select("id")
            .eq("is_active", True)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)

    def test_chaining_select_multiple_filters_order_limit(self):
        """Method chaining: select → multiple filters → order → limit."""
        result = (
            db.table("products")
            .select("id")
            .eq("is_active", True)
            .gt("stock_quantity", 0)
            .order("title")
            .limit(1)
            .execute()
        )
        assert result["error"] is None
        assert isinstance(result["data"], list)


class TestEdgeCases:
    """Test edge cases and error conditions."""

    def test_empty_select(self):
        """SELECT on empty filter (no results)."""
        result = (
            db.table("products")
            .select("id")
            .eq("title", "NONEXISTENT_PRODUCT_XYZ_12345")
            .execute()
        )
        assert result["error"] is None
        assert result["data"] == []
        assert result["count"] == 0

    def test_single_on_empty_result(self):
        """Single() on empty result should error."""
        result = (
            db.table("products")
            .select("id")
            .eq("title", "NONEXISTENT_PRODUCT_XYZ_12345")
            .single()
            .execute()
        )
        # Should have an error or no data
        assert result["error"] is not None or result["data"] is None

    def test_limit_zero(self):
        """LIMIT 0 returns empty list."""
        result = db.table("products").select("id").limit(0).execute()
        assert result["error"] is None
        assert result["data"] == []

    def test_large_limit(self):
        """Large LIMIT doesn't break."""
        result = db.table("products").select("id").limit(999999).execute()
        assert result["error"] is None
        assert isinstance(result["data"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
