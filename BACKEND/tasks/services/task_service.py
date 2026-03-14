import os
from django.conf import settings

from backend.utils.files import save_task_attachment
from backend.utils.mailer import send_task_assigned_email

from tasks.repositories.task_repo import (
    create_task_returning_id,
    get_user_email,
    get_task_basic,
    get_task_acl,
    update_task as repo_update_task,
    delete_task as repo_delete_task,
    get_admin_ids,
    should_notify_inapp,
    get_admin_ids_inapp_enabled,
)

from tasks.repositories.attachment_repo import insert_attachment, get_attachment_with_owner
from tasks.repositories.notification_repo import create_notification

MAX_FILE_BYTES = 10 * 1024 * 1024

ALLOWED_EXTS = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # docx
    "image/png",
    "image/jpeg",
}

# def _validate_pdf(uploaded_file):
#     if not uploaded_file:
#         return
#     if not uploaded_file.name.lower().endswith(".pdf"):
#         raise ValueError("Only PDF files allowed")
#     if uploaded_file.size > MAX_PDF_BYTES:
#         raise ValueError("PDF too large (max 10MB).")

def _validate_attachment(uploaded_file):
    if not uploaded_file:
        return

    name = (getattr(uploaded_file, "name", "") or "").strip()
    ext = os.path.splitext(name)[1].lower()

    if ext not in ALLOWED_EXTS:
        raise ValueError("Allowed files: PDF, DOCX, PNG, JPG/JPEG, WEBP")

    ctype = getattr(uploaded_file, "content_type", "") or ""
    # allow empty content_type (some browsers) but validate if present
    if ctype and ctype not in ALLOWED_CONTENT_TYPES:
        raise ValueError("Unsupported file type")

    if uploaded_file.size > MAX_FILE_BYTES:
        raise ValueError("File too large (max 10MB).")
    

def create_task(actor_id: str, actor_role: str, data: dict, uploaded_files=None) -> dict:
    """
    uploaded_files: list of files OR None
    """
    title = data["title"]
    description = data.get("description", "")
    status = data.get("status", "PENDING")
    owner_id = str(data.get("owner_id")) if data.get("owner_id") else None

    due_date = data.get("due_date")
    priority = data.get("priority", "MEDIUM")

    if actor_role == "ADMIN" and not owner_id:
        raise PermissionError("owner_id is required for admin created task")

    uploaded_files = uploaded_files or []
    for f in uploaded_files:
        _validate_attachment(f)

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
    owner_row = get_user_email(final_owner_id)

    attachment_ids: list[str] = []
    saved_for_email: list[dict] = []  # [{"path":..., "name":..., "content_type":...}]

    # ✅ Save each file + insert DB record
    for f in uploaded_files:
        saved_path, storage_name, size_bytes = save_task_attachment(
            f,
            preferred_name=f.name,  # ✅ filename based on task title
        )

        att = insert_attachment(
            task_id=task_id,
            original_name=f.name,
            storage_name=storage_name,
            content_type=getattr(f, "content_type", "application/octet-stream"),
            size_bytes=size_bytes,
            uploaded_by=actor_id,
        )
        attachment_ids.append(str(att["id"]))

        saved_for_email.append(
            {
                "path": saved_path,
                "name": f.name,
                "content_type": getattr(f, "content_type", "application/octet-stream"),
                "size_bytes": int(size_bytes),
            }
        )

    # 🔔 notification
    # try:
    #     create_notification(
    #         recipient_id=final_owner_id,
    #         task_id=task_id,
    #         ntype="ASSIGNED",
    #         message=f"New task assigned: {title}",
    #         actor_id=actor_id,
    #     )
    # except Exception:
        # pass
        
            # 🔔 notification only if recipient enabled in-app notifications
    try:
        if should_notify_inapp(final_owner_id):
            create_notification(
                recipient_id=final_owner_id,
                task_id=task_id,
                ntype="ASSIGNED",
                message=f"New task assigned: {title}",
                actor_id=actor_id,
            )
    except Exception:
        pass
    

    # ✅ Email with attachments (protect size)
    if owner_row and owner_row.get("email"):
        try:
            # Gmail limit ~25MB total. Keep safe at 20MB.
            MAX_EMAIL_ATTACH_BYTES = 20 * 1024 * 1024

            total = 0
            limited = []
            for a in saved_for_email:
                sz = int(a.get("size_bytes") or 0)
                if total + sz > MAX_EMAIL_ATTACH_BYTES:
                    break
                limited.append(a)
                total += sz

            send_task_assigned_email(
                to_email=owner_row["email"],
                task_title=title,
                task_desc=description,
                task_status=status,
                pdf_path=None,              # not needed anymore
                attachments=limited,        # ✅ all attachments (size-limited)
            )
        except Exception:
            pass

    return {
        "task_id": task_id,
        "attachment_ids": attachment_ids,
    }


