from rest_framework.views import APIView
from django.conf import settings
from django.utils import timezone

import secrets
from datetime import timedelta

from backend.utils.db import fetch_one, fetch_all, execute
from backend.utils.responses import ok, fail
from backend.utils.validators import validate_email, validate_password
from backend.utils.security import (
    verify_password,
    hash_token,
    verify_token,
    sha256_hex,
    hash_password,
)
from backend.utils.jwt_utils import make_access_token, make_refresh_token, refresh_expiry
from backend.utils.mailer import send_reset_password_email
from backend.utils.mailer import send_set_password_email

class LoginView(APIView):
    def post(self, request):
        try:
            email = (request.data.get("email") or "").strip().lower()
            password = request.data.get("password") or ""

            eerr = validate_email(email)
            if eerr:
                return fail("Validation failed", errors={"email": eerr}, status=422)

            row = fetch_one(
    "SELECT id, email, password_hash, role, is_active, email_verified, must_set_password "
    "FROM users WHERE email=%s;",
    [email],
)

            if not row or not row["is_active"]:
                return fail("Invalid email or password", status=401)

            if not row["email_verified"]:
                return fail("Please verify your email before logging in.", status=403)

            if row["must_set_password"]:
                return fail("Please set your password first.", status=403)

            if not verify_password(password, row["password_hash"]):
                return fail("Invalid email or password", status=401)

            access = make_access_token(str(row["id"]), row["role"], row["email"])
            refresh = make_refresh_token()
            refresh_sha = sha256_hex(refresh)
            exp = refresh_expiry()

            execute(
                "INSERT INTO refresh_tokens(user_id, token_sha256, expires_at) VALUES (%s, %s, %s);",
                [row["id"], refresh_sha, exp],
            )

            return ok(
                data={
                    "access_token": access,
                    "refresh_token": refresh,
                    "user": {"id": str(row["id"]), "email": row["email"], "role": row["role"]},
                },
                message="Logged in",
            )
        except Exception as ex:
            # so you see error in response too
            return fail("Server error", errors={"detail": str(ex)}, status=500)




class RefreshView(APIView):
    def post(self, request):
        refresh = (request.data.get("refresh_token") or "").strip()
        if not refresh:
            return fail("refresh_token is required", status=422)

        refresh_sha = sha256_hex(refresh)

        row = fetch_one(
            """
            SELECT rt.user_id, u.email, u.role, u.is_active
            FROM refresh_tokens rt
            JOIN users u ON u.id = rt.user_id
            WHERE rt.revoked = FALSE
              AND rt.expires_at > NOW()
              AND rt.token_sha256 = %s
            LIMIT 1;
            """,
            [refresh_sha],
        )

        if not row or not row["is_active"]:
            return fail("Invalid or expired refresh token", status=401)

        access = make_access_token(str(row["user_id"]), row["role"], row["email"])
        return ok(data={"access_token": access}, message="Token refreshed")


class LogoutView(APIView):
    def post(self, request):
        refresh = (request.data.get("refresh_token") or "").strip()
        if not refresh:
            return fail("refresh_token is required", status=422)

        refresh_sha = sha256_hex(refresh)

        execute(
            "UPDATE refresh_tokens SET revoked=TRUE WHERE token_sha256=%s;",
            [refresh_sha],
        )

        return ok(message="Logged out")



class ForgotPasswordView(APIView):
    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()

        eerr = validate_email(email)
        if eerr:
            return fail("Validation failed", errors={"email": eerr}, status=422)

        user = fetch_one("SELECT id, email, is_active FROM users WHERE email=%s;", [email])

        # security: do not reveal if user exists
        if not user or not user["is_active"]:
            return ok(message="If the email exists, reset link sent.")

        raw_token = secrets.token_urlsafe(32)
        token_sha = sha256_hex(raw_token)

        minutes = getattr(settings, "RESET_TOKEN_MINUTES", 15)
        expires_at = timezone.now() + timedelta(minutes=minutes)

        # invalidate old tokens
        execute(
            "UPDATE password_reset_tokens SET used=TRUE WHERE user_id=%s AND used=FALSE;",
            [user["id"]],
        )

        execute(
            "INSERT INTO password_reset_tokens(user_id, token_sha256, expires_at) VALUES (%s, %s, %s);",
            [user["id"], token_sha, expires_at],
        )

        reset_link = f"{settings.FRONTEND_RESET_URL}?token={raw_token}"
        send_reset_password_email(user["email"], reset_link, minutes)

        return ok(message="If the email exists, reset link sent.")


