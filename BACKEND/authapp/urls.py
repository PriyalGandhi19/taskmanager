from django.urls import path
from .views import (
    LoginView, GoogleLoginView, RefreshView, LogoutView,
    ForgotPasswordView, ResetPasswordView, VerifyEmailView,
    SetPasswordView, ReauthView,
    MyProfileView, ChangeMyPasswordView
)


urlpatterns = [
    path("login", LoginView.as_view()),
    path("google", GoogleLoginView.as_view()),
    path("refresh", RefreshView.as_view()),
    path("logout", LogoutView.as_view()),
    path("forgot-password", ForgotPasswordView.as_view()),
    path("reset-password", ResetPasswordView.as_view()),
    path("verify-email", VerifyEmailView.as_view()),
    path("set-password", SetPasswordView.as_view()),
    path("reauth", ReauthView.as_view()),
    path("me/profile", MyProfileView.as_view()),
path("me/change-password", ChangeMyPasswordView.as_view()),

]