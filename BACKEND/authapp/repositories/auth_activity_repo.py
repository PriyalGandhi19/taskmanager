from backend.utils.db import execute

def insert_auth_activity(
    user_id: str | None,
    email: str,
    event: str,
    ip: str | None,
    user_agent: str | None,
    success: bool = True,
) -> None:
    execute(
        """
        INSERT INTO auth_activity(user_id, email, event, ip_address, user_agent, success)
        VALUES (%s, %s, %s, %s, %s, %s);
        """,
        [user_id, (email or "").strip().lower(), event, ip, user_agent, success],
    )