import os
from django.conf import settings

from backend.utils.files import save_task_pdf
from backend.utils.mailer import send_task_assigned_email

from tasks.repositories.task_repo import (
    create_task_returning_id,
    get_user_email,
    get_task_basic,
    update_task as repo_update_task,
    delete_task as repo_delete_task,
)
from tasks.repositories.attachment_repo import insert_attachment, get_attachment_with_owner


MAX_PDF_BYTES = 10 * 1024 * 1024

def _validate_pdf(uploaded_file):
    if not uploaded_file:
        return
    if not uploaded_file.name.lower().endswith(".pdf"):
        raise ValueError("Only PDF files allowed")
    if uploaded_file.size > MAX_PDF_BYTES:
        raise ValueError("PDF too large (max 10MB).")


def create_task(actor_id: str, actor_role: str, data: dict, uploaded_file=None) -> dict:
    title = data["title"]
    description = data.get("description", "")
    status = data.get("status", "PENDING")
    owner_id = str(data.get("owner_id")) if data.get("owner_id") else None

    if actor_role == "ADMIN" and not owner_id:
        raise PermissionError("owner_id is required for admin created task")

    _validate_pdf(uploaded_file)

    row = create_task_returning_id(actor_id, title, description, status, owner_id)
    task_id = str(row["id"])

    # owner email for notification
    owner_row = get_user_email(owner_id) if actor_role == "ADMIN" else get_user_email(actor_id)

    saved_pdf_path = None
    attachment_id = None

    if uploaded_file:
        saved_pdf_path, storage_name, size_bytes = save_task_pdf(uploaded_file)
        att = insert_attachment(
            task_id=task_id,
            original_name=uploaded_file.name,
            storage_name=storage_name,
            content_type=getattr(uploaded_file, "content_type", "application/pdf"),
            size_bytes=size_bytes,
            uploaded_by=actor_id,
        )
        attachment_id = str(att["id"])

    # email (don’t fail the request if email fails)
    if owner_row and owner_row.get("email"):
        try:
            send_task_assigned_email(
                to_email=owner_row["email"],
                task_title=title,
                task_desc=description,
                task_status=status,
                pdf_path=saved_pdf_path,
            )
        except Exception:
            pass

    return {
        "task_id": task_id,
        "attachment_id": attachment_id,
        "attachment_download_url": f"/api/attachments/{attachment_id}/download" if attachment_id else None,
    }


def update_task(actor_id: str, task_id: str, data: dict) -> None:
    current = get_task_basic(task_id)
    if not current:
        raise LookupError("Task not found")

    title = data.get("title", current["title"])
    description = data.get("description", current["description"])
    status = data.get("status", current["status"])

    # status already validated/normalized by serializer if provided
    status = (status or "").strip().upper()

    try:
        repo_update_task(actor_id, task_id, title, description, status)
    except Exception as ex:
        msg = str(ex)
        if "Forbidden" in msg:
            raise PermissionError("Forbidden")
        if "Task not found" in msg:
            raise LookupError("Task not found")
        raise ValueError(msg)


def delete_task(actor_id: str, task_id: str) -> None:
    current = get_task_basic(task_id)
    if not current:
        raise LookupError("Task not found")

    try:
        repo_delete_task(actor_id, task_id)
    except Exception as ex:
        msg = str(ex)
        if "Forbidden" in msg:
            raise PermissionError("Forbidden")
        if "Task not found" in msg:
            raise LookupError("Task not found")
        raise ValueError(msg)


def get_download_file(attachment_id: str, actor_id: str, actor_role: str):
    row = get_attachment_with_owner(attachment_id)
    if not row:
        raise LookupError("Attachment not found")

    if actor_role != "ADMIN" and str(row["owner_id"]) != str(actor_id):
        raise PermissionError("Forbidden")

    abs_path = os.path.join(settings.MEDIA_ROOT, "task_pdfs", row["storage_name"])
    if not os.path.exists(abs_path):
        raise FileNotFoundError("File missing on server")

    return row, abs_path