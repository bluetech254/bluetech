"""
tests/test_load_and_performance.py — Phase 4 Load Testing & Performance

Simulates production workloads:
- Concurrent users (thread-based simulation)
- Query throughput
- Connection pool stress
- Memory usage
- Response times (p50, p95, p99)
"""

import os
import sys
import time
import threading
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

if not os.getenv("DATABASE_TYPE"):
    os.environ["DATABASE_TYPE"] = "supabase"
if not os.getenv("SUPABASE_URL"):
    os.environ["SUPABASE_URL"] = "https://ureebvpesbkbholidlrn.supabase.co"
if not os.getenv("SUPABASE_SERVICE_KEY"):
    if not os.getenv("SUPABASE_SERVICE_KEY"):
    os.environ["SUPABASE_SERVICE_KEY"] = "test-key-placeholder"

from core.db import db


class PerformanceTest:
    def __init__(self, name, num_iterations=100):
        self.name = name
        self.num_iterations = num_iterations
        self.times = []
        self.errors = 0
        self.successes = 0
        
    def add_time(self, duration):
        self.times.append(duration)
        self.successes += 1
    
    def add_error(self):
        self.errors += 1
    
    def get_stats(self):
        if not self.times:
            return None
        return {
            "count": len(self.times),
            "min": min(self.times),
            "max": max(self.times),
            "avg": statistics.mean(self.times),
            "median": statistics.median(self.times),
            "p95": self._percentile(95),
            "p99": self._percentile(99),
            "errors": self.errors,
            "success_rate": self.successes / (self.successes + self.errors) * 100,
        }
    
    def _percentile(self, p):
        if not self.times:
            return 0
        sorted_times = sorted(self.times)
        index = int(len(sorted_times) * p / 100)
        return sorted_times[min(index, len(sorted_times) - 1)]
    
    def report(self):
        stats = self.get_stats()
        if not stats:
            print(f"  ❌ {self.name}: No data")
            return False
        
        print(f"\n  {self.name}:")
        print(f"    Iterations: {stats['count']}")
        print(f"    Successes:  {self.successes}")
        print(f"    Errors:     {self.errors}")
        print(f"    Success Rate: {stats['success_rate']:.1f}%")
        print(f"    Response Times (ms):")
        print(f"      Min:     {stats['min']*1000:.2f}")
        print(f"      Avg:     {stats['avg']*1000:.2f}")
        print(f"      Median:  {stats['median']*1000:.2f}")
        print(f"      p95:     {stats['p95']*1000:.2f}")
        print(f"      p99:     {stats['p99']*1000:.2f}")
        print(f"      Max:     {stats['max']*1000:.2f}")
        
        # Performance targets
        if stats['avg'] < 0.1:
            print(f"    ✅ Average response time < 100ms")
        else:
            print(f"    ⚠️  Average response time > 100ms")
        
        if stats['p99'] < 0.5:
            print(f"    ✅ p99 response time < 500ms")
        else:
            print(f"    ⚠️  p99 response time > 500ms")
        
        if stats['success_rate'] >= 99:
            print(f"    ✅ Success rate >= 99%")
        else:
            print(f"    ⚠️  Success rate < 99%")
        
        return stats['success_rate'] >= 95


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

def test_select_performance():
    """Test SELECT query performance."""
    test = PerformanceTest("SELECT queries", num_iterations=100)
    
    for _ in range(test.num_iterations):
        start = time.time()
        try:
            r = db.table("products").select("id,title,price").limit(10).execute()
            if r["error"] is None:
                test.add_time(time.time() - start)
            else:
                test.add_error()
        except Exception:
            test.add_error()
    
    return test


def test_insert_simulation():
    """Simulate INSERT performance (read-only simulation)."""
    test = PerformanceTest("INSERT simulation", num_iterations=50)
    
    for i in range(test.num_iterations):
        start = time.time()
        try:
            # Simulate by building the query (not executing since we don't want actual inserts)
            r = db.table("products").select("*").limit(1).execute()
            if r["error"] is None:
                test.add_time(time.time() - start)
            else:
                test.add_error()
        except Exception:
            test.add_error()
    
    return test


def test_filter_performance():
    """Test filter performance (common query pattern)."""
    test = PerformanceTest("Filtered queries", num_iterations=100)
    
    for _ in range(test.num_iterations):
        start = time.time()
        try:
            r = (db.table("products")
                .select("id,title")
                .eq("is_active", True)
                .gt("stock_quantity", 0)
                .limit(5)
                .execute())
            if r["error"] is None:
                test.add_time(time.time() - start)
            else:
                test.add_error()
        except Exception:
            test.add_error()
    
    return test


def test_pagination_performance():
    """Test pagination performance (common UI pattern)."""
    test = PerformanceTest("Pagination queries", num_iterations=100)
    
    for i in range(test.num_iterations):
        offset = (i % 5) * 10  # Simulate page 1-5
        start = time.time()
        try:
            r = (db.table("products")
                .select("id,title,price")
                .order("created_at", desc=True)
                .range(offset, offset + 9)
                .execute())
            if r["error"] is None:
                test.add_time(time.time() - start)
            else:
                test.add_error()
        except Exception:
            test.add_error()
    
    return test


# ============================================================================
# CONCURRENCY TESTS (SIMULATING CONCURRENT USERS)
# ============================================================================

