from tasks.repositories.notification_repo import list_notifications_for_user, count_unread

def get_notifications(user_id: str, unread_only: bool = False, limit: int = 20) -> list[dict]:
    rows = list_notifications_for_user(user_id=user_id, unread_only=unread_only, limit=limit)
    for r in rows:
        r["id"] = str(r["id"])
        r["recipient_id"] = str(r["recipient_id"])
        r["task_id"] = str(r["task_id"]) if r.get("task_id") else None
        r["is_read"] = bool(r["is_read"])
    return rows

def get_unread_count(user_id: str) -> int:
    return count_unread(user_id)