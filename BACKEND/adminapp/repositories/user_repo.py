# from backend.utils.db import fetch_all, fetch_one, callproc

# def list_users() -> list[dict]:
#     return fetch_all(
#         "SELECT id, email, role, is_active, created_at, updated_at "
#         "FROM users ORDER BY created_at DESC;"
#     )

# def user_exists_by_email(email: str) -> bool:
#     row = fetch_one("SELECT id FROM users WHERE email=%s;", [email])
#     return bool(row)

# def create_user_via_proc(actor_id: str, email: str, password_hash: str, role: str) -> None:
#     callproc("sp_create_user", [actor_id, email, password_hash, role])

# def get_user_id_by_email(email: str) -> dict | None:
#     return fetch_one("SELECT id FROM users WHERE email=%s;", [email])


from backend.utils.db import fetch_all, fetch_one, callproc, execute

def list_users() -> list[dict]:
    return fetch_all(
        """
        SELECT id, email, role, is_active, created_at, updated_at
        FROM users
        ORDER BY created_at DESC;
        """
    )

def user_exists_by_email(email: str) -> bool:
    row = fetch_one("SELECT id FROM users WHERE email=%s;", [email])
    return bool(row)

def create_user_via_proc(actor_id: str, email: str, password_hash: str, role: str) -> None:
    callproc("sp_create_user", [actor_id, email, password_hash, role])

def get_user_id_by_email(email: str) -> dict | None:
    return fetch_one("SELECT id FROM users WHERE email=%s;", [email])

def get_user_by_id(user_id: str) -> dict | None:
    return fetch_one(
        """
        SELECT id, email, role, is_active
        FROM users
        WHERE id = %s;
        """,
        [user_id],
    )

def update_user_active_status(user_id: str, is_active: bool) -> int:
    return execute(
        """
        UPDATE users
        SET is_active = %s, updated_at = NOW()
        WHERE id = %s;
        """,
        [is_active, user_id],
    )

def insert_user_status_audit_log(
    actor_id: str,
    target_user_id: str,
    action: str,
    target_email: str,
    target_role: str,
    is_active: bool,
) -> int:
    return execute(
        """
        INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
        VALUES (
            %s,
            %s,
            'users',
            %s,
            jsonb_build_object(
                'target_user_id', %s,
                'target_email', %s,
                'target_role', %s,
                'is_active', %s
            )
        );
        """,
        [actor_id, action, target_user_id, target_user_id, target_email, target_role, is_active],
    )