class ResetPasswordView(APIView):
    def post(self, request):
        token = (request.data.get("token") or "").strip()
        new_password = request.data.get("new_password") or ""

        if not token:
            return fail("Validation failed", errors={"token": "Token is required."}, status=422)

        perr = validate_password(new_password)
        if perr:
            return fail("Validation failed", errors={"new_password": perr}, status=422)

        token_sha = sha256_hex(token)

        row = fetch_one(
            "SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token_sha256=%s;",
            [token_sha],
        )

        if not row or row["used"] or row["expires_at"] <= timezone.now():
            return fail("Invalid or expired token", status=400)

        new_hash = hash_password(new_password)
        execute(
            "UPDATE users SET password_hash=%s, updated_at=NOW() WHERE id=%s;",
            [new_hash, row["user_id"]],
        )

        execute("UPDATE password_reset_tokens SET used=TRUE WHERE id=%s;", [row["id"]])

        return ok(message="Password reset successful")


class VerifyEmailView(APIView):
    def post(self, request):
        token = (request.data.get("token") or "").strip()
        if not token:
            return fail("token is required", status=422)

        token_sha = sha256_hex(token)

        row = fetch_one(
            "SELECT id, user_id, expires_at, used FROM email_verification_tokens WHERE token_sha256=%s;",
            [token_sha],
        )

        if not row or row["used"] or row["expires_at"] <= timezone.now():
            return fail("Invalid or expired token", status=400)

        # mark verified + token used
        execute(
            "UPDATE users SET email_verified=TRUE, updated_at=NOW() WHERE id=%s;",
            [row["user_id"]],
        )
        execute("UPDATE email_verification_tokens SET used=TRUE WHERE id=%s;", [row["id"]])

        # ✅ create set-password token (valid 60 minutes)
        raw_token = secrets.token_urlsafe(32)
        spt_sha = sha256_hex(raw_token)
        minutes = getattr(settings, "SET_PASSWORD_MINUTES", 60)
        expires_at = timezone.now() + timedelta(minutes=minutes)

        execute(
            "UPDATE set_password_tokens SET used=TRUE WHERE user_id=%s AND used=FALSE;",
            [row["user_id"]],
        )

        execute(
            "INSERT INTO set_password_tokens(user_id, token_sha256, expires_at) VALUES (%s, %s, %s);",
            [row["user_id"], spt_sha, expires_at],
        )

        # fetch email and send set-password email
        u = fetch_one("SELECT email FROM users WHERE id=%s;", [row["user_id"]])
        if u and u.get("email"):
            set_password_link = f"{settings.FRONTEND_SET_PASSWORD_URL}?token={raw_token}"
            try:
                send_set_password_email(u["email"], set_password_link, minutes)
            except:
                pass

        return ok(message="Email verified successfully. Check your email to set password.")

class SetPasswordView(APIView):
    def post(self, request):
        token = (request.data.get("token") or "").strip()
        new_password = request.data.get("new_password") or ""

        if not token:
            return fail("Validation failed", errors={"token": "Token is required."}, status=422)

        perr = validate_password(new_password)
        if perr:
            return fail("Validation failed", errors={"new_password": perr}, status=422)

        token_sha = sha256_hex(token)

        row = fetch_one(
            "SELECT id, user_id, expires_at, used FROM set_password_tokens WHERE token_sha256=%s;",
            [token_sha],
        )

        if not row or row["used"] or row["expires_at"] <= timezone.now():
            return fail("Invalid or expired token", status=400)

        new_hash = hash_password(new_password)

        execute(
            "UPDATE users SET password_hash=%s, must_set_password=FALSE, updated_at=NOW() WHERE id=%s;",
            [new_hash, row["user_id"]],
        )

        execute("UPDATE set_password_tokens SET used=TRUE WHERE id=%s;", [row["id"]])

        return ok(message="Password set successfully. You can login now.")
