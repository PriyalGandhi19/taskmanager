from backend.utils.db import fetch_one, execute

def get_user_for_login(email: str) -> dict | None:
    return fetch_one(
        "SELECT id, email, password_hash, role, is_active, email_verified, must_set_password "
        "FROM users WHERE email=%s;",
        [email],
    )

def insert_refresh_token(user_id: str, token_sha256: str, expires_at) -> None:
    execute(
        "INSERT INTO refresh_tokens(user_id, token_sha256, expires_at) VALUES (%s, %s, %s);",
        [user_id, token_sha256, expires_at],
    )

def find_valid_refresh_token(token_sha256: str) -> dict | None:
    return fetch_one(
        """
        SELECT rt.user_id, u.email, u.role, u.is_active
        FROM refresh_tokens rt
        JOIN users u ON u.id = rt.user_id
        WHERE rt.revoked = FALSE
          AND rt.expires_at > NOW()
          AND rt.token_sha256 = %s
        LIMIT 1;
        """,
        [token_sha256],
    )

def revoke_refresh_token(token_sha256: str) -> None:
    execute("UPDATE refresh_tokens SET revoked=TRUE WHERE token_sha256=%s;", [token_sha256])

def set_user_password(user_id: str, new_hash: str, must_set_password: bool | None = None) -> None:
    if must_set_password is None:
        execute(
            "UPDATE users SET password_hash=%s, updated_at=NOW() WHERE id=%s;",
            [new_hash, user_id],
        )
    else:
        execute(
            "UPDATE users SET password_hash=%s, must_set_password=%s, updated_at=NOW() WHERE id=%s;",
            [new_hash, must_set_password, user_id],
        )

def set_email_verified(user_id: str) -> None:
    execute("UPDATE users SET email_verified=TRUE, updated_at=NOW() WHERE id=%s;", [user_id])

def get_user_email(user_id: str) -> dict | None:
    return fetch_one("SELECT email FROM users WHERE id=%s;", [user_id])