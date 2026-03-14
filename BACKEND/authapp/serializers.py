from rest_framework import serializers
from backend.utils.validators import validate_email, validate_password

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, allow_blank=False)

    def validate_email(self, value: str):
        e = (value or "").strip().lower()
        err = validate_email(e)
        if err:
            raise serializers.ValidationError(err)
        return e


class RefreshSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(required=True, allow_blank=False)


class LogoutSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(required=True, allow_blank=False)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value: str):
        e = (value or "").strip().lower()
        err = validate_email(e)
        if err:
            raise serializers.ValidationError(err)
        return e


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, allow_blank=False)
    new_password = serializers.CharField(required=True, allow_blank=False)

    def validate_new_password(self, value: str):
        err = validate_password(value)
        if err:
            raise serializers.ValidationError(err)
        return value


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, allow_blank=False)


class SetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, allow_blank=False)
    new_password = serializers.CharField(required=True, allow_blank=False)

    def validate_new_password(self, value: str):
        err = validate_password(value)
        if err:
            raise serializers.ValidationError(err)
        return value
    
class ReauthSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, allow_blank=False)

    def validate_email(self, value: str):
        e = (value or "").strip().lower()
        err = validate_email(e)
        if err:
            raise serializers.ValidationError(err)
        return e
    
    



class ProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(required=False, allow_blank=True, max_length=120)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=30)
    bio = serializers.CharField(required=False, allow_blank=True, max_length=500)
    notify_email = serializers.BooleanField(required=False)
    notify_inapp = serializers.BooleanField(required=False)


class ChangeMyPasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, allow_blank=False)
    new_password = serializers.CharField(required=True, allow_blank=False)
    confirm_password = serializers.CharField(required=True, allow_blank=False)

    def validate_new_password(self, value: str):
        err = validate_password(value)
        if err:
            raise serializers.ValidationError(err)
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs