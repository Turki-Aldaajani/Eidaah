"""A minimal in-memory Supabase double for C4 tests.

Supports the query chains the video subsystem actually uses:
    table(name).select("*").eq(...).gt(...).order(...).execute().data
    table(name).insert(rows).execute()
    table(name).delete().eq(...).execute()
Not a pytest test file (no test_ prefix) — imported by the real test modules.
"""

from types import SimpleNamespace


class _Query:
    def __init__(self, table):
        self._table = table
        self._filters = []
        self._order = None
        self._mode = "select"
        self._rows_to_insert = None

    # builder methods -------------------------------------------------
    def select(self, *_a):
        self._mode = "select"
        return self

    def insert(self, rows):
        self._mode = "insert"
        self._rows_to_insert = rows
        return self

    def delete(self):
        self._mode = "delete"
        return self

    def eq(self, col, val):
        self._filters.append((col, "eq", val))
        return self

    def gt(self, col, val):
        self._filters.append((col, "gt", val))
        return self

    def order(self, col, **_k):
        self._order = col
        return self

    # execution -------------------------------------------------------
    def _match(self, row):
        for col, op, val in self._filters:
            rv = row.get(col)
            if op == "eq" and rv != val:
                return False
            if op == "gt" and not (rv is not None and str(rv) > str(val)):
                return False
        return True

    def execute(self):
        if self._mode == "insert":
            for r in self._rows_to_insert:
                self._table.rows.append(dict(r))
            return SimpleNamespace(data=[dict(r) for r in self._rows_to_insert])
        if self._mode == "delete":
            removed = [r for r in self._table.rows if self._match(r)]
            self._table.rows = [r for r in self._table.rows if not self._match(r)]
            return SimpleNamespace(data=removed)
        rows = [dict(r) for r in self._table.rows if self._match(r)]
        if self._order:
            rows.sort(key=lambda r: r.get(self._order))
        return SimpleNamespace(data=rows)


class _Table:
    def __init__(self):
        self.rows = []

    def select(self, *a):
        return _Query(self).select(*a)

    def insert(self, rows):
        return _Query(self).insert(rows)

    def delete(self):
        return _Query(self).delete()


class FakeSupabase:
    def __init__(self, seed=None):
        self._tables = {}
        for name, rows in (seed or {}).items():
            self._tables.setdefault(name, _Table()).rows.extend(dict(r) for r in rows)

    def table(self, name):
        return self._tables.setdefault(name, _Table())

    def rows(self, name):
        return self._tables.setdefault(name, _Table()).rows