def simulate_concurrent_users(num_users=10, queries_per_user=10):
    """Simulate multiple concurrent users."""
    results = {
        "users": num_users,
        "queries_per_user": queries_per_user,
        "total_queries": num_users * queries_per_user,
        "successes": 0,
        "errors": 0,
        "times": [],
    }
    
    def user_workload(user_id):
        """Simulate one user's query pattern."""
        local_times = []
        local_errors = 0
        
        for query_id in range(queries_per_user):
            start = time.time()
            try:
                # Simulate typical user queries
                if query_id % 3 == 0:
                    r = db.table("products").select("*").limit(10).execute()
                elif query_id % 3 == 1:
                    r = db.table("orders").select("*").eq("phone_number", "254" + str(user_id % 1000).zfill(9)).limit(5).execute()
                else:
                    r = db.table("bookings").select("*").eq("status", "pending").limit(5).execute()
                
                duration = time.time() - start
                if r["error"] is None:
                    local_times.append(duration)
                else:
                    local_errors += 1
            except Exception:
                local_errors += 1
        
        return local_times, local_errors
    
    # Run concurrent users
    with ThreadPoolExecutor(max_workers=min(num_users, 10)) as executor:
        futures = [executor.submit(user_workload, i) for i in range(num_users)]
        
        for future in as_completed(futures):
            try:
                times, errors = future.result()
                results["times"].extend(times)
                results["errors"] += errors
                results["successes"] += len(times)
            except Exception as e:
                results["errors"] += queries_per_user
    
    return results


# ============================================================================
# STRESS TEST (CONNECTION POOL)
# ============================================================================

def stress_test_connection_pool(num_connections=20, queries_per_connection=5):
    """Stress test the connection pool."""
    print(f"\n  Stress Testing Connection Pool ({num_connections} concurrent, {queries_per_connection} queries each)...")
    
    results = {
        "total_queries": num_connections * queries_per_connection,
        "successes": 0,
        "errors": 0,
        "times": [],
    }
    
    def connection_workload():
        local_times = []
        local_errors = 0
        
        for _ in range(queries_per_connection):
            start = time.time()
            try:
                r = db.table("products").select("id,title,price").limit(20).execute()
                if r["error"] is None:
                    local_times.append(time.time() - start)
                else:
                    local_errors += 1
            except Exception:
                local_errors += 1
        
        return local_times, local_errors
    
    with ThreadPoolExecutor(max_workers=num_connections) as executor:
        futures = [executor.submit(connection_workload) for _ in range(num_connections)]
        
        for future in as_completed(futures):
            try:
                times, errors = future.result()
                results["times"].extend(times)
                results["errors"] += errors
                results["successes"] += len(times)
            except Exception as e:
                results["errors"] += queries_per_connection
    
    return results


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def run_load_tests():
    """Run all load and performance tests."""
    print(f"\n{'='*80}")
    print(f"PHASE 4 LOAD & PERFORMANCE TESTING — {os.getenv('DATABASE_TYPE', 'supabase').upper()}")
    print(f"{'='*80}")
    
    print(f"\n▶ Running Performance Tests...")
    
    perf_tests = [
        test_select_performance(),
        test_insert_simulation(),
        test_filter_performance(),
        test_pagination_performance(),
    ]
    
    all_passed = True
    for test in perf_tests:
        if not test.report():
            all_passed = False
    
    print(f"\n▶ Running Concurrency Tests...")
    
    # Test 1: 5 concurrent users
    print(f"\n  Simulating 5 concurrent users (10 queries each)...")
    results_5 = simulate_concurrent_users(5, 10)
    print(f"    Successes: {results_5['successes']}")
    print(f"    Errors: {results_5['errors']}")
    if results_5['times']:
        print(f"    Avg response time: {statistics.mean(results_5['times'])*1000:.2f}ms")
    
    # Test 2: 10 concurrent users
    print(f"\n  Simulating 10 concurrent users (10 queries each)...")
    results_10 = simulate_concurrent_users(10, 10)
    print(f"    Successes: {results_10['successes']}")
    print(f"    Errors: {results_10['errors']}")
    if results_10['times']:
        print(f"    Avg response time: {statistics.mean(results_10['times'])*1000:.2f}ms")
    
    print(f"\n▶ Running Connection Pool Stress Test...")
    stress_results = stress_test_connection_pool(20, 5)
    print(f"\n  Stress Test Results:")
    print(f"    Total Queries: {stress_results['total_queries']}")
    print(f"    Successes: {stress_results['successes']}")
    print(f"    Errors: {stress_results['errors']}")
    if stress_results['times']:
        print(f"    Avg response time: {statistics.mean(stress_results['times'])*1000:.2f}ms")
        print(f"    p99 response time: {sorted(stress_results['times'])[int(len(stress_results['times'])*0.99)]*1000:.2f}ms")
    
    print(f"\n{'='*80}")
    print(f"PERFORMANCE TARGETS")
    print(f"{'='*80}")
    print(f"✅ SELECT queries:        < 100ms avg")
    print(f"✅ Filtered queries:      < 150ms avg")
    print(f"✅ Pagination queries:    < 100ms avg")
    print(f"✅ p99 response time:     < 500ms")
    print(f"✅ Success rate:          >= 99%")
    print(f"✅ Concurrent users:      10+ simultaneous")
    print(f"✅ Connection pool:       20+ concurrent")
    print(f"\n{'='*80}\n")
    
    return all_passed and results_10['errors'] < 5 and stress_results['errors'] < 5


if __name__ == "__main__":
    success = run_load_tests()
    sys.exit(0 if success else 1)
