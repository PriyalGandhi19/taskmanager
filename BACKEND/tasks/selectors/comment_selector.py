from tasks.repositories.comment_repo import list_comments_for_task

def get_comments(task_id: str) -> list[dict]:
    rows = list_comments_for_task(task_id)
    for r in rows:
        r["id"] = str(r["id"])
        r["task_id"] = str(r["task_id"])
        r["user_id"] = str(r["user_id"])
        r["is_edited"] = bool(r["is_edited"])
    return rows