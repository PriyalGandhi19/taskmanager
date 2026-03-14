from django.urls import path
from .views import (
    ListUsersView,
    CreateUserView,
    UpdateUserStatusView,
    ListAuditLogsView,
    SendDocumentEmailView,
    AdminAuthActivityView,
    AdminAuthActivityExportView,
)

urlpatterns = [
    path("users", ListUsersView.as_view()),
    path("users/create", CreateUserView.as_view()),
    path("users/<uuid:user_id>/status", UpdateUserStatusView.as_view()),
    path("audit-logs", ListAuditLogsView.as_view()),
    path("send-document", SendDocumentEmailView.as_view()),
    path("auth-activity", AdminAuthActivityView.as_view()),
    path("auth-activity/export", AdminAuthActivityExportView.as_view()),
]