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
    VerifyEmailSerializer, SetPasswordSerializer, ReauthSerializer
)
from authapp.services.auth_service import (
    login, refresh_access_token, logout,
    forgot_password, reset_password,
    verify_email, set_password, reauthenticate
)
from authapp.repositories.auth_activity_repo import insert_auth_activity
from backend.utils.decorators import require_auth

from authapp.repositories.session_repo import create_session , revoke_all_sessions_for_user
from authapp.repositories.session_repo import revoke_session

from backend.utils.security import verify_password, hash_password
from authapp.serializers import ProfileUpdateSerializer, ChangeMyPasswordSerializer

from tasks.repositories.notification_repo import create_notification
from django.core.mail import send_mail

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

            # return ok(data=data, message="Logged in")
            revoke_all_sessions_for_user(data["user"]["id"])
            sid = create_session(data["user"]["id"])

            resp = ok(data=data, message="Logged in")
            resp.set_cookie(
                "tm_session",
                sid,
                httponly=True,
                samesite="None",
                secure=True,     # prod HTTPS -> True
                max_age=900,      # 15 min
            )
            return resp

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

# class GoogleLoginView(APIView):
#     def post(self, request):
#         try:
#             token = (request.data.get("id_token") or "").strip()
#             if not token:
#                 return fail("id_token is required", status=422)

#             info = id_token.verify_oauth2_token(
#                 token,
#                 google_requests.Request(),
#                 settings.GOOGLE_CLIENT_ID,
#             )

#             email = (info.get("email") or "").lower().strip()
#             if not email:
#                 return fail("Google token has no email", status=400)

#             row = fetch_one(
#                 "SELECT id, email, role, is_active FROM users WHERE email=%s;",
#                 [email],
#             )

#             if not row:
#                 execute(
#                     "INSERT INTO users(email, password_hash, role, email_verified, must_set_password) "
#                     "VALUES (%s, %s, 'A', TRUE, FALSE) RETURNING id;",
#                     [email, "GOOGLE_AUTH_NO_PASSWORD"],
#                 )
#                 row = fetch_one(
#                     "SELECT id, email, role, is_active FROM users WHERE email=%s;",
#                     [email],
#                 )

#             if not row or not row["is_active"]:
#                 return fail("User inactive", status=403)

#             access = make_access_token(str(row["id"]), row["role"], row["email"])
#             refresh = make_refresh_token()
#             refresh_sha = sha256_hex(refresh)
#             exp = refresh_expiry()

#             execute(
#                 "INSERT INTO refresh_tokens(user_id, token_sha256, expires_at) VALUES (%s, %s, %s);",
#                 [row["id"], refresh_sha, exp],
#             )

#             # ✅ log google login
#             insert_auth_activity(
#                 user_id=str(row["id"]),
#                 email=row["email"],
#                 event="LOGIN",
#                 ip=_get_ip(request),
#                 user_agent=_get_ua(request),
#                 success=True,
#             )

#             return ok(
#                 message="Google login success",
#                 data={
#                     "access_token": access,
#                     "refresh_token": refresh,
#                     "user": {"id": str(row["id"]), "email": row["email"], "role": row["role"]},
#                 },
#             )

#         except ValueError as e:
#             return fail("Invalid Google token", errors={"detail": str(e)}, status=401)
#         except Exception as ex:
#             return fail("Server error", errors={"detail": str(ex)}, status=500)

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

            if not info.get("email_verified", False):
                return fail("Google email not verified", status=401)

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

            insert_auth_activity(
                user_id=str(row["id"]),
                email=row["email"],
                event="LOGIN",
                ip=_get_ip(request),
                user_agent=_get_ua(request),
                success=True,
            )

            # create same session cookie as normal login
            revoke_all_sessions_for_user(row["id"])
            sid = create_session(row["id"])

            resp = ok(
                message="Google login success",
                data={
                    "access_token": access,
                    "refresh_token": refresh,
                    "user": {
                        "id": str(row["id"]),
                        "email": row["email"],
                        "role": row["role"],
                    },
                },
            )

            resp.set_cookie(
                "tm_session",
                sid,
                httponly=True,
                samesite="None",
                secure=True,
                max_age=900,
            )
            return resp

        except ValueError as e:
            return fail("Invalid Google token", errors={"detail": str(e)}, status=401)
        except Exception as ex:
            return fail("Server error", errors={"detail": str(ex)}, status=500)
        
        
