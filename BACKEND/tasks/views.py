# tasks/views.py
import os

from django.conf import settings
from django.http import FileResponse
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from backend.utils.decorators import require_auth
from backend.utils.responses import ok, fail
from backend.utils.validators import validate_task_title, validate_task_status
from backend.utils.db import fetch_all, fetch_one, execute, callproc
from backend.utils.mailer import send_task_assigned_email
from backend.utils.files import save_task_pdf
from django.http import FileResponse


class TaskListCreateView(APIView):
    """
    GET  /api/tasks
    POST /api/tasks  (supports optional PDF upload using multipart/form-data)
    """
    parser_classes = [MultiPartParser, FormParser]

    @require_auth(roles=["ADMIN", "A", "B"])
    def get(self, request):
        actor_id = request.user_ctx["id"]

        rows = fetch_all("SELECT * FROM fn_get_tasks_for_user(%s);", [actor_id])

        # OPTIONAL: attach attachments list per task
        # Get all task_ids first
        task_ids = [str(r["id"]) for r in rows]

        attachments = []
        if task_ids:
            attachments = fetch_all(
                """
                SELECT id, task_id, original_name, size_bytes, content_type, created_at
                FROM task_attachments
                WHERE task_id = ANY(%s::uuid[])
                ORDER BY created_at DESC;
                """,
                [task_ids],
            )

        # group attachments by task_id
        att_map = {}
        for a in attachments:
            a["id"] = str(a["id"])
            a["task_id"] = str(a["task_id"])
            att_map.setdefault(a["task_id"], []).append({
                "id": a["id"],
                "original_name": a["original_name"],
                "size_bytes": int(a["size_bytes"]),
                "content_type": a["content_type"],
                "download_url": f"/api/attachments/{a['id']}/download",
                "created_at": a["created_at"],
            })

        for r in rows:
            r["id"] = str(r["id"])
            r["owner_id"] = str(r["owner_id"])
            r["created_by"] = str(r["created_by"])

            r["can_edit_status"] = bool(r.get("can_edit_status", False))
            r["can_edit_content"] = bool(r.get("can_edit_content", False))
            r["can_delete"] = bool(r.get("can_delete", False))

            r["attachments"] = att_map.get(r["id"], [])

        return ok(data={"tasks": rows})

    @require_auth(roles=["ADMIN", "A", "B"])
    def post(self, request):
        title = request.data.get("title") or ""
        description = request.data.get("description") or ""
        status = (request.data.get("status") or "PENDING").strip().upper()
        owner_id = request.data.get("owner_id")  # only ADMIN can set
        file = request.FILES.get("file")

        actor_id = request.user_ctx["id"]
        actor_role = request.user_ctx["role"]

        if actor_role == "ADMIN" and not owner_id:
            return fail("owner_id is required for admin created task", status=422)

        # Validate
        errors = {}
        terr = validate_task_title(title)
        serr = validate_task_status(status)
        if terr:
            errors["title"] = terr
        if serr:
            errors["status"] = serr
        if errors:
            return fail("Validation failed", errors=errors, status=422)

        if file:
            if not file.name.lower().endswith(".pdf"):
                return fail("Only PDF files allowed", status=422)
            if file.size > 10 * 1024 * 1024:
                return fail("PDF too large (max 10MB).", status=422)

        # ✅ Create task and get ID
        try:
            row = fetch_one(
                "SELECT fn_create_task(%s,%s,%s,%s,%s) AS id;",
                [actor_id, title, description, status, owner_id],
            )
            task_id = str(row["id"])
        except Exception as ex:
            return fail("Could not create task", errors={"detail": str(ex)}, status=400)

        # Determine owner's email (for notification)
        if actor_role == "ADMIN":
            owner_row = fetch_one("SELECT email FROM users WHERE id=%s;", [owner_id])
        else:
            owner_row = fetch_one("SELECT email FROM users WHERE id=%s;", [actor_id])

        # ✅ Save PDF permanently + insert attachment row
        saved_pdf_path = None
        attachment_id = None

        if file:
            try:
                saved_pdf_path, storage_name, size_bytes = save_task_pdf(file)

                att = fetch_one(
                    """
                    INSERT INTO task_attachments(task_id, original_name, storage_name, content_type, size_bytes, uploaded_by)
                    VALUES (%s,%s,%s,%s,%s,%s)
                    RETURNING id;
                    """,
                    [
                        task_id,
                        file.name,
                        storage_name,
                        getattr(file, "content_type", "application/pdf"),
                        size_bytes,
                        actor_id,
                    ],
                )
                attachment_id = str(att["id"])
            except Exception as ex:
                # task created but attachment failed
                return ok(message=f"Task created (attachment failed: {str(ex)})", status=201)

        # ✅ Email (optional attachment)
        try:
            if owner_row and owner_row.get("email"):
                send_task_assigned_email(
                    to_email=owner_row["email"],
                    task_title=title,
                    task_desc=description,
                    task_status=status,
                    pdf_path=saved_pdf_path,  # attach the saved file
                )
        except Exception as ex:
            return ok(message=f"Task created (email failed: {str(ex)})", status=201)

        return ok(
            message="Task created",
            status=201,
            data={
                "task_id": task_id,
                "attachment_id": attachment_id,
                "attachment_download_url": (
                    f"/api/attachments/{attachment_id}/download" if attachment_id else None
                ),
            },
        )


