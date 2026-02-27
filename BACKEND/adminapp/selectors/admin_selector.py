from adminapp.repositories.user_repo import list_users
from adminapp.repositories.audit_repo import list_audit_logs
from adminapp.repositories.auth_activity_repo import list_auth_activity, count_auth_activity

def get_users() -> list[dict]:
    users = list_users()
    for u in users:
        u["id"] = str(u["id"])
    return users

def get_audit_logs(limit: int, action: str | None, entity: str | None) -> list[dict]:
    logs = list_audit_logs(limit=limit, action=action, entity=entity)

    for l in logs:
        if l.get("actor_id"):
            l["actor_id"] = str(l["actor_id"])
        if l.get("entity_id"):
            l["entity_id"] = str(l["entity_id"])

    return logs

def get_auth_activity(email: str | None, date_from: str | None, date_to: str | None, page: int, limit: int) -> dict:
    offset = (page - 1) * limit
    items = list_auth_activity(email=email, date_from=date_from, date_to=date_to, limit=limit, offset=offset)
    total = count_auth_activity(email=email, date_from=date_from, date_to=date_to)

    for r in items:
        # bigint -> int ok
        if r.get("user_id"):
            r["user_id"] = str(r["user_id"])

    return {"items": items, "total": total, "page": page, "limit": limit}