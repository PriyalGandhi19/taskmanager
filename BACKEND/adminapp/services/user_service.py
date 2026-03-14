# import secrets
# from datetime import timedelta
# from django.conf import settings
# from django.utils import timezone

# from backend.utils.security import hash_password, sha256_hex
# from backend.utils.mailer import send_welcome_email, send_verification_email

# from adminapp.repositories.user_repo import (
#     user_exists_by_email,
#     create_user_via_proc,
#     get_user_id_by_email,
# )
# from adminapp.repositories.token_repo import (
#     invalidate_email_verification_tokens,
#     insert_email_verification_token,
# )

# def create_user(actor_id: str, email: str, role: str) -> None:
#     if user_exists_by_email(email):
#         raise FileExistsError("Email already exists")

#     # temp password (admin never sees)
#     temp_password = secrets.token_urlsafe(10)
#     password_hash = hash_password(temp_password)

#     create_user_via_proc(actor_id, email, password_hash, role)

#     urow = get_user_id_by_email(email)
#     if not urow:
#         return

#     # create verify token
#     raw_token = secrets.token_urlsafe(32)
#     token_sha = sha256_hex(raw_token)

#     minutes = getattr(settings, "VERIFY_TOKEN_MINUTES", 60)
#     expires_at = timezone.now() + timedelta(minutes=minutes)

#     invalidate_email_verification_tokens(str(urow["id"]))
#     insert_email_verification_token(str(urow["id"]), token_sha, expires_at)

#     verify_link = f"{settings.FRONTEND_VERIFY_URL}?token={raw_token}"

    
#     try:
#         send_welcome_email(email)
#     except:
#         pass

#     try:
#         send_verification_email(email, verify_link, minutes)
#     except:
#         pass


import secrets
from datetime import timedelta
from django.conf import settings
from django.utils import timezone

from backend.utils.security import hash_password, sha256_hex
from backend.utils.mailer import send_welcome_email, send_verification_email

from adminapp.repositories.user_repo import (
    user_exists_by_email,
    create_user_via_proc,
    get_user_id_by_email,
    get_user_by_id,
    update_user_active_status,
    insert_user_status_audit_log,
)
from adminapp.repositories.token_repo import (
    invalidate_email_verification_tokens,
    insert_email_verification_token,
)

def create_user(actor_id: str, email: str, role: str) -> None:
    if user_exists_by_email(email):
        raise FileExistsError("Email already exists")

    temp_password = secrets.token_urlsafe(10)
    password_hash = hash_password(temp_password)

    create_user_via_proc(actor_id, email, password_hash, role)

    urow = get_user_id_by_email(email)
    if not urow:
        return

    raw_token = secrets.token_urlsafe(32)
    token_sha = sha256_hex(raw_token)

    minutes = getattr(settings, "VERIFY_TOKEN_MINUTES", 60)
    expires_at = timezone.now() + timedelta(minutes=minutes)

    invalidate_email_verification_tokens(str(urow["id"]))
    insert_email_verification_token(str(urow["id"]), token_sha, expires_at)

    verify_link = f"{settings.FRONTEND_VERIFY_URL}?token={raw_token}"

    try:
        send_welcome_email(email)
    except Exception:
        pass

    try:
        send_verification_email(email, verify_link, minutes)
    except Exception:
        pass


def change_user_status(actor_id: str, target_user_id: str, is_active: bool) -> dict:
    target = get_user_by_id(target_user_id)
    if not target:
        raise LookupError("User not found")

    if str(actor_id) == str(target_user_id):
        raise PermissionError("You cannot deactivate your own account")

    if target["role"] == "ADMIN":
        raise PermissionError("ADMIN users cannot be changed from here")

    if bool(target["is_active"]) == bool(is_active):
        return {
            "id": str(target["id"]),
            "email": target["email"],
            "role": target["role"],
            "is_active": bool(target["is_active"]),
        }

    update_user_active_status(target_user_id, is_active)

    action = "ACTIVATE_USER" if is_active else "DEACTIVATE_USER"
    insert_user_status_audit_log(
        actor_id=actor_id,
        target_user_id=target_user_id,
        action=action,
        target_email=target["email"],
        target_role=target["role"],
        is_active=is_active,
    )

    updated = get_user_by_id(target_user_id)
    return {
        "id": str(updated["id"]),
        "email": updated["email"],
        "role": updated["role"],
        "is_active": bool(updated["is_active"]),
    }