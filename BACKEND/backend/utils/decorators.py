from functools import wraps
from typing import Iterable
from rest_framework.request import Request
from backend.utils.responses import fail
from backend.utils.jwt_utils import decode_access_token

def require_auth(roles: Iterable[str] | None = None):
    roles_set = set(roles) if roles else None

    def decorator(fn):
        @wraps(fn)
        def wrapper(viewself, request: Request, *args, **kwargs):
            auth = request.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                return fail("Unauthorized", status=401)

            token = auth.replace("Bearer ", "", 1).strip()
            try:
                data = decode_access_token(token)
            except Exception:
                return fail("Invalid or expired token", status=401)

            user = {
                "id": data.get("sub"),
                "role": data.get("role"),
                "email": data.get("email"),
            }
            if not user["id"] or not user["role"]:
                return fail("Invalid token payload", status=401)

            if roles_set and user["role"] not in roles_set:
                return fail("Forbidden", status=403)

            request.user_ctx = user
            return fn(viewself, request, *args, **kwargs)

        return wrapper
    return decorator
