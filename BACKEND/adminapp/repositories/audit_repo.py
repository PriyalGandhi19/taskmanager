from backend.utils.db import fetch_all

def list_audit_logs(limit: int, action: str | None, entity: str | None) -> list[dict]:
    where = []
    params = []

    if action:
        where.append("a.action = %s")
        params.append(action)

    if entity:
        where.append("a.entity = %s")
        params.append(entity)

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    return fetch_all(
        f"""
        SELECT
          a.id,
          a.actor_id,
          u.email AS actor_email,
          a.action,
          a.entity,
          a.entity_id,
          a.payload,
          a.created_at
        FROM audit_log a
        LEFT JOIN users u ON u.id = a.actor_id
        {where_sql}
        ORDER BY a.created_at DESC
        LIMIT %s;
        """,
        params + [limit],
    )