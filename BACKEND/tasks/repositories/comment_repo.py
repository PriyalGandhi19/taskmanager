from backend.utils.db import fetch_one, fetch_all

def list_comments_for_task(task_id: str) -> list[dict]:
    return fetch_all(
        """
        SELECT
          c.id,
          c.task_id,
          c.user_id,
          u.email AS user_email,
          c.content,
          c.is_edited,
          c.created_at,
          c.updated_at
        FROM task_comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.task_id = %s
        ORDER BY c.created_at ASC;
        """,
        [task_id],
    )

def insert_comment(task_id: str, user_id: str, content: str) -> dict:
    return fetch_one(
        """
        INSERT INTO task_comments(task_id, user_id, content)
        VALUES (%s,%s,%s)
        RETURNING id;
        """,
        [task_id, user_id, content],
    )

def get_comment(comment_id: str) -> dict | None:
    return fetch_one(
        """
        SELECT id, task_id, user_id, content
        FROM task_comments
        WHERE id = %s
        """,
        [comment_id],
    )

def update_comment(comment_id: str, content: str) -> None:
    # mark edited
    fetch_one(
        """
        UPDATE task_comments
        SET content = %s,
            is_edited = TRUE
        WHERE id = %s
        RETURNING id;
        """,
        [content, comment_id],
    )