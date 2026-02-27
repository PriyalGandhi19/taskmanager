from django.urls import path
from .views import (
    TaskListCreateView,
    TaskDetailView,
    TaskAttachmentDownloadView,
    TaskSummaryView,
    TaskCommentsView,
    CommentUpdateView,
    NotificationListView,
    NotificationReadView,
    NotificationReadAllView,
)

urlpatterns = [
    path("tasks", TaskListCreateView.as_view()),
    path("tasks/summary", TaskSummaryView.as_view()),
    path("tasks/<uuid:task_id>", TaskDetailView.as_view()),

    # Comments
    path("tasks/<uuid:task_id>/comments", TaskCommentsView.as_view()),
    path("comments/<uuid:comment_id>", CommentUpdateView.as_view()),

    # Notifications
    path("notifications", NotificationListView.as_view()),
    path("notifications/<uuid:notif_id>/read", NotificationReadView.as_view()),
    path("notifications/read-all", NotificationReadAllView.as_view()),

    # Attachments
    path("attachments/<uuid:attachment_id>/download", TaskAttachmentDownloadView.as_view()),
]