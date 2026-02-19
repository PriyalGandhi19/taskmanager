import os
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView

from backend.utils.db import fetch_all, fetch_one, callproc, execute
from backend.utils.decorators import require_auth
from backend.utils.responses import ok, fail
from backend.utils.validators import validate_email, ALLOWED_CREATE_ROLES
from backend.utils.security import hash_password, sha256_hex
from backend.utils.mailer import (
    send_welcome_email,
    send_verification_email,
    send_pdf_attachment,
)


class ListUsersView(APIView):
    @require_auth(roles=["ADMIN"])
    def get(self, request):
        users = fetch_all(
            "SELECT id, email, role, is_active, created_at, updated_at "
            "FROM users ORDER BY created_at DESC;"
        )
        for u in users:
            u["id"] = str(u["id"])
        return ok(data={"users": users})


class CreateUserView(APIView):
    """
    ENTERPRISE STYLE:
    - Admin creates user with email + role only
    - System generates a random temp password hash (not shared)
    - User verifies email and then sets password themselves
    """
    @require_auth(roles=["ADMIN"])
    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        role = (request.data.get("role") or "").strip().upper()

        # 1) Validate
        errors = {}
        eerr = validate_email(email)
        if eerr:
            errors["email"] = eerr

        if role not in ALLOWED_CREATE_ROLES:
            errors["role"] = "Role must be A or B."

        if errors:
            return fail("Validation failed", errors=errors, status=422)

        # 2) Check exists
        exists = fetch_one("SELECT id FROM users WHERE email=%s;", [email])
        if exists:
            return fail("Email already exists", errors={"email": "Email already exists"}, status=409)

        # 3) Generate temp password + hash (admin never sees it)
        temp_password = secrets.token_urlsafe(10)
        ph = hash_password(temp_password)

        actor_id = request.user_ctx["id"]

        # 4) Create user (DB proc)
        try:
            callproc("sp_create_user", [actor_id, email, ph, role])
        except Exception as ex:
            return fail("Could not create user", errors={"detail": str(ex)}, status=400)

        # 5) Fetch created user id
        urow = fetch_one("SELECT id FROM users WHERE email=%s;", [email])

        # 6) Create verification token + send emails
        if urow:
            try:
                raw_token = secrets.token_urlsafe(32)
                token_sha = sha256_hex(raw_token)

                minutes = getattr(settings, "VERIFY_TOKEN_MINUTES", 60)
                expires_at = timezone.now() + timedelta(minutes=minutes)

                # invalidate old tokens
                execute(
                    "UPDATE email_verification_tokens SET used=TRUE WHERE user_id=%s AND used=FALSE;",
                    [urow["id"]],
                )

                execute(
                    "INSERT INTO email_verification_tokens(user_id, token_sha256, expires_at) "
                    "VALUES (%s, %s, %s);",
                    [urow["id"], token_sha, expires_at],
                )

                verify_link = f"{settings.FRONTEND_VERIFY_URL}?token={raw_token}"

                # welcome email (optional)
                try:
                    send_welcome_email(email)
                except:
                    pass

                # verification email
                try:
                    send_verification_email(email, verify_link, minutes)
                except:
                    pass

            except:
                pass

        return ok(message="User created")


class ListAuditLogsView(APIView):
    @require_auth(roles=["ADMIN"])
    def get(self, request):
        limit = request.GET.get("limit", "100")
        action = request.GET.get("action")
        entity = request.GET.get("entity")

        try:
            limit_int = int(limit)
            if limit_int < 1 or limit_int > 500:
                limit_int = 100
        except:
            limit_int = 100

        where = []
        params = []

        if action:
            where.append("a.action = %s")
            params.append(action.upper())

        if entity:
            where.append("a.entity = %s")
            params.append(entity.lower())

        where_sql = ("WHERE " + " AND ".join(where)) if where else ""

        logs = fetch_all(
            f"""
            SELECT
              a.id,
              a.actor_id,
              u.email AS actor_email,
              a.action,
              a.entity,
              a.entity_id,
              a.payload,
              a.created_at
            FROM audit_log a
            LEFT JOIN users u ON u.id = a.actor_id
            {where_sql}
            ORDER BY a.created_at DESC
            LIMIT %s;
            """,
            params + [limit_int],
        )

        for l in logs:
            if l["actor_id"]:
                l["actor_id"] = str(l["actor_id"])
            if l["entity_id"]:
                l["entity_id"] = str(l["entity_id"])

        return ok(data={"logs": logs})


class SendDocumentEmailView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @require_auth(roles=["ADMIN"])
    def post(self, request):
        to_email = (request.data.get("to_email") or "").strip().lower()

        eerr = validate_email(to_email)
        if eerr:
            return fail("Validation failed", errors={"to_email": eerr}, status=422)

        subject = request.data.get("subject") or "Document"
        body = request.data.get("body") or "Please find attached document."

        file = request.FILES.get("file")
        if not file:
            return fail("PDF file is required", status=422)

        if not file.name.lower().endswith(".pdf"):
            return fail("Only PDF files allowed", status=422)

        temp_dir = os.path.join(settings.BASE_DIR, "media", "temp")
        os.makedirs(temp_dir, exist_ok=True)

        temp_path = os.path.join(temp_dir, f"{secrets.token_hex(8)}_{file.name}")

        with open(temp_path, "wb+") as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        try:
            send_pdf_attachment(
                to_email=to_email,
                subject=subject,
                body=body,
                pdf_path=temp_path
            )
        except Exception as ex:
            print("SEND EMAIL ERROR:", repr(ex))
            return fail("Email failed", errors={"detail": str(ex)}, status=400)
        finally:
            try:
                os.remove(temp_path)
            except:
                pass

        return ok(message="PDF sent successfully via email")
