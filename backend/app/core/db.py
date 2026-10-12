"""
core/db.py — Query abstraction layer for both Supabase and PostgreSQL.

Provides a unified API that mirrors Supabase's query builder (.table, .select, .eq, etc).
Transparently translates to SQL for PostgreSQL or passes through to Supabase client.

Usage:
    from core.db import db

    # Works identically on both backends:
    resp = db.table("users").select("*").eq("id", "123").single().execute()
    resp = db.table("users").insert({"name": "Alice"}).execute()
    resp = db.table("users").update({"name": "Bob"}).eq("id", "123").execute()
    resp = db.table("users").delete().eq("id", "123").execute()

Response format (both backends):
    {
        "data": [...],      # List of rows (SELECT, INSERT, UPDATE, DELETE) or single row (.single())
        "count": int,       # Number of rows affected/returned
        "error": str|None   # Error message or None if success
    }
"""

import os
from typing import Any, Dict, List, Optional

from core.db_connection import close_connection, get_connection


def _get_db_type() -> str:
    """Read DATABASE_TYPE lazily (not at import time)."""
    db_type = os.getenv("DATABASE_TYPE", "").lower()
    if db_type:
        return db_type
    try:
        from core.config import settings
        return settings.DATABASE_TYPE.lower()
    except Exception:
        return ""


class DBResponse(dict):
    """
    Response object that behaves as both a dict (supports ['data']) and
    an object (supports .data, .count, .error) for backward compatibility
    with code that used the Supabase SDK's attribute-style access.
    """

    def __init__(self, data: Any = None, count: int = 0, error: Optional[str] = None):
        super().__init__()
        self["data"] = data
        self["count"] = count
        self["error"] = error

    @property
    def data(self) -> Any:
        return self["data"]

    @property
    def count(self) -> int:
        return self["count"]

    @property
    def error(self) -> Optional[str]:
        return self["error"]


