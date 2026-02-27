from django.http import FileResponse
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from backend.utils.decorators import require_auth
from backend.utils.responses import ok, fail

from tasks.serializers import (
    TaskCreateSerializer,
    TaskUpdateSerializer,
    CommentCreateSerializer,
    CommentUpdateSerializer,
    NotificationListSerializer,
)
from tasks.selectors.task_selector import get_tasks_with_attachments
from tasks.selectors.comment_selector import get_comments
from tasks.selectors.notification_selector import get_notifications
from tasks.services.task_service import create_task, update_task, delete_task, get_download_file
from tasks.services.comment_service import add_comment, edit_comment
from tasks.services.notification_service import read_notification, read_all
from tasks.repositories.task_repo import get_task_summary_for_user


class TaskListCreateView(APIView):
    """
    GET  /api/tasks
    POST /api/tasks (optional PDF upload using multipart/form-data)
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @require_auth(roles=["ADMIN", "A", "B"])
    def get(self, request):
        actor_id = request.user_ctx["id"]
        tasks = get_tasks_with_attachments(actor_id)
        return ok(data={"tasks": tasks})

    @require_auth(roles=["ADMIN", "A", "B"])
    def post(self, request):
        ser = TaskCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        actor_id = request.user_ctx["id"]
        actor_role = request.user_ctx["role"]
        uploaded_file = request.FILES.get("file")

        try:
            result = create_task(
                actor_id=actor_id,
                actor_role=actor_role,
                data=ser.validated_data,
                uploaded_file=uploaded_file,
            )
        except PermissionError as e:
            return fail(str(e), status=422)
        except ValueError as e:
            return fail(str(e), status=422)
        except Exception as e:
            return fail("Could not create task", errors={"detail": str(e)}, status=400)

        return ok(message="Task created", status=201, data=result)


class TaskSummaryView(APIView):
    """
    GET /api/tasks/summary
    """
    @require_auth(roles=["ADMIN", "A", "B"])
    def get(self, request):
        actor_id = request.user_ctx["id"]
        summary = get_task_summary_for_user(actor_id)
        return ok(data={"summary": summary})


class TaskDetailView(APIView):
    """
    PUT    /api/tasks/<uuid:task_id>
    DELETE /api/tasks/<uuid:task_id>
    """

    @require_auth(roles=["ADMIN", "A", "B"])
    def put(self, request, task_id):
        ser = TaskUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        actor_id = request.user_ctx["id"]
        actor_role = request.user_ctx["role"]

        try:
            update_task(actor_id=actor_id, actor_role=actor_role, task_id=str(task_id), data=ser.validated_data)
        except LookupError:
            return fail("Task not found", status=404)
        except PermissionError:
            return fail("Forbidden", status=403)
        except ValueError as e:
            return fail("Could not update task", errors={"detail": str(e)}, status=400)

        return ok(message="Task updated")

    @require_auth(roles=["ADMIN", "A", "B"])
    def delete(self, request, task_id):
        actor_id = request.user_ctx["id"]

        try:
            delete_task(actor_id=actor_id, task_id=str(task_id))
        except LookupError:
            return fail("Task not found", status=404)
        except PermissionError:
            return fail("Forbidden", status=403)
        except ValueError as e:
            return fail("Could not delete task", errors={"detail": str(e)}, status=400)

        return ok(message="Task deleted")


class TaskCommentsView(APIView):
    """
    GET  /api/tasks/<uuid:task_id>/comments
    POST /api/tasks/<uuid:task_id>/comments
    """
    @require_auth(roles=["ADMIN", "A", "B"])
    def get(self, request, task_id):
        # Permission is enforced inside comment_service on POST,
        # but for GET we should enforce same rule: Admin OR owner only.
        actor_id = request.user_ctx["id"]
        actor_role = request.user_ctx["role"]

        try:
            # reuse service permission by trying a “safe access”
            # simplest: add a comment_service helper would be extra; keep minimal:
            # We'll check access by attempting add_comment is wrong; so do small check here:
            from tasks.repositories.task_repo import get_task_acl
            acl = get_task_acl(str(task_id))
            if not acl:
                return fail("Task not found", status=404)
            if actor_role != "ADMIN" and str(acl["owner_id"]) != str(actor_id):
                return fail("Forbidden", status=403)

            rows = get_comments(str(task_id))
            return ok(data={"comments": rows})
        except Exception as e:
            return fail("Failed", errors={"detail": str(e)}, status=400)

    @require_auth(roles=["ADMIN", "A", "B"])
    def post(self, request, task_id):
        ser = CommentCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        actor_id = request.user_ctx["id"]
        actor_role = request.user_ctx["role"]

        try:
            result = add_comment(
                actor_id=actor_id,
                actor_role=actor_role,
                task_id=str(task_id),
                content=ser.validated_data["content"],
            )
        except LookupError:
            return fail("Task not found", status=404)
        except PermissionError:
            return fail("Forbidden", status=403)
        except ValueError as e:
            return fail(str(e), status=422)
        except Exception as e:
            return fail("Could not add comment", errors={"detail": str(e)}, status=400)

        return ok(message="Comment added", status=201, data=result)


class CommentUpdateView(APIView):
    """
    PATCH /api/comments/<uuid:comment_id>
    """
    @require_auth(roles=["ADMIN", "A", "B"])
    def patch(self, request, comment_id):
        ser = CommentUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        actor_id = request.user_ctx["id"]
        actor_role = request.user_ctx["role"]

        try:
            edit_comment(
                actor_id=actor_id,
                actor_role=actor_role,
                comment_id=str(comment_id),
                content=ser.validated_data["content"],
            )
        except LookupError:
            return fail("Comment not found", status=404)
        except PermissionError:
            return fail("Forbidden", status=403)
        except Exception as e:
            return fail("Could not update comment", errors={"detail": str(e)}, status=400)

        return ok(message="Comment updated")


class NotificationListView(APIView):
    """
    GET /api/notifications?unread_only=true&limit=20
    """
    @require_auth(roles=["ADMIN", "A", "B"])
    def get(self, request):
        ser = NotificationListSerializer(data=request.query_params)
        ser.is_valid(raise_exception=True)

        actor_id = request.user_ctx["id"]
        unread_only = ser.validated_data.get("unread_only", False)
        limit = ser.validated_data.get("limit", 20)

        rows = get_notifications(user_id=actor_id, unread_only=unread_only, limit=limit)
        return ok(data={"notifications": rows})


class NotificationReadView(APIView):
    """
    PATCH /api/notifications/<uuid:notif_id>/read
    """
    @require_auth(roles=["ADMIN", "A", "B"])
    def patch(self, request, notif_id):
        actor_id = request.user_ctx["id"]
        try:
            read_notification(user_id=actor_id, notif_id=str(notif_id))
        except Exception as e:
            return fail("Could not mark read", errors={"detail": str(e)}, status=400)
        return ok(message="Notification marked read")


class NotificationReadAllView(APIView):
    """
    PATCH /api/notifications/read-all
    """
    @require_auth(roles=["ADMIN", "A", "B"])
    def patch(self, request):
        actor_id = request.user_ctx["id"]
        try:
            read_all(user_id=actor_id)
        except Exception as e:
            return fail("Could not mark all read", errors={"detail": str(e)}, status=400)
        return ok(message="All notifications marked read")


class TaskAttachmentDownloadView(APIView):
    @require_auth(roles=["ADMIN", "A", "B"])
    def get(self, request, attachment_id):
        actor_id = request.user_ctx["id"]
        actor_role = request.user_ctx["role"]

        try:
            row, abs_path = get_download_file(
                attachment_id=str(attachment_id),
                actor_id=actor_id,
                actor_role=actor_role,
            )
        except LookupError:
            return fail("Attachment not found", status=404)
        except PermissionError:
            return fail("Forbidden", status=403)
        except FileNotFoundError:
            return fail("File missing on server", status=404)

        resp = FileResponse(open(abs_path, "rb"), content_type=row["content_type"])
        resp["Content-Disposition"] = f'attachment; filename="{row["original_name"]}"'
        return resp