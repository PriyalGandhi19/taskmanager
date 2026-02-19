from django.urls import path
from .views import ListUsersView, CreateUserView , ListAuditLogsView, SendDocumentEmailView
urlpatterns = [
    path("users", ListUsersView.as_view()),
    path("users/create", CreateUserView.as_view()),
    path("audit-logs", ListAuditLogsView.as_view()),
   
    path("send-document", SendDocumentEmailView.as_view()),

]
