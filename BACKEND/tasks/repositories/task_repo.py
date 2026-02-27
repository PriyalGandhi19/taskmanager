from backend.utils.db import fetch_one, fetch_all, callproc

def list_tasks_for_user(user_id: str) -> list[dict]:
    return fetch_all("SELECT * FROM fn_get_tasks_for_user(%s);", [user_id])

def get_task_basic(task_id: str) -> dict | None:
    return fetch_one(
        """
        SELECT id, title, description, status, owner_id, created_by, due_date, priority
        FROM tasks
        WHERE id=%s;
        """,
        [task_id],
    )

def get_task_acl(task_id: str) -> dict | None:
    """Used for permission checks (owner/creator)."""
    return fetch_one(
        "SELECT id, owner_id, created_by FROM tasks WHERE id=%s;",
        [task_id],
    )

def create_task_returning_id(
    actor_id: str,
    title: str,
    description: str,
    status: str,
    owner_id: str | None,
    due_date,          # datetime or None
    priority: str,     # LOW|MEDIUM|HIGH
):
    # ✅ updated fn signature: 7 params
    return fetch_one(
        "SELECT fn_create_task(%s,%s,%s,%s,%s,%s,%s) AS id;",
        [actor_id, title, description, status, owner_id, due_date, priority],
    )

def update_task(
    actor_id: str,
    task_id: str,
    title: str,
    description: str,
    status: str,
    due_date,
    priority: str,
) -> None:
    # ✅ updated procedure signature: 7 params
    callproc("sp_update_task", [actor_id, task_id, title, description, status, due_date, priority])

def delete_task(actor_id: str, task_id: str) -> None:
    callproc("sp_delete_task", [actor_id, task_id])

def get_user_email(user_id: str) -> dict | None:
    return fetch_one("SELECT email FROM users WHERE id=%s;", [user_id])

def get_task_summary_for_user(user_id: str) -> dict:
    row = fetch_one("SELECT * FROM fn_task_summary_for_user(%s);", [user_id])
    return row or {"total": 0, "pending": 0, "in_progress": 0, "completed": 0, "completion_pct": 0}