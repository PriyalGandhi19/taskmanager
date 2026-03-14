from tasks.repositories.task_repo import (
    get_task_acl,
    get_admin_ids,
    should_notify_inapp,
    get_admin_ids_inapp_enabled,
)
from tasks.repositories.comment_repo import insert_comment, get_comment, update_comment , delete_comment
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

    owner_id = acl["owner_id"]

    # 🔔 RULES:
    # Admin comment -> notify owner
    # User comment  -> notify all admins
    
    try:
        if actor_role == "ADMIN":
            if owner_id != str(actor_id) and should_notify_inapp(owner_id):
                create_notification(
                    recipient_id=owner_id,
                    task_id=task_id,
                    ntype="COMMENT",
                    message="Admin commented on your task",
                    actor_id=actor_id,
                )
        else:
            admin_ids = get_admin_ids_inapp_enabled()
            for aid in admin_ids:
                if aid == str(actor_id):
                    continue
                create_notification(
                    recipient_id=aid,
                    task_id=task_id,
                    ntype="COMMENT",
                    message="User commented on a task",
                    actor_id=actor_id,
                )
    except Exception:
        pass
    # try:
    #     if actor_role == "ADMIN":
    #         if owner_id != str(actor_id):
    #             create_notification(
    #                 recipient_id=owner_id,
    #                 task_id=task_id,
    #                 ntype="COMMENT",
    #                 message="Admin commented on your task",
    #             )
    #     else:
    #         admin_ids = get_admin_ids()
    #         for aid in admin_ids:
    #             if aid == str(actor_id):
    #                 continue
    #             create_notification(
    #                 recipient_id=aid,
    #                 task_id=task_id,
    #                 ntype="COMMENT",
    #                 message="User commented on a task",
    #             )
    # except Exception:
    #     pass

    return {"comment_id": comment_id}


def edit_comment(actor_id: str, actor_role: str, comment_id: str, content: str) -> None:
    c = get_comment(comment_id)
    if not c:
        raise LookupError("Comment not found")

    # admin can edit any, else only comment owner
    if actor_role != "ADMIN" and str(c["user_id"]) != str(actor_id):
        raise PermissionError("Forbidden")

    update_comment(comment_id=comment_id, content=content)
    
    
def remove_comment(actor_id: str, actor_role: str, comment_id: str) -> None:
    c = get_comment(comment_id)
    if not c:
        raise LookupError("Comment not found")

    if actor_role != "ADMIN" and str(c["user_id"]) != str(actor_id):
        raise PermissionError("Forbidden")

    delete_comment(comment_id=comment_id)