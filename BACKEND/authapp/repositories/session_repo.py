from backend.utils.db import fetch_one, execute

def create_session(user_id: str) -> str:
    row = fetch_one(
        "INSERT INTO user_sessions(user_id) VALUES (%s) RETURNING id::text AS id;",
        [user_id],
    )
    return row["id"]

def get_session(session_id: str):
    return fetch_one(
        """
        SELECT
          s.id::text AS id,
          s.user_id::text AS user_id,
          s.last_seen_at,
          s.revoked,
          u.email,
          u.role
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = %s;
        """,
        [session_id],
    )

def touch_session(session_id: str) -> None:
    execute("UPDATE user_sessions SET last_seen_at = NOW() WHERE id = %s;", [session_id])

def revoke_session(session_id: str) -> None:
    execute("UPDATE user_sessions SET revoked = TRUE WHERE id = %s;", [session_id])
    
def revoke_all_sessions_for_user(user_id: str) -> None:
    execute("UPDATE user_sessions SET revoked = TRUE WHERE user_id = %s AND revoked = FALSE;", [user_id])