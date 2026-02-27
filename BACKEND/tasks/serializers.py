from rest_framework import serializers
from backend.utils.validators import validate_task_title, validate_task_status

PRIORITIES = ("LOW", "MEDIUM", "HIGH")

class TaskCreateSerializer(serializers.Serializer):
    title = serializers.CharField(required=True, allow_blank=False)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.CharField(required=False, default="PENDING")
    owner_id = serializers.UUIDField(required=False, allow_null=True)

    # ✅ new
    due_date = serializers.DateTimeField(required=False, allow_null=True)
    priority = serializers.ChoiceField(required=False, choices=PRIORITIES, default="MEDIUM")

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

    # ✅ new
    due_date = serializers.DateTimeField(required=False, allow_null=True)
    priority = serializers.ChoiceField(required=False, choices=PRIORITIES)

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

class CommentCreateSerializer(serializers.Serializer):
    content = serializers.CharField(required=True, allow_blank=False, max_length=2000)

    def validate_content(self, value: str):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("Comment cannot be empty")
        return v

class CommentUpdateSerializer(serializers.Serializer):
    content = serializers.CharField(required=True, allow_blank=False, max_length=2000)

    def validate_content(self, value: str):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("Comment cannot be empty")
        return v

class NotificationListSerializer(serializers.Serializer):
    unread_only = serializers.BooleanField(required=False, default=False)
    limit = serializers.IntegerField(required=False, default=20, min_value=1, max_value=100)