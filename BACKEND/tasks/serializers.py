from rest_framework import serializers
from backend.utils.validators import validate_task_title, validate_task_status

class TaskCreateSerializer(serializers.Serializer):
    title = serializers.CharField(required=True, allow_blank=False)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.CharField(required=False, default="PENDING")
    owner_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_title(self, value: str):
        err = validate_task_title(value)
        if err:
            raise serializers.ValidationError(err)
        return value.strip()

    def validate_status(self, value: str):
        s = (value or "PENDING").strip().upper()
        err = validate_task_status(s)
        if err:
            raise serializers.ValidationError(err)
        return s


class TaskUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=False)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False)

    def validate_title(self, value: str):
        err = validate_task_title(value)
        if err:
            raise serializers.ValidationError(err)
        return value.strip()

    def validate_status(self, value: str):
        s = (value or "").strip().upper()
        err = validate_task_status(s)
        if err:
            raise serializers.ValidationError(err)
        return s