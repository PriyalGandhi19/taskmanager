from typing import Any, Optional
from django.db import connection, transaction

def fetch_one(sql: str, params: Optional[list[Any]] = None) -> Optional[dict]:
    with connection.cursor() as cur:
        cur.execute(sql, params or [])
        row = cur.fetchone()
        if row is None:
            return None
        cols = [c[0] for c in cur.description]
        return dict(zip(cols, row))

def fetch_all(sql: str, params: Optional[list[Any]] = None) -> list[dict]:
    with connection.cursor() as cur:
        cur.execute(sql, params or [])
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, r)) for r in rows]

def execute(sql: str, params: Optional[list[Any]] = None) -> int:
    with connection.cursor() as cur:
        cur.execute(sql, params or [])
        return cur.rowcount

def callproc(proc_name: str, params: Optional[list[Any]] = None) -> None:
    placeholders = ",".join(["%s"] * (len(params or [])))
    sql = f"CALL {proc_name}({placeholders});"
    with transaction.atomic():
        with connection.cursor() as cur:
            cur.execute(sql, params or [])
