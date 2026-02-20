from backend.utils.db import fetch_one, fetch_all, callproc

def list_tasks_for_user(user_id: str) -> list[dict]:
    return fetch_all("SELECT * FROM fn_get_tasks_for_user(%s);", [user_id])

def get_task_basic(task_id: str) -> dict | None:
    return fetch_one(
        "SELECT id, title, description, status FROM tasks WHERE id=%s;",
        [task_id],
    )

def create_task_returning_id(actor_id: str, title: str, description: str, status: str, owner_id: str | None):
    return fetch_one(
        "SELECT fn_create_task(%s,%s,%s,%s,%s) AS id;",
        [actor_id, title, description, status, owner_id],
    )

def update_task(actor_id: str, task_id: str, title: str, description: str, status: str) -> None:
    callproc("sp_update_task", [actor_id, task_id, title, description, status])

def delete_task(actor_id: str, task_id: str) -> None:
    callproc("sp_delete_task", [actor_id, task_id])

def get_user_email(user_id: str) -> dict | None:
    return fetch_one("SELECT email FROM users WHERE id=%s;", [user_id])