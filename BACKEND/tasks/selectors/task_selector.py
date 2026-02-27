from tasks.repositories.task_repo import list_tasks_for_user
from tasks.repositories.attachment_repo import list_attachments_for_tasks

def get_tasks_with_attachments(actor_id: str) -> list[dict]:
    rows = list_tasks_for_user(actor_id)

    task_ids = [str(r["id"]) for r in rows]
    attachments = list_attachments_for_tasks(task_ids)

    att_map: dict[str, list[dict]] = {}
    for a in attachments:
        aid = str(a["id"])
        tid = str(a["task_id"])
        att_map.setdefault(tid, []).append({
            "id": aid,
            "original_name": a["original_name"],
            "size_bytes": int(a["size_bytes"]),
            "content_type": a["content_type"],
            "download_url": f"/api/attachments/{aid}/download",
            "created_at": a["created_at"],
        })

    for r in rows:
        r["id"] = str(r["id"])
        r["owner_id"] = str(r["owner_id"])
        r["created_by"] = str(r["created_by"])

        r["can_edit_status"] = bool(r.get("can_edit_status", False))
        r["can_edit_content"] = bool(r.get("can_edit_content", False))
        r["can_delete"] = bool(r.get("can_delete", False))

        # ✅ new fields exist in fn_get_tasks_for_user now
        # due_date may be None or datetime; priority is text; completed_at maybe datetime
        r["attachments"] = att_map.get(r["id"], [])

    return rows