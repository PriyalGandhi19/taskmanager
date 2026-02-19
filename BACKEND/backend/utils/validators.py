import re
from typing import Optional

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

ALLOWED_TASK_STATUS = {"PENDING", "IN_PROGRESS", "COMPLETED"}
ALLOWED_CREATE_ROLES = {"A", "B"}

LOWER_RE = re.compile(r"[a-z]")
UPPER_RE = re.compile(r"[A-Z]")
DIGIT_RE = re.compile(r"\d")
SYMBOL_RE = re.compile(r"[^\w\s]")  # any symbol

def validate_email(email: str) -> Optional[str]:
    e = (email or "").strip().lower()
    if not e:
        return "Email is required."
    if not EMAIL_RE.match(e):
        return "Invalid email format."
    if len(e) > 255:
        return "Email too long."
    return None

def validate_password(pw: str) -> Optional[str]:
    p = pw or ""
    if len(p) < 8:
        return "Password must be at least 8 characters."
    if len(p) > 128:
        return "Password too long."
    if not LOWER_RE.search(p):
        return "Password must contain a lowercase letter."
    if not UPPER_RE.search(p):
        return "Password must contain an uppercase letter."
    if not DIGIT_RE.search(p):
        return "Password must contain a digit."
    if not SYMBOL_RE.search(p):
        return "Password must contain a symbol."
    return None

def validate_task_title(title: str) -> Optional[str]:
    t = (title or "").strip()
    if not t:
        return "Title is required."
    if len(t) < 3:
        return "Title must be at least 3 characters."
    if len(t) > 120:
        return "Title must be max 120 characters."
    return None

def validate_task_status(status: str) -> Optional[str]:
    s = (status or "").strip().upper()
    if s not in ALLOWED_TASK_STATUS:
        return "Invalid status. Use PENDING / IN_PROGRESS / COMPLETED."
    return None
