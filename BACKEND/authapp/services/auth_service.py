import secrets
from datetime import timedelta
from django.conf import settings
from django.utils import timezone

from backend.utils.security import verify_password, sha256_hex, hash_password
from backend.utils.jwt_utils import make_access_token, make_refresh_token, refresh_expiry
from backend.utils.mailer import send_reset_password_email, send_set_password_email

from authapp.repositories.auth_repo import (
    get_user_for_login,
    insert_refresh_token,
    find_valid_refresh_token,
    revoke_refresh_token,
    set_user_password,
    set_email_verified,
    get_user_email,
)
from authapp.repositories.token_repo import (
    invalidate_password_reset_tokens,
    insert_password_reset_token,
    get_password_reset_token,
    mark_password_reset_token_used,
    get_email_verification_token,
    mark_email_verification_token_used,
    invalidate_set_password_tokens,
    insert_set_password_token,
    get_set_password_token,
    mark_set_password_token_used,
)

# ---- LOGIN ----
def login(email: str, password: str) -> dict:
    row = get_user_for_login(email)

    if not row or not row["is_active"]:
        raise PermissionError("Invalid email or password")

    if not row["email_verified"]:
        raise PermissionError("Please verify your email before logging in.")

    if row["must_set_password"]:
        raise PermissionError("Please set your password first.")

    if not verify_password(password, row["password_hash"]):
        raise PermissionError("Invalid email or password")

    access = make_access_token(str(row["id"]), row["role"], row["email"])

    refresh = make_refresh_token()
    refresh_sha = sha256_hex(refresh)
    exp = refresh_expiry()

    insert_refresh_token(str(row["id"]), refresh_sha, exp)

    return {
        "access_token": access,
        "refresh_token": refresh,
        "user": {"id": str(row["id"]), "email": row["email"], "role": row["role"]},
    }


# ---- REFRESH ----
def refresh_access_token(refresh_token: str) -> dict:
    refresh_sha = sha256_hex(refresh_token)
    row = find_valid_refresh_token(refresh_sha)

    if not row or not row["is_active"]:
        raise PermissionError("Invalid or expired refresh token")

    access = make_access_token(str(row["user_id"]), row["role"], row["email"])
    return {"access_token": access}


# ---- LOGOUT ----
def logout(refresh_token: str) -> None:
    refresh_sha = sha256_hex(refresh_token)
    revoke_refresh_token(refresh_sha)


# ---- FORGOT PASSWORD ----
def forgot_password(email: str) -> None:
    # we do not reveal user exists or not
    user = get_user_for_login(email)  # contains id if exists
    if not user or not user["is_active"]:
        return

    raw_token = secrets.token_urlsafe(32)
    token_sha = sha256_hex(raw_token)

    minutes = getattr(settings, "RESET_TOKEN_MINUTES", 15)
    expires_at = timezone.now() + timedelta(minutes=minutes)

    invalidate_password_reset_tokens(str(user["id"]))
    insert_password_reset_token(str(user["id"]), token_sha, expires_at)

    reset_link = f"{settings.FRONTEND_RESET_URL}?token={raw_token}"
    send_reset_password_email(user["email"], reset_link, minutes)


def reset_password(token: str, new_password: str) -> None:
    token_sha = sha256_hex(token)
    row = get_password_reset_token(token_sha)

    if not row or row["used"] or row["expires_at"] <= timezone.now():
        raise PermissionError("Invalid or expired token")

    new_hash = hash_password(new_password)
    set_user_password(str(row["user_id"]), new_hash)

    mark_password_reset_token_used(str(row["id"]))


# ---- VERIFY EMAIL ----
def verify_email(token: str) -> None:
    token_sha = sha256_hex(token)
    row = get_email_verification_token(token_sha)

    if not row or row["used"] or row["expires_at"] <= timezone.now():
        raise PermissionError("Invalid or expired token")

    user_id = str(row["user_id"])

    set_email_verified(user_id)
    mark_email_verification_token_used(str(row["id"]))

    # create set-password token
    raw_token = secrets.token_urlsafe(32)
    spt_sha = sha256_hex(raw_token)

    minutes = getattr(settings, "SET_PASSWORD_MINUTES", 60)
    expires_at = timezone.now() + timedelta(minutes=minutes)

    invalidate_set_password_tokens(user_id)
    insert_set_password_token(user_id, spt_sha, expires_at)

    u = get_user_email(user_id)
    if u and u.get("email"):
        set_password_link = f"{settings.FRONTEND_SET_PASSWORD_URL}?token={raw_token}"
        try:
            send_set_password_email(u["email"], set_password_link, minutes)
        except:
            pass


def set_password(token: str, new_password: str) -> None:
    token_sha = sha256_hex(token)
    row = get_set_password_token(token_sha)

    if not row or row["used"] or row["expires_at"] <= timezone.now():
        raise PermissionError("Invalid or expired token")

    new_hash = hash_password(new_password)
    set_user_password(str(row["user_id"]), new_hash, must_set_password=False)

    mark_set_password_token_used(str(row["id"]))