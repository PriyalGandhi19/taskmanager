from django.utils.dateparse import parse_date
from backend.utils.db import fetch_all, fetch_one

ALLOWED_EVENTS = {"LOGIN", "LOGOUT", "FAILED_LOGIN"}

def list_auth_activity(
    email=None,
    event=None,
    success=None,
    date_from=None,
    date_to=None,
    limit=100,
    offset=0,
):
    where = []
    params = []

    if email:
        where.append("LOWER(a.email) LIKE %s")
        params.append(f"%{email.strip().lower()}%")

    if event:
        ev = event.strip().upper()
        if ev in ALLOWED_EVENTS:
            where.append("a.event = %s")
            params.append(ev)

    if success in ["true", "false"]:
        where.append("a.success = %s")
        params.append(success == "true")

    if date_from:
        d = parse_date(date_from)
        if d:
            where.append("a.created_at::date >= %s")
            params.append(d)

    if date_to:
        d = parse_date(date_to)
        if d:
            where.append("a.created_at::date <= %s")
            params.append(d)

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    sql = f"""
        SELECT
          a.id,
          a.user_id,
          a.email,
          a.event,
          a.ip_address AS ip,
          a.user_agent,
          a.success,
          a.created_at
        FROM auth_activity a
        {where_sql}
        ORDER BY a.created_at DESC
        LIMIT %s OFFSET %s;
    """

    params2 = params + [limit, offset]
    return fetch_all(sql, params2)


def count_auth_activity(
    email=None,
    event=None,
    success=None,
    date_from=None,
    date_to=None,
) -> int:
    where = []
    params = []

    if email:
        where.append("LOWER(a.email) LIKE %s")
        params.append(f"%{email.strip().lower()}%")

    if event:
        ev = event.strip().upper()
        if ev in ALLOWED_EVENTS:
            where.append("a.event = %s")
            params.append(ev)

    if success in ["true", "false"]:
        where.append("a.success = %s")
        params.append(success == "true")

    if date_from:
        d = parse_date(date_from)
        if d:
            where.append("a.created_at::date >= %s")
            params.append(d)

    if date_to:
        d = parse_date(date_to)
        if d:
            where.append("a.created_at::date <= %s")
            params.append(d)

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    row = fetch_one(
        f"SELECT COUNT(*)::bigint AS total FROM auth_activity a {where_sql};",
        params,
    )
    return int(row["total"]) if row else 0