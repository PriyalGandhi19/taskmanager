from django.urls import path
from .views import TaskListCreateView, TaskDetailView , TaskAttachmentDownloadView

urlpatterns = [
    path("tasks", TaskListCreateView.as_view()),
    path("tasks/<uuid:task_id>", TaskDetailView.as_view()),
    path("attachments/<uuid:attachment_id>/download", TaskAttachmentDownloadView.as_view()),
]
