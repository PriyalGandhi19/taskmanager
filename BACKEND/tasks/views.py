# tasks/views.py

import os
import secrets

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from backend.utils.decorators import require_auth
from backend.utils.responses import ok, fail
from backend.utils.validators import validate_task_title, validate_task_status
from backend.utils.db import fetch_all, fetch_one, callproc
from backend.utils.mailer import send_task_assigned_email


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

        for r in rows:
            r["id"] = str(r["id"])
            r["owner_id"] = str(r["owner_id"])
            r["created_by"] = str(r["created_by"])

            r["can_edit_status"] = bool(r.get("can_edit_status", False))
            r["can_edit_content"] = bool(r.get("can_edit_content", False))
            r["can_delete"] = bool(r.get("can_delete", False))

        return ok(data={"tasks": rows})

    @require_auth(roles=["ADMIN", "A", "B"])
    def post(self, request):
        title = request.data.get("title") or ""
        description = request.data.get("description") or ""
        status = (request.data.get("status") or "PENDING").strip().upper()
        owner_id = request.data.get("owner_id")
        file = request.FILES.get("file")

        actor_id = request.user_ctx["id"]
        actor_role = request.user_ctx["role"]

        if actor_role == "ADMIN" and not owner_id:
            return fail("owner_id is required for admin created task", status=422)

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

        try:
            callproc("sp_create_task", [actor_id, title, description, status, owner_id])
        except Exception as ex:
            return fail("Could not create task", errors={"detail": str(ex)}, status=400)

        if actor_role == "ADMIN":
            owner_row = fetch_one("SELECT email FROM users WHERE id=%s;", [owner_id])
        else:
            owner_row = fetch_one("SELECT email FROM users WHERE id=%s;", [actor_id])

        pdf_path = None
        if file:
            temp_dir = os.path.join(settings.BASE_DIR, "media", "temp")
            os.makedirs(temp_dir, exist_ok=True)
            pdf_path = os.path.join(temp_dir, f"{secrets.token_hex(8)}_{file.name}")

            with open(pdf_path, "wb+") as dest:
                for chunk in file.chunks():
                    dest.write(chunk)

        try:
            if owner_row and owner_row.get("email"):
                send_task_assigned_email(
                    to_email=owner_row["email"],
                    task_title=title,
                    task_desc=description,
                    task_status=status,
                    pdf_path=pdf_path,
                )
        except Exception as ex:
            return ok(message=f"Task created (email failed: {str(ex)})", status=201)
        finally:
            if pdf_path:
                try:
                    os.remove(pdf_path)
                except:
                    pass

        return ok(message="Task created", status=201)


class TaskDetailView(APIView):
    """
    PUT    /api/tasks/<uuid:task_id>
    DELETE /api/tasks/<uuid:task_id>

    Rule 1 enforced in DB procedures.
    """

    @require_auth(roles=["ADMIN", "A", "B"])
    def put(self, request, task_id):
        """
        ✅ Supports:
        - Status-only update  (title/description omitted)
        - Full update         (title/description/status)
        """

        actor_id = request.user_ctx["id"]

        # 1) Ensure task exists + fetch current values (for status-only updates)
        current = fetch_one(
            "SELECT id, title, description, status FROM tasks WHERE id=%s;",
            [str(task_id)],
        )
        if not current:
            return fail("Task not found", status=404)

        # 2) Use request values if provided, else fallback to DB values
        # IMPORTANT: this prevents 422 when frontend sends only status
        incoming_title = request.data.get("title", None)
        incoming_desc = request.data.get("description", None)
        incoming_status = request.data.get("status", None)

        title = (incoming_title if incoming_title is not None else current["title"]) or ""
        description = (incoming_desc if incoming_desc is not None else current["description"]) or ""
        status = (incoming_status if incoming_status is not None else current["status"]) or ""

        title = title.strip()
        status = status.strip().upper()

        # 3) Validate (now safe because title always exists)
        errors = {}
        terr = validate_task_title(title)
        serr = validate_task_status(status)
        if terr:
            errors["title"] = terr
        if serr:
            errors["status"] = serr
        if errors:
            return fail("Validation failed", errors=errors, status=422)

        # 4) Call DB procedure (Rule 1 enforced there)
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
