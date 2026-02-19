import secrets
from datetime import datetime, timedelta, timezone
import jwt
from django.conf import settings

JWT_ALG = "HS256"

def _now() -> datetime:
    return datetime.now(timezone.utc)

def make_access_token(user_id: str, role: str, email: str) -> str:
    exp = _now() + timedelta(minutes=settings.JWT_ACCESS_MINUTES)
    payload = {
        "sub": user_id,
        "role": role,
        "email": email,
        "type": "access",
        "exp": exp,
        "iat": _now(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALG)

def decode_access_token(token: str) -> dict:
    data = jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALG])
    if data.get("type") != "access":
        raise jwt.InvalidTokenError("Invalid token type")
    return data

def make_refresh_token() -> str:
    return secrets.token_urlsafe(48)

def refresh_expiry() -> datetime:
    return _now() + timedelta(days=settings.JWT_REFRESH_DAYS)
