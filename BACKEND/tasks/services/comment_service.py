from tasks.repositories.task_repo import get_task_acl
from tasks.repositories.comment_repo import insert_comment, get_comment, update_comment
from tasks.repositories.notification_repo import create_notification

def _can_access_task(actor_id: str, actor_role: str, task_id: str) -> dict:
    acl = get_task_acl(task_id)
    if not acl:
        raise LookupError("Task not found")

    owner_id = str(acl["owner_id"])

    if actor_role != "ADMIN" and owner_id != str(actor_id):
        raise PermissionError("Forbidden")

    return {"owner_id": owner_id, "created_by": str(acl["created_by"])}

def add_comment(actor_id: str, actor_role: str, task_id: str, content: str) -> dict:
    acl = _can_access_task(actor_id, actor_role, task_id)

    row = insert_comment(task_id=task_id, user_id=actor_id, content=content)
    comment_id = str(row["id"])

    # 🔔 notify task owner if someone else commented
    if acl["owner_id"] != str(actor_id):
        try:
            create_notification(
                recipient_id=acl["owner_id"],
                task_id=task_id,
                ntype="COMMENT",
                message="New comment added on your task",
            )
        except Exception:
            pass

    return {"comment_id": comment_id}

def edit_comment(actor_id: str, actor_role: str, comment_id: str, content: str) -> None:
    c = get_comment(comment_id)
    if not c:
        raise LookupError("Comment not found")

    # admin can edit any, else only comment owner
    if actor_role != "ADMIN" and str(c["user_id"]) != str(actor_id):
        raise PermissionError("Forbidden")

    update_comment(comment_id=comment_id, content=content)