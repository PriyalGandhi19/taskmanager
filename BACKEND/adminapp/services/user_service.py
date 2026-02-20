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
)
from adminapp.repositories.token_repo import (
    invalidate_email_verification_tokens,
    insert_email_verification_token,
)

def create_user(actor_id: str, email: str, role: str) -> None:
    if user_exists_by_email(email):
        raise FileExistsError("Email already exists")

    # temp password (admin never sees)
    temp_password = secrets.token_urlsafe(10)
    password_hash = hash_password(temp_password)

    create_user_via_proc(actor_id, email, password_hash, role)

    urow = get_user_id_by_email(email)
    if not urow:
        return

    # create verify token
    raw_token = secrets.token_urlsafe(32)
    token_sha = sha256_hex(raw_token)

    minutes = getattr(settings, "VERIFY_TOKEN_MINUTES", 60)
    expires_at = timezone.now() + timedelta(minutes=minutes)

    invalidate_email_verification_tokens(str(urow["id"]))
    insert_email_verification_token(str(urow["id"]), token_sha, expires_at)

    verify_link = f"{settings.FRONTEND_VERIFY_URL}?token={raw_token}"

    # emails are "best effort"
    try:
        send_welcome_email(email)
    except:
        pass

    try:
        send_verification_email(email, verify_link, minutes)
    except:
        pass