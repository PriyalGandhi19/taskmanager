from rest_framework.views import APIView
from rest_framework.parsers import JSONParser

from backend.utils.responses import ok, fail

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

class LoginView(APIView):
    parser_classes = [JSONParser]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            data = login(ser.validated_data["email"], ser.validated_data["password"])
            return ok(data=data, message="Logged in")
        except PermissionError as ex:
            msg = str(ex)
            # keep your same status behavior
            if "verify your email" in msg.lower() or "set your password" in msg.lower():
                return fail(msg, status=403)
            return fail(msg, status=401)
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

    def post(self, request):
        ser = LogoutSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

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