class TaskDetailView(APIView):
    """
    PUT    /api/tasks/<uuid:task_id>
    DELETE /api/tasks/<uuid:task_id>
    Rule 1 enforced in DB procedures.
    """

    @require_auth(roles=["ADMIN", "A", "B"])
    def put(self, request, task_id):
        actor_id = request.user_ctx["id"]

        current = fetch_one(
            "SELECT id, title, description, status FROM tasks WHERE id=%s;",
            [str(task_id)],
        )
        if not current:
            return fail("Task not found", status=404)

        incoming_title = request.data.get("title", None)
        incoming_desc = request.data.get("description", None)
        incoming_status = request.data.get("status", None)

        title = (incoming_title if incoming_title is not None else current["title"]) or ""
        description = (incoming_desc if incoming_desc is not None else current["description"]) or ""
        status = (incoming_status if incoming_status is not None else current["status"]) or ""

        title = title.strip()
        status = status.strip().upper()

        errors = {}
        terr = validate_task_title(title)
        serr = validate_task_status(status)
        if terr:
            errors["title"] = terr
        if serr:
            errors["status"] = serr
        if errors:
            return fail("Validation failed", errors=errors, status=422)

        try:
            callproc("sp_update_task", [actor_id, str(task_id), title, description, status])
        except Exception as ex:
            msg = str(ex)
            if "Forbidden" in msg:
                return fail("Forbidden", status=403)
            if "Task not found" in msg:
                return fail("Task not found", status=404)
            return fail("Could not update task", errors={"detail": msg}, status=400)

        return ok(message="Task updated")

    @require_auth(roles=["ADMIN", "A", "B"])
    def delete(self, request, task_id):
        actor_id = request.user_ctx["id"]

        exists = fetch_one("SELECT id FROM tasks WHERE id=%s;", [str(task_id)])
        if not exists:
            return fail("Task not found", status=404)

        try:
            callproc("sp_delete_task", [actor_id, str(task_id)])
        except Exception as ex:
            msg = str(ex)
            if "Forbidden" in msg:
                return fail("Forbidden", status=403)
            if "Task not found" in msg:
                return fail("Task not found", status=404)
            return fail("Could not delete task", errors={"detail": msg}, status=400)

        return ok(message="Task deleted")


class TaskAttachmentDownloadView(APIView):
    @require_auth(roles=["ADMIN", "A", "B"])
    def get(self, request, attachment_id):
        actor_id = request.user_ctx["id"]
        actor_role = request.user_ctx["role"]

        row = fetch_one(
            """
            SELECT
              a.id, a.original_name, a.storage_name, a.content_type,
              t.owner_id
            FROM task_attachments a
            JOIN tasks t ON t.id = a.task_id
            WHERE a.id = %s
            LIMIT 1;
            """,
            [str(attachment_id)],
        )

        if not row:
            return fail("Attachment not found", status=404)

        if actor_role != "ADMIN" and str(row["owner_id"]) != str(actor_id):
            return fail("Forbidden", status=403)

        abs_path = os.path.join(settings.MEDIA_ROOT, "task_pdfs", row["storage_name"])
        if not os.path.exists(abs_path):
            return fail("File missing on server", status=404)

        resp = FileResponse(open(abs_path, "rb"), content_type=row["content_type"])
        resp["Content-Disposition"] = f'attachment; filename="{row["original_name"]}"'
        return resp
