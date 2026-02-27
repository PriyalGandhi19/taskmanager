from backend.utils.db import fetch_one, fetch_all

def create_notification(recipient_id: str, task_id: str | None, ntype: str, message: str) -> dict:
    return fetch_one(
        """
        INSERT INTO notifications(recipient_id, task_id, type, message)
        VALUES (%s,%s,%s,%s)
        RETURNING id;
        """,
        [recipient_id, task_id, ntype, message],
    )

def list_notifications_for_user(user_id: str, unread_only: bool = False, limit: int = 20) -> list[dict]:
    return fetch_all(
        """
        SELECT id, recipient_id, task_id, type, message, is_read, created_at
        FROM notifications
        WHERE recipient_id = %s
          AND (%s = FALSE OR is_read = FALSE)
        ORDER BY created_at DESC
        LIMIT %s;
        """,
        [user_id, unread_only, limit],
    )

def count_unread(user_id: str) -> int:
    row = fetch_one(
        """
        SELECT COUNT(*) AS unread_count
        FROM notifications
        WHERE recipient_id = %s AND is_read = FALSE;
        """,
        [user_id],
    )
    # pg COUNT returns Decimal/int depending on driver
    return int(row["unread_count"]) if row and row.get("unread_count") is not None else 0

def mark_notification_read(user_id: str, notif_id: str) -> None:
    fetch_one(
        """
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = %s AND recipient_id = %s
        RETURNING id;
        """,
        [notif_id, user_id],
    )

def mark_all_read(user_id: str) -> None:
    # NOTE: fetch_one is ok, but returning 1 is weird; still fine.
    fetch_one(
        """
        UPDATE notifications
        SET is_read = TRUE
        WHERE recipient_id = %s AND is_read = FALSE
        RETURNING 1;
        """,
        [user_id],
    )