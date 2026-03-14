from functools import wraps
from typing import Iterable
from django.utils import timezone
from rest_framework.request import Request

from backend.utils.responses import fail
from authapp.repositories.session_repo import get_session, touch_session, revoke_session
from authapp.repositories.auth_activity_repo import insert_auth_activity

# =========================
# CONFIG
# =========================
IDLE_SECONDS = 15 * 60
# IDLE_SECONDS = 10

COOKIE_NAME = "tm_session"
COOKIE_MAX_AGE = 900  # 15 min sliding cookie expiry

# =========================
# HELPERS
# =========================
def _get_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _get_ua(request):
    return request.META.get("HTTP_USER_AGENT")


def _fail_and_clear_cookie(message: str, status: int = 401):
    """
    Always clear cookie on auth failures so browser doesn't keep sending dead sid.
    """
    resp = fail(message, status=status)
    try:
        resp.delete_cookie(COOKIE_NAME)
    except Exception:
        pass
    return resp


def _fail_with_code(message: str, code: str, status: int = 401):
    """
    Same as _fail_and_clear_cookie, but also returns a machine-readable code
    so frontend can detect session-expiry reliably.
    """
    resp = fail(message, status=status, errors={"code": code})
    try:
        resp.delete_cookie(COOKIE_NAME)
    except Exception:
        pass
    return resp


def require_auth(roles: Iterable[str] | None = None):
    roles_set = set(roles) if roles else None

    def decorator(fn):
        @wraps(fn)
        def wrapper(viewself, request: Request, *args, **kwargs):

            # ==========================================================
            # 1) COOKIE SESSION AUTH
            # ==========================================================
            sid = request.COOKIES.get(COOKIE_NAME)
            if sid:
                s = get_session(sid)

                # session missing/revoked
                if not s or s.get("revoked"):
                    if s:
                        try:
                            insert_auth_activity(
                                user_id=s["user_id"],
                                email=s["email"],
                                event="SESSION_INVALID",
                                ip=_get_ip(request),
                                user_agent=_get_ua(request),
                                success=True,
                            )
                        except Exception:
                            pass

                    return _fail_with_code(
                        "Session expired",
                        "SESSION_EXPIRED",
                        status=401,
                    )

                now = timezone.now()
                last_seen = s["last_seen_at"]

                # idle timeout
                if (now - last_seen).total_seconds() > IDLE_SECONDS:
                    revoke_session(sid)

                    try:
                        insert_auth_activity(
                            user_id=s["user_id"],
                            email=s["email"],
                            event="SESSION_TIMEOUT",
                            ip=_get_ip(request),
                            user_agent=_get_ua(request),
                            success=True,
                        )
                    except Exception:
                        pass

                    return _fail_with_code(
                        "Session timed out (inactivity)",
                        "SESSION_EXPIRED",
                        status=401,
                    )

                # only real user activity should refresh session
                is_user_active = request.headers.get("X-USER-ACTIVE") == "1"
                if is_user_active:
                    touch_session(sid)

                if roles_set and s["role"] not in roles_set:
                    return fail("Forbidden", status=403)

                request.user_ctx = {
                    "id": s["user_id"],
                    "role": s["role"],
                    "email": s["email"],
                }

                resp = fn(viewself, request, *args, **kwargs)

                # sliding cookie expiry refresh
                try:
                    resp.set_cookie(
                        COOKIE_NAME,
                        sid,
                        httponly=True,
                        samesite="Lax",
                        secure=False,
                        max_age=COOKIE_MAX_AGE,
                    )
                except Exception:
                    pass

                return resp

            # ==========================================================
            # If no valid cookie session
            # ==========================================================
            return _fail_and_clear_cookie("Unauthorized", status=401)

        return wrapper

    return decorator

            # ==========================================================
            # 🔁 2) JWT FALLBACK (OPTIONAL)
            # ==========================================================
            # If you want JWT fallback, uncomment this block AND import decode_access_token above.
            #
            # auth = request.headers.get("Authorization", "")
            # if not auth.startswith("Bearer "):
            #     return _fail_and_clear_cookie("Unauthorized", status=401)
            #
            # token = auth.replace("Bearer ", "", 1).strip()
            # try:
            #     data = decode_access_token(token)
            # except Exception:
            #     return _fail_and_clear_cookie("Invalid or expired token", status=401)
            #
            # user = {
            #     "id": data.get("sub"),
            #     "role": data.get("role"),
            #     "email": data.get("email"),
            # }
            # if not user["id"] or not user["role"]:
            #     return _fail_and_clear_cookie("Invalid token payload", status=401)
            #
            # if roles_set and user["role"] not in roles_set:
            #     return fail("Forbidden", status=403)
            #
            # request.user_ctx = user
            # return fn(viewself, request, *args, **kwargs)

            # ==========================================================
            # If you are NOT using JWT fallback, keep this:
            # ==========================================================
            