class QueryBuilder:
    """Unified query builder for Supabase and PostgreSQL."""

    def __init__(self, table_name: str):
        """Initialize query builder for a table."""
        self.table_name = table_name
        self.conn = get_connection()
        _current_db_type = _get_db_type()
        self.is_supabase = _current_db_type == "supabase"
        self.is_postgres = _current_db_type == "postgresql"

        # For Supabase: store the table reference
        self._sb_table = None if not self.is_supabase else self.conn.table(table_name)

        # For PostgreSQL: build query components
        self._select_cols = "*"
        self._filters: List[tuple] = []  # List of (column, operator, value)
        self._order_by: List[tuple] = []  # List of (column, desc)
        self._limit_val: Optional[int] = None
        self._range_start: Optional[int] = None
        self._range_end: Optional[int] = None
        self._is_single = False
        self._insert_data: Optional[Dict] = None
        self._update_data: Optional[Dict] = None
        self._delete = False

    def select(self, columns: str) -> "QueryBuilder":
        """Specify columns to select."""
        if self.is_supabase:
            self._sb_table = self._sb_table.select(columns)
        else:
            self._select_cols = columns
        return self

    def insert(self, data: Dict) -> "QueryBuilder":
        """Insert one or more rows."""
        if self.is_supabase:
            self._sb_table = self._sb_table.insert(data)
        else:
            self._insert_data = data
        return self

    def update(self, data: Dict) -> "QueryBuilder":
        """Update row(s)."""
        if self.is_supabase:
            self._sb_table = self._sb_table.update(data)
        else:
            self._update_data = data
        return self

    def delete(self) -> "QueryBuilder":
        """Delete row(s)."""
        if self.is_supabase:
            self._sb_table = self._sb_table.delete()
        else:
            self._delete = True
        return self

    def eq(self, column: str, value: Any) -> "QueryBuilder":
        """Filter by equality."""
        if self.is_supabase:
            self._sb_table = self._sb_table.eq(column, value)
        else:
            self._filters.append((column, "=", value))
        return self

    def neq(self, column: str, value: Any) -> "QueryBuilder":
        """Filter by inequality."""
        if self.is_supabase:
            self._sb_table = self._sb_table.neq(column, value)
        else:
            self._filters.append((column, "!=", value))
        return self

    def gt(self, column: str, value: Any) -> "QueryBuilder":
        """Filter by greater than."""
        if self.is_supabase:
            self._sb_table = self._sb_table.gt(column, value)
        else:
            self._filters.append((column, ">", value))
        return self

    def gte(self, column: str, value: Any) -> "QueryBuilder":
        """Filter by greater than or equal."""
        if self.is_supabase:
            self._sb_table = self._sb_table.gte(column, value)
        else:
            self._filters.append((column, ">=", value))
        return self

    def lt(self, column: str, value: Any) -> "QueryBuilder":
        """Filter by less than."""
        if self.is_supabase:
            self._sb_table = self._sb_table.lt(column, value)
        else:
            self._filters.append((column, "<", value))
        return self

    def lte(self, column: str, value: Any) -> "QueryBuilder":
        """Filter by less than or equal."""
        if self.is_supabase:
            self._sb_table = self._sb_table.lte(column, value)
        else:
            self._filters.append((column, "<=", value))
        return self

    def in_(self, column: str, values: List[Any]) -> "QueryBuilder":
        """Filter by IN list."""
        if self.is_supabase:
            self._sb_table = self._sb_table.in_(column, values)
        else:
            self._filters.append((column, "IN", values))
        return self

    def ilike(self, column: str, pattern: str) -> "QueryBuilder":
        """Filter by case-insensitive LIKE."""
        if self.is_supabase:
            self._sb_table = self._sb_table.ilike(column, pattern)
        else:
            self._filters.append((column, "ILIKE", pattern))
        return self

    def like(self, column: str, pattern: str) -> "QueryBuilder":
        """Filter by LIKE."""
        if self.is_supabase:
            self._sb_table = self._sb_table.like(column, pattern)
        else:
            self._filters.append((column, "LIKE", pattern))
        return self

    def is_(self, column: str, value: Any) -> "QueryBuilder":
        """Filter by IS (for NULL checks)."""
        if self.is_supabase:
            self._sb_table = self._sb_table.is_(column, value)
        else:
            self._filters.append((column, "IS", value))
        return self

    def order(self, column: str, desc: bool = False) -> "QueryBuilder":
        """Order by column."""
        if self.is_supabase:
            self._sb_table = self._sb_table.order(column, desc=desc)
        else:
            self._order_by.append((column, desc))
        return self

    def limit(self, count: int) -> "QueryBuilder":
        """Limit number of rows."""
        if self.is_supabase:
            self._sb_table = self._sb_table.limit(count)
        else:
            self._limit_val = count
        return self

    def range(self, start: int, end: int) -> "QueryBuilder":
        """Limit to range [start, end]."""
        if self.is_supabase:
            self._sb_table = self._sb_table.range(start, end)
        else:
            self._range_start = start
            self._range_end = end
        return self

    def single(self) -> "QueryBuilder":
        """Return single row (error if not exactly 1 row)."""
        if self.is_supabase:
            self._sb_table = self._sb_table.single()
        else:
            self._is_single = True
        return self

    def execute(self) -> DBResponse:
        """Execute the query and return standardized response."""
        if self.is_supabase:
            try:
                result = self._sb_table.execute()
                close_connection(self.conn)
                return DBResponse(
                    data=result.data,
                    count=len(result.data) if result.data else 0,
                    error=None,
                )
            except Exception as e:
                close_connection(self.conn)
                return DBResponse(data=None, count=0, error=str(e))
        else:
            return self._execute_postgres()

    def _execute_postgres(self) -> DBResponse:
        """Execute query on PostgreSQL backend."""
        try:
            cursor = self.conn.cursor()

            # Build and execute appropriate SQL
            if self._insert_data:
                sql, params = self._build_insert_sql()
            elif self._update_data:
                sql, params = self._build_update_sql()
            elif self._delete:
                sql, params = self._build_delete_sql()
            else:
                sql, params = self._build_select_sql()

            cursor.execute(sql, params)

            # For INSERT/UPDATE/DELETE: fetch results if any, return row count
            if self._insert_data or self._update_data or self._delete:
                # Commit and get affected row count
                self.conn.commit()
                result = DBResponse(
                    data=[] if self._delete else [self._insert_data or self._update_data],
                    count=cursor.rowcount,
                    error=None,
                )
            else:
                # SELECT: fetch results
                rows = cursor.fetchall()
                col_names = [desc[0] for desc in cursor.description or []]
                data = [dict(zip(col_names, row)) for row in rows]

                if self._is_single:
                    if len(data) != 1:
                        cursor.close()
                        close_connection(self.conn)
                        return DBResponse(
                            data=None,
                            count=0,
                            error=f"Expected 1 row, got {len(data)}",
                        )
                    data = data[0]

                result = DBResponse(
                    data=data,
                    count=len(data) if isinstance(data, list) else 1 if data else 0,
                    error=None,
                )

            cursor.close()
            close_connection(self.conn)
            return result

        except Exception as e:
            self.conn.rollback()
            close_connection(self.conn)
            return DBResponse(data=None, count=0, error=str(e))

    def _build_select_sql(self) -> tuple:
        """Build SELECT SQL statement."""
        sql = f"SELECT {self._select_cols} FROM {self.table_name}"
        params = []

        if self._filters:
            where_clauses = []
            for col, op, val in self._filters:
                if op == "IN":
                    placeholders = ",".join(["%s"] * len(val))
                    where_clauses.append(f"{col} IN ({placeholders})")
                    params.extend(val)
                else:
                    where_clauses.append(f"{col} {op} %s")
                    params.append(val)
            sql += " WHERE " + " AND ".join(where_clauses)

        if self._order_by:
            order_clauses = []
            for col, desc in self._order_by:
                order_clauses.append(f"{col} {'DESC' if desc else 'ASC'}")
            sql += " ORDER BY " + ", ".join(order_clauses)

        if self._range_start is not None and self._range_end is not None:
            sql += f" LIMIT {self._range_end - self._range_start + 1} OFFSET {self._range_start}"
        elif self._limit_val is not None:
            sql += f" LIMIT {self._limit_val}"

        return sql, params

    def _build_insert_sql(self) -> tuple:
        """Build INSERT SQL statement."""
        if isinstance(self._insert_data, list):
            # Multiple rows
            if not self._insert_data:
                raise ValueError("Cannot insert empty list")
            first_row = self._insert_data[0]
            cols = list(first_row.keys())
            placeholders = ",".join(["%s"] * len(cols))
            sql = (
                f"INSERT INTO {self.table_name} ({','.join(cols)}) "
                f"VALUES ({placeholders})"
            )
            params = []
            for row in self._insert_data:
                params.extend([row.get(col) for col in cols])
            # For multiple rows: reconstruct VALUES clause
            all_placeholders = ", ".join(
                [f"({placeholders})"] * len(self._insert_data)
            )
            sql = (
                f"INSERT INTO {self.table_name} ({','.join(cols)}) "
                f"VALUES {all_placeholders}"
            )
        else:
            # Single row
            cols = list(self._insert_data.keys())
            placeholders = ",".join(["%s"] * len(cols))
            sql = (
                f"INSERT INTO {self.table_name} ({','.join(cols)}) "
                f"VALUES ({placeholders})"
            )
            params = list(self._insert_data.values())

        return sql, params

    def _build_update_sql(self) -> tuple:
        """Build UPDATE SQL statement."""
        cols = list(self._update_data.keys())
        set_clauses = [f"{col} = %s" for col in cols]
        sql = f"UPDATE {self.table_name} SET " + ", ".join(set_clauses)
        params = list(self._update_data.values())

        if self._filters:
            where_clauses = []
            for col, op, val in self._filters:
                if op == "IN":
                    placeholders = ",".join(["%s"] * len(val))
                    where_clauses.append(f"{col} IN ({placeholders})")
                    params.extend(val)
                else:
                    where_clauses.append(f"{col} {op} %s")
                    params.append(val)
            sql += " WHERE " + " AND ".join(where_clauses)

        return sql, params

    def _build_delete_sql(self) -> tuple:
        """Build DELETE SQL statement."""
        sql = f"DELETE FROM {self.table_name}"
        params = []

        if self._filters:
            where_clauses = []
            for col, op, val in self._filters:
                if op == "IN":
                    placeholders = ",".join(["%s"] * len(val))
                    where_clauses.append(f"{col} IN ({placeholders})")
                    params.extend(val)
                else:
                    where_clauses.append(f"{col} {op} %s")
                    params.append(val)
            sql += " WHERE " + " AND ".join(where_clauses)

        return sql, params


class Database:
    """Main database interface. Use: db.table("name").select("*").execute()"""

    def table(self, name: str) -> QueryBuilder:
        """Get a query builder for a table."""
        return QueryBuilder(name)


# Singleton instance
db = Database()