class ReauthView(APIView):
    parser_classes = [JSONParser]

    def post(self, request):
        ser = ReauthSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            data = reauthenticate(
                ser.validated_data["email"],
                ser.validated_data["password"],
            )

            revoke_all_sessions_for_user(data["user"]["id"])
            sid = create_session(data["user"]["id"])

            insert_auth_activity(
                user_id=data["user"]["id"],
                email=data["user"]["email"],
                event="LOGIN",
                ip=_get_ip(request),
                user_agent=_get_ua(request),
                success=True,
            )

            resp = ok(data=data, message="Session renewed")
            resp.set_cookie(
                "tm_session",
                sid,
                httponly=True,
                samesite="Lax",
                secure=False,
                max_age=900,
            )
            return resp

        except PermissionError as ex:
            return fail(str(ex), status=401)
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

        # logout(ser.validated_data["refresh_token"])
        sid = request.COOKIES.get("tm_session")

        logout(ser.validated_data["refresh_token"])

        resp = ok(message="Logged out")
        if sid:
            revoke_session(sid)
            resp.delete_cookie("tm_session")
        return resp
    
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
        
        
        
class MyProfileView(APIView):
    parser_classes = [JSONParser]

    @require_auth(roles=["ADMIN", "A", "B"])
    def get(self, request):
        user_id = request.user_ctx["id"]

        row = fetch_one(
            """
            SELECT
                id,
                email,
                role,
                full_name,
                phone,
                bio,
                notify_email,
                notify_inapp
            FROM users
            WHERE id = %s;
            """,
            [user_id],
        )

        if not row:
            return fail("User not found", status=404)

        return ok(data=row, message="Profile fetched")

    @require_auth(roles=["ADMIN", "A", "B"])
    def put(self, request):
        ser = ProfileUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        user_id = request.user_ctx["id"]
        data = ser.validated_data

        execute(
            """
            UPDATE users
            SET
                full_name = %s,
                phone = %s,
                bio = %s,
                notify_email = %s,
                notify_inapp = %s,
                updated_at = NOW()
            WHERE id = %s;
            """,
            [
                data.get("full_name", ""),
                data.get("phone", ""),
                data.get("bio", ""),
                data.get("notify_email", True),
                data.get("notify_inapp", True),
                user_id,
            ],
        )

        updated = fetch_one(
            """
            SELECT
                id,
                email,
                role,
                full_name,
                phone,
                bio,
                notify_email,
                notify_inapp
            FROM users
            WHERE id = %s;
            """,
            [user_id],
        )

        if not updated:
            return fail("User not found", status=404)

        # -------------------------------
        # In-app notification
        # -------------------------------
        try:
            if updated.get("notify_inapp"):
                create_notification(
                    recipient_id=str(user_id),
                    task_id=None,
                    ntype="PROFILE",
                    message="Your profile was updated successfully.",
                    actor_id=str(user_id),
                )
        except Exception as ex:
            print("PROFILE IN-APP NOTIFICATION ERROR:", ex)

        # -------------------------------
        # Email notification
        # -------------------------------
        try:
            if updated.get("notify_email") and updated.get("email"):
                send_mail(
                    subject="Profile updated successfully",
                    message=(
                        f"Hi {updated.get('full_name') or 'User'},\n\n"
                        "Your profile was updated successfully.\n\n"
                        "If you did not make this change, please change your password immediately."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[updated["email"]],
                    fail_silently=False,
                )
        except Exception as ex:
            print("PROFILE EMAIL NOTIFICATION ERROR:", ex)

        return ok(data=updated, message="Profile updated")


class ChangeMyPasswordView(APIView):
    parser_classes = [JSONParser]

    @require_auth(roles=["ADMIN", "A", "B"])
    def put(self, request):
        ser = ChangeMyPasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        user_id = request.user_ctx["id"]
        current_password = ser.validated_data["current_password"]
        new_password = ser.validated_data["new_password"]

        row = fetch_one(
            "SELECT id, password_hash FROM users WHERE id = %s;",
            [user_id],
        )

        if not row:
            return fail("User not found", status=404)

        if not verify_password(current_password, row["password_hash"]):
            return fail("Current password is incorrect", status=400)

        new_hash = hash_password(new_password)

        execute(
            """
            UPDATE users
            SET password_hash = %s, updated_at = NOW()
            WHERE id = %s;
            """,
            [new_hash, user_id],
        )

        return ok(message="Password changed successfully")
        