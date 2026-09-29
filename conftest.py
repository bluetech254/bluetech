"""
conftest.py — pytest configuration for BlueTech endpoint tests.
Prints a state summary at the end of the session.
"""
import pytest
from tests.test_endpoints import state, BASE_URL


def pytest_sessionstart(session):
    print(f"\n{'='*60}")
    print(f"  BlueTech Backend Test Suite")
    print(f"  Target: {BASE_URL}")
    print(f"  Phone:  254704291657")
    print(f"{'='*60}")


def pytest_sessionfinish(session, exitstatus):
    print(f"\n{'='*60}")
    print("  Test State Summary:")
    for k, v in state.items():
        val = str(v)[:60] if v else "None"
        print(f"    {k:<20} {val}")
    print(f"{'='*60}\n")