def update_task(actor_id: str, actor_role: str, task_id: str, data: dict) -> None:
    current = get_task_basic(task_id)
    if not current:
        raise LookupError("Task not found")

    title = data.get("title", current["title"])
    description = data.get("description", current["description"])
    status = data.get("status", current["status"])
    due_date = data.get("due_date", current.get("due_date"))
    priority = data.get("priority", current.get("priority", "MEDIUM"))

    status = (status or "").strip().upper()
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

    # 🔔 notifications after successful update
    if status and status != before_status:
        try:
            if actor_role == "ADMIN":
                # Admin changed -> notify owner only if enabled
                if owner_id != str(actor_id) and should_notify_inapp(owner_id):
                    create_notification(
                        recipient_id=owner_id,
                        task_id=task_id,
                        ntype="STATUS",
                        message=f"Task status changed: {before_status} -> {status}",
                        actor_id=actor_id,
                    )
            else:
                # User changed -> notify only admins who enabled in-app notifications
                admin_ids = get_admin_ids_inapp_enabled()
                for aid in admin_ids:
                    if aid == str(actor_id):
                        continue
                    create_notification(
                        recipient_id=aid,
                        task_id=task_id,
                        ntype="STATUS",
                        message=f"User changed task status: {before_status} -> {status}",
                        actor_id=actor_id,
                    )
        except Exception:
            pass


# def update_task(actor_id: str, actor_role: str, task_id: str, data: dict) -> None:
#     current = get_task_basic(task_id)
#     if not current:
#         raise LookupError("Task not found")

#     # defaults
#     title = data.get("title", current["title"])
#     description = data.get("description", current["description"])
#     status = data.get("status", current["status"])
#     due_date = data.get("due_date", current.get("due_date"))
#     priority = data.get("priority", current.get("priority", "MEDIUM"))

#     status = (status or "").strip().upper()

#     before_status = (current.get("status") or "").strip().upper()

#     acl = get_task_acl(task_id)
#     if not acl:
#         raise LookupError("Task not found")

#     owner_id = str(acl["owner_id"])

#     # ✅ update DB first
#     try:
#         repo_update_task(actor_id, task_id, title, description, status, due_date, priority)
#     except Exception as ex:
#         msg = str(ex)
#         if "Forbidden" in msg:
#             raise PermissionError("Forbidden")
#         if "Task not found" in msg:
#             raise LookupError("Task not found")
#         raise ValueError(msg)

    # ✅ NOW notifications (indentation fixed)
    # if status and status != before_status:
    #     try:
    #         if actor_role == "ADMIN":
    #             # Admin changed -> notify owner
    #             if owner_id != str(actor_id):
    #                 create_notification(
    #                     recipient_id=owner_id,
    #                     task_id=task_id,
    #                     ntype="STATUS",
    #                     message=f"Task status changed: {before_status} -> {status}",
    #                     actor_id=actor_id,
    #                 )
    #         else:
    #             # User changed -> notify all admins
    #             admin_ids = get_admin_ids()
    #             for aid in admin_ids:
    #                 if aid == str(actor_id):
    #                     continue
    #                 create_notification(
    #                     recipient_id=aid,
    #                     task_id=task_id,
    #                     ntype="STATUS",
    #                     message=f"User changed task status: {before_status} -> {status}",
    #                     actor_id=actor_id,
    #                 )
    #     except Exception:
    #         pass
    


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

    abs_path = os.path.join(settings.MEDIA_ROOT, "task_attachments", row["storage_name"])
    if not os.path.exists(abs_path):
        raise FileNotFoundError("File missing on server")

    return row, abs_path
