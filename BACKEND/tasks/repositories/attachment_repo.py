from backend.utils.db import fetch_one, fetch_all

def list_attachments_for_tasks(task_ids: list[str]) -> list[dict]:
    if not task_ids:
        return []
    return fetch_all(
        """
        SELECT id, task_id, original_name, size_bytes, content_type, created_at
        FROM task_attachments
        WHERE task_id = ANY(%s::uuid[])
        ORDER BY created_at DESC;
        """,
        [task_ids],
    )

def insert_attachment(
    task_id: str,
    original_name: str,
    storage_name: str,
    content_type: str,
    size_bytes: int,
    uploaded_by: str,
) -> dict:
    return fetch_one(
        """
        INSERT INTO task_attachments(task_id, original_name, storage_name, content_type, size_bytes, uploaded_by)
        VALUES (%s,%s,%s,%s,%s,%s)
        RETURNING id;
        """,
        [task_id, original_name, storage_name, content_type, size_bytes, uploaded_by],
    )

def get_attachment_with_owner(attachment_id: str) -> dict | None:
    return fetch_one(
        """
        SELECT
          a.id, a.original_name, a.storage_name, a.content_type,
          t.owner_id
        FROM task_attachments a
        JOIN tasks t ON t.id = a.task_id
        WHERE a.id = %s
        LIMIT 1;
        """,
        [attachment_id],
    )