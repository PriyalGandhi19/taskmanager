from tasks.repositories.notification_repo import mark_notification_read, mark_all_read
from tasks.selectors.notification_selector import get_unread_count, get_notifications

def list_my_notifications(user_id: str, unread_only: bool = False, limit: int = 20):
    return get_notifications(user_id=user_id, unread_only=unread_only, limit=limit)

def unread_count(user_id: str) -> int:
    return get_unread_count(user_id)

def read_notification(user_id: str, notif_id: str) -> None:
    mark_notification_read(user_id=user_id, notif_id=notif_id)

def read_all(user_id: str) -> None:
    mark_all_read(user_id=user_id)