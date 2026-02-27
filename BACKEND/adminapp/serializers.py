from rest_framework import serializers
from backend.utils.validators import validate_email, ALLOWED_CREATE_ROLES

class CreateUserSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    role = serializers.CharField(required=True)

    def validate_email(self, value: str):
        e = (value or "").strip().lower()
        err = validate_email(e)
        if err:
            raise serializers.ValidationError(err)
        return e

    def validate_role(self, value: str):
        r = (value or "").strip().upper()
        if r not in ALLOWED_CREATE_ROLES:
            raise serializers.ValidationError("Role must be A or B.")
        return r


class AuditLogQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(required=False, default=100)
    action = serializers.CharField(required=False, allow_blank=True)
    entity = serializers.CharField(required=False, allow_blank=True)

    def validate_limit(self, value: int):
        if value < 1 or value > 500:
            return 100
        return value

    def validate_action(self, value: str):
        v = (value or "").strip()
        return v.upper() if v else ""

    def validate_entity(self, value: str):
        v = (value or "").strip()
        return v.lower() if v else ""


class SendDocumentSerializer(serializers.Serializer):
    to_email = serializers.EmailField(required=True)
    subject = serializers.CharField(required=False, allow_blank=True, default="Document")
    body = serializers.CharField(required=False, allow_blank=True, default="Please find attached document.")

    def validate_to_email(self, value: str):
        e = (value or "").strip().lower()
        err = validate_email(e)
        if err:
            raise serializers.ValidationError(err)
        return e
    
class AuthActivityQuerySerializer(serializers.Serializer):
    email = serializers.CharField(required=False, allow_blank=True)
    from_date = serializers.CharField(required=False, allow_blank=True)
    to_date = serializers.CharField(required=False, allow_blank=True)
    page = serializers.IntegerField(required=False, default=1)
    limit = serializers.IntegerField(required=False, default=20)

    def validate_email(self, value: str):
        v = (value or "").strip().lower()
        return v

    def validate_from_date(self, value: str):
        v = (value or "").strip()
        return v

    def validate_to_date(self, value: str):
        v = (value or "").strip()
        return v

    def validate_page(self, value: int):
        return value if value and value > 0 else 1

    def validate_limit(self, value: int):
        if value < 1 or value > 200:
            return 20
        return value