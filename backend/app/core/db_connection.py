"""
core/db_connection.py — Unified database connection factory.

Supports two database backends:
  - Supabase (dev): Uses Supabase Python SDK
  - PostgreSQL (prod/cPanel): Direct psycopg2 connection with pooling

All configuration via environment variables. Lazy initialization on first use.

Usage:
    from core.db_connection import get_connection
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
"""

import os
import sys
from typing import Any

from supabase import create_client

# Global connection pool (for PostgreSQL)
_pg_pool: Any = None

# Global Supabase client
_supabase_client: Any = None

# Detect which database backend to use
_db_type = os.getenv("DATABASE_TYPE", "").lower()


def get_connection() -> Any:
    """
    Get a database connection.

    Returns:
      - psycopg2 connection (if DATABASE_TYPE=postgresql)
      - Supabase client (if DATABASE_TYPE=supabase)
    """
    if _db_type == "postgresql":
        return _get_pg_connection()
    elif _db_type == "supabase":
        return _get_supabase_connection()
    else:
        raise RuntimeError(
            f"Invalid DATABASE_TYPE='{_db_type}'. "
            "Must be 'postgresql' or 'supabase'. Set it in environment."
        )


def _get_pg_connection() -> Any:
    """Get a PostgreSQL connection from the pool."""
    global _pg_pool

    if _pg_pool is None:
        _pg_pool = _init_pg_pool()

    try:
        return _pg_pool.getconn()
    except pool.PoolError as e:
        raise RuntimeError(f"Failed to get PostgreSQL connection from pool: {e}")


def _init_pg_pool() -> Any:
    """Initialize PostgreSQL connection pool."""
    # Lazy import psycopg2 only when needed
    try:
        import psycopg2
        from psycopg2 import pool
    except ImportError:
        raise ImportError(
            "psycopg2 is required for PostgreSQL backend. "
            "Install it with: pip install psycopg2-binary"
        )

    # Get connection parameters from environment
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME")
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")

    # Validate all required vars are set
    missing = []
    if not db_host:
        missing.append("DB_HOST")
    if not db_name:
        missing.append("DB_NAME")
    if not db_user:
        missing.append("DB_USER")
    if not db_password:
        missing.append("DB_PASSWORD")

    if missing:
        raise RuntimeError(
            f"Missing PostgreSQL env vars: {', '.join(missing)}. "
            "Set them when DATABASE_TYPE=postgresql"
        )

    try:
        dsn = (
            f"host={db_host} "
            f"port={db_port} "
            f"database={db_name} "
            f"user={db_user} "
            f"password={db_password}"
        )
        # Create a pool with 5-20 connections
        pg_pool = pool.SimpleConnectionPool(
            5,  # minconn
            20,  # maxconn
            dsn,
        )
        return pg_pool
    except psycopg2.OperationalError as e:
        raise RuntimeError(
            f"Failed to connect to PostgreSQL at {db_host}:{db_port}/{db_name}: {e}"
        )


def _get_supabase_connection() -> Any:
    """Get a Supabase client."""
    global _supabase_client

    if _supabase_client is None:
        _supabase_client = _init_supabase()

    return _supabase_client


def _init_supabase() -> Any:
    """Initialize Supabase client."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not supabase_url or not supabase_key:
        raise RuntimeError(
            "Missing Supabase env vars: SUPABASE_URL or SUPABASE_SERVICE_KEY. "
            "Set them when DATABASE_TYPE=supabase"
        )

    try:
        return create_client(supabase_url, supabase_key)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Supabase client: {e}")


def close_connection(conn: Any) -> None:
    """
    Return a connection to the pool (PostgreSQL) or no-op (Supabase).

    Args:
        conn: Connection object returned by get_connection()
    """
    if _db_type == "postgresql" and _pg_pool:
        try:
            _pg_pool.putconn(conn)
        except pool.PoolError as e:
            print(f"Warning: Failed to return connection to pool: {e}", file=sys.stderr)


def validate_connection() -> bool:
    """
    Test the database connection.

    Returns:
        True if connection is valid, raises exception otherwise
    """
    try:
        if _db_type == "postgresql":
            conn = _get_pg_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            close_connection(conn)
            return True
        else:
            # Supabase — just check if client is initialized
            client = _get_supabase_connection()
            return client is not None
    except Exception as e:
        raise RuntimeError(f"Database connection validation failed: {e}")
