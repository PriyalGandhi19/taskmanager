from django.http import FileResponse
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from backend.utils.decorators import require_auth
from backend.utils.responses import ok, fail

from tasks.serializers import TaskCreateSerializer, TaskUpdateSerializer
from tasks.selectors.task_selector import get_tasks_with_attachments
from tasks.services.task_service import create_task, update_task, delete_task, get_download_file
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class TaskListCreateView(APIView):
    """
    GET  /api/tasks
    POST /api/tasks (optional PDF upload using multipart/form-data)
    """
    parser_classes = [MultiPartParser, FormParser , JSONParser]

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

        try:
            update_task(actor_id=actor_id, task_id=str(task_id), data=ser.validated_data)
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