from rest_framework.views import APIView
from rest_framework.parsers import JSONParser
from urllib3 import request

from backend.utils.responses import ok, fail
from django.conf import settings

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from backend.utils.db import fetch_one, execute
from backend.utils.responses import ok, fail
from backend.utils.jwt_utils import make_access_token, make_refresh_token, refresh_expiry
from backend.utils.security import sha256_hex

from authapp.serializers import (
    LoginSerializer, RefreshSerializer, LogoutSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer,
    VerifyEmailSerializer, SetPasswordSerializer,
)
from authapp.services.auth_service import (
    login, refresh_access_token, logout,
    forgot_password, reset_password,
    verify_email, set_password,
)
from authapp.repositories.auth_activity_repo import insert_auth_activity
from backend.utils.decorators import require_auth

# ✅ ---- HELPER FUNCTIONS HERE ----

def _get_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")

def _get_ua(request):
    return request.META.get("HTTP_USER_AGENT")


class LoginView(APIView):
    parser_classes = [JSONParser]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            data = login(ser.validated_data["email"], ser.validated_data["password"])

            insert_auth_activity(
                user_id=data["user"]["id"],
                email=data["user"]["email"],
                event="LOGIN",
                ip=_get_ip(request),
                user_agent=_get_ua(request),
                success=True,
            )

            return ok(data=data, message="Logged in")

        except PermissionError as ex:
            msg = str(ex)

            # ✅ Only invalid creds => FAILED_LOGIN log
            if "invalid email or password" in msg.lower():
                insert_auth_activity(
                    user_id=None,
                    email=ser.validated_data["email"],
                    event="FAILED_LOGIN",
                    ip=_get_ip(request),
                    user_agent=_get_ua(request),
                    success=False,
                )

            if "verify your email" in msg.lower() or "set your password" in msg.lower():
                return fail(msg, status=403)

            return fail(msg, status=401)

        except Exception as ex:
            return fail("Server error", errors={"detail": str(ex)}, status=500)

class GoogleLoginView(APIView):
    def post(self, request):
        try:
            token = (request.data.get("id_token") or "").strip()
            if not token:
                return fail("id_token is required", status=422)

            info = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )

            email = (info.get("email") or "").lower().strip()
            if not email:
                return fail("Google token has no email", status=400)

            row = fetch_one(
                "SELECT id, email, role, is_active FROM users WHERE email=%s;",
                [email],
            )

            if not row:
                execute(
                    "INSERT INTO users(email, password_hash, role, email_verified, must_set_password) "
                    "VALUES (%s, %s, 'A', TRUE, FALSE) RETURNING id;",
                    [email, "GOOGLE_AUTH_NO_PASSWORD"],
                )
                row = fetch_one(
                    "SELECT id, email, role, is_active FROM users WHERE email=%s;",
                    [email],
                )

            if not row or not row["is_active"]:
                return fail("User inactive", status=403)

            access = make_access_token(str(row["id"]), row["role"], row["email"])
            refresh = make_refresh_token()
            refresh_sha = sha256_hex(refresh)
            exp = refresh_expiry()

            execute(
                "INSERT INTO refresh_tokens(user_id, token_sha256, expires_at) VALUES (%s, %s, %s);",
                [row["id"], refresh_sha, exp],
            )

            # ✅ log google login
            insert_auth_activity(
                user_id=str(row["id"]),
                email=row["email"],
                event="LOGIN",
                ip=_get_ip(request),
                user_agent=_get_ua(request),
                success=True,
            )

            return ok(
                message="Google login success",
                data={
                    "access_token": access,
                    "refresh_token": refresh,
                    "user": {"id": str(row["id"]), "email": row["email"], "role": row["role"]},
                },
            )

        except ValueError as e:
            return fail("Invalid Google token", errors={"detail": str(e)}, status=401)
        except Exception as ex:
            return fail("Server error", errors={"detail": str(ex)}, status=500)



        
class RefreshView(APIView):
    parser_classes = [JSONParser]

    def post(self, request):
        ser = RefreshSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            data = refresh_access_token(ser.validated_data["refresh_token"])
            return ok(data=data, message="Token refreshed")
        except PermissionError as ex:
            return fail(str(ex), status=401)


class LogoutView(APIView):
    parser_classes = [JSONParser]

    @require_auth()   # ✅ now we know user_id/email
    def post(self, request):
        ser = LogoutSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        # log first
        u = request.user_ctx
        insert_auth_activity(
            user_id=u["id"],
            email=u["email"],
            event="LOGOUT",
            ip=_get_ip(request),
            user_agent=_get_ua(request),
            success=True,
        )

        logout(ser.validated_data["refresh_token"])
        return ok(message="Logged out")


class ForgotPasswordView(APIView):
    parser_classes = [JSONParser]

    def post(self, request):
        ser = ForgotPasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        # always OK message (security)
        forgot_password(ser.validated_data["email"])
        return ok(message="If the email exists, reset link sent.")


class ResetPasswordView(APIView):
    parser_classes = [JSONParser]

    def post(self, request):
        ser = ResetPasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            reset_password(ser.validated_data["token"], ser.validated_data["new_password"])
            return ok(message="Password reset successful")
        except PermissionError as ex:
            return fail(str(ex), status=400)


class VerifyEmailView(APIView):
    parser_classes = [JSONParser]

    def post(self, request):
        ser = VerifyEmailSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            verify_email(ser.validated_data["token"])
            return ok(message="Email verified successfully. Check your email to set password.")
        except PermissionError as ex:
            return fail(str(ex), status=400)


class SetPasswordView(APIView):
    parser_classes = [JSONParser]

    def post(self, request):
        ser = SetPasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            set_password(ser.validated_data["token"], ser.validated_data["new_password"])
            return ok(message="Password set successfully. You can login now.")
        except PermissionError as ex:
            return fail(str(ex), status=400)
        