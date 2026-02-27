import os
from django.conf import settings

from backend.utils.files import save_task_pdf
from backend.utils.mailer import send_task_assigned_email

from tasks.repositories.task_repo import (
    create_task_returning_id,
    get_user_email,
    get_task_basic,
    get_task_acl,
    update_task as repo_update_task,
    delete_task as repo_delete_task,
)
from tasks.repositories.attachment_repo import insert_attachment, get_attachment_with_owner
from tasks.repositories.notification_repo import create_notification

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

    due_date = data.get("due_date")  # datetime or None
    priority = data.get("priority", "MEDIUM")

    if actor_role == "ADMIN" and not owner_id:
        raise PermissionError("owner_id is required for admin created task")

    _validate_pdf(uploaded_file)

    row = create_task_returning_id(
        actor_id=actor_id,
        title=title,
        description=description,
        status=status,
        owner_id=owner_id,
        due_date=due_date,
        priority=priority,
    )
    task_id = str(row["id"])

    # determine final owner (for non-admin it is actor)
    final_owner_id = owner_id if actor_role == "ADMIN" else actor_id

    # email + notification to owner
    owner_row = get_user_email(final_owner_id)

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

    # 🔔 notification
    try:
        create_notification(
            recipient_id=final_owner_id,
            task_id=task_id,
            ntype="ASSIGNED",
            message=f"New task assigned: {title}",
        )
    except Exception:
        pass

    # email (don’t fail request if email fails)
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

def update_task(actor_id: str, actor_role: str, task_id: str, data: dict) -> None:
    current = get_task_basic(task_id)
    if not current:
        raise LookupError("Task not found")

    # defaults
    title = data.get("title", current["title"])
    description = data.get("description", current["description"])
    status = data.get("status", current["status"])
    due_date = data.get("due_date", current.get("due_date"))
    priority = data.get("priority", current.get("priority", "MEDIUM"))

    status = (status or "").strip().upper()

    # before update (for notification decisions)
    before_status = (current.get("status") or "").strip().upper()
    acl = get_task_acl(task_id)
    if not acl:
        raise LookupError("Task not found")
    owner_id = str(acl["owner_id"])

    try:
        repo_update_task(actor_id, task_id, title, description, status, due_date, priority)
    except Exception as ex:
        msg = str(ex)
        if "Forbidden" in msg:
            raise PermissionError("Forbidden")
        if "Task not found" in msg:
            raise LookupError("Task not found")
        raise ValueError(msg)

    # 🔔 status change notification to owner (if changed)
    if status and status != before_status:
        try:
            create_notification(
                recipient_id=owner_id,
                task_id=task_id,
                ntype="STATUS",
                message=f"Task status changed: {before_status} → {status}",
            )
        except Exception:
            pass

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