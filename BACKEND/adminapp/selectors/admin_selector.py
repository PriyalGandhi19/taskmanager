from adminapp.repositories.user_repo import list_users
from adminapp.repositories.audit_repo import list_audit_logs

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