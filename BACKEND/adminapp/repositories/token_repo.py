from backend.utils.db import execute

def invalidate_email_verification_tokens(user_id: str) -> None:
    execute(
        "UPDATE email_verification_tokens SET used=TRUE WHERE user_id=%s AND used=FALSE;",
        [user_id],
    )

def insert_email_verification_token(user_id: str, token_sha: str, expires_at) -> None:
    execute(
        "INSERT INTO email_verification_tokens(user_id, token_sha256, expires_at) VALUES (%s, %s, %s);",
        [user_id, token_sha, expires_at],
    )