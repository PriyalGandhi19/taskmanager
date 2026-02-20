from backend.utils.db import fetch_all, fetch_one, callproc

def list_users() -> list[dict]:
    return fetch_all(
        "SELECT id, email, role, is_active, created_at, updated_at "
        "FROM users ORDER BY created_at DESC;"
    )

def user_exists_by_email(email: str) -> bool:
    row = fetch_one("SELECT id FROM users WHERE email=%s;", [email])
    return bool(row)

def create_user_via_proc(actor_id: str, email: str, password_hash: str, role: str) -> None:
    callproc("sp_create_user", [actor_id, email, password_hash, role])

def get_user_id_by_email(email: str) -> dict | None:
    return fetch_one("SELECT id FROM users WHERE email=%s;", [email])