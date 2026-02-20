from backend.utils.db import fetch_one, execute

# ---- password_reset_tokens ----
def invalidate_password_reset_tokens(user_id: str) -> None:
    execute(
        "UPDATE password_reset_tokens SET used=TRUE WHERE user_id=%s AND used=FALSE;",
        [user_id],
    )

def insert_password_reset_token(user_id: str, token_sha: str, expires_at) -> None:
    execute(
        "INSERT INTO password_reset_tokens(user_id, token_sha256, expires_at) VALUES (%s, %s, %s);",
        [user_id, token_sha, expires_at],
    )

def get_password_reset_token(token_sha: str) -> dict | None:
    return fetch_one(
        "SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token_sha256=%s;",
        [token_sha],
    )

def mark_password_reset_token_used(token_id: str) -> None:
    execute("UPDATE password_reset_tokens SET used=TRUE WHERE id=%s;", [token_id])


# ---- email_verification_tokens ----
def get_email_verification_token(token_sha: str) -> dict | None:
    return fetch_one(
        "SELECT id, user_id, expires_at, used FROM email_verification_tokens WHERE token_sha256=%s;",
        [token_sha],
    )

def mark_email_verification_token_used(token_id: str) -> None:
    execute("UPDATE email_verification_tokens SET used=TRUE WHERE id=%s;", [token_id])


# ---- set_password_tokens ----
def invalidate_set_password_tokens(user_id: str) -> None:
    execute(
        "UPDATE set_password_tokens SET used=TRUE WHERE user_id=%s AND used=FALSE;",
        [user_id],
    )

def insert_set_password_token(user_id: str, token_sha: str, expires_at) -> None:
    execute(
        "INSERT INTO set_password_tokens(user_id, token_sha256, expires_at) VALUES (%s, %s, %s);",
        [user_id, token_sha, expires_at],
    )

def get_set_password_token(token_sha: str) -> dict | None:
    return fetch_one(
        "SELECT id, user_id, expires_at, used FROM set_password_tokens WHERE token_sha256=%s;",
        [token_sha],
    )

def mark_set_password_token_used(token_id: str) -> None:
    execute("UPDATE set_password_tokens SET used=TRUE WHERE id=%s;", [token_id])