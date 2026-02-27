from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import HttpResponse
import csv

from backend.utils.decorators import require_auth
from backend.utils.responses import ok, fail

from adminapp.serializers import (
    CreateUserSerializer,
    AuditLogQuerySerializer,
    SendDocumentSerializer,
)

from adminapp.selectors.admin_selector import get_users, get_audit_logs
from adminapp.services.user_service import create_user
from adminapp.services.document_service import send_document

from adminapp.repositories.auth_activity_repo import (
    list_auth_activity,
    count_auth_activity,
)

class ListUsersView(APIView):
    @require_auth(roles=["ADMIN"])
    def get(self, request):
        users = get_users()
        return ok(data={"users": users})


class CreateUserView(APIView):
    @require_auth(roles=["ADMIN"])
    def post(self, request):
        ser = CreateUserSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        actor_id = request.user_ctx["id"]

        try:
            create_user(actor_id=actor_id, email=ser.validated_data["email"], role=ser.validated_data["role"])
        except FileExistsError:
            return fail("Email already exists", errors={"email": "Email already exists"}, status=409)
        except Exception as ex:
            return fail("Could not create user", errors={"detail": str(ex)}, status=400)

        return ok(message="User created")


class ListAuditLogsView(APIView):
    @require_auth(roles=["ADMIN"])
    def get(self, request):
        ser = AuditLogQuerySerializer(data=request.GET)
        ser.is_valid(raise_exception=True)

        limit = ser.validated_data["limit"]
        action = ser.validated_data.get("action") or None
        entity = ser.validated_data.get("entity") or None

        logs = get_audit_logs(limit=limit, action=action, entity=entity)
        return ok(data={"logs": logs})


class SendDocumentEmailView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @require_auth(roles=["ADMIN"])
    def post(self, request):
        ser = SendDocumentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        file = request.FILES.get("file")
        try:
            send_document(
                to_email=ser.validated_data["to_email"],
                subject=ser.validated_data["subject"] or "Document",
                body=ser.validated_data["body"] or "Please find attached document.",
                uploaded_file=file,
            )
        except ValueError as ex:
            return fail("Validation failed", errors={"detail": str(ex)}, status=422)
        except Exception as ex:
            return fail("Email failed", errors={"detail": str(ex)}, status=400)

        return ok(message="PDF sent successfully via email")
    

class AdminAuthActivityView(APIView):
    @require_auth(roles=["ADMIN"])
    def get(self, request):
        limit = int(request.GET.get("limit", 100))
        page = int(request.GET.get("page", 1))

        email = (request.GET.get("email") or "").strip().lower() or None
        event = (request.GET.get("event") or "").strip() or None
        success = (request.GET.get("success") or "").strip() or None
        date_from = (request.GET.get("from") or "").strip() or None
        date_to = (request.GET.get("to") or "").strip() or None

        offset = (page - 1) * limit

        items = list_auth_activity(
            email=email,
            event=event,
            success=success,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset,
        )

        total = count_auth_activity(
            email=email,
            event=event,
            success=success,
            date_from=date_from,
            date_to=date_to,
        )

        return ok(data={"items": items, "total": total})


class AdminAuthActivityExportView(APIView):
    @require_auth(roles=["ADMIN"])
    def get(self, request):
        email = (request.GET.get("email") or "").strip().lower() or None
        event = (request.GET.get("event") or "").strip() or None
        success = (request.GET.get("success") or "").strip() or None
        date_from = (request.GET.get("from") or "").strip() or None
        date_to = (request.GET.get("to") or "").strip() or None

        rows = list_auth_activity(
            email=email,
            event=event,
            success=success,
            date_from=date_from,
            date_to=date_to,
            limit=50000,
            offset=0,
        )

        resp = HttpResponse(content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="auth_activity.csv"'

        writer = csv.writer(resp)
        writer.writerow(["created_at", "email", "event", "success", "ip", "user_agent"])

        for r in rows:
            writer.writerow([
                r.get("created_at"),
                r.get("email"),
                r.get("event"),
                r.get("success"),
                r.get("ip"),
                (r.get("user_agent") or "")[:200],
            ])

        return resp