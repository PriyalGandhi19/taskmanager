from typing import Any, Optional
from rest_framework.response import Response

def ok(data: Optional[dict[str, Any]] = None, message: str = "OK", status: int = 200):
    return Response({"success": True, "message": message, "data": data or {}}, status=status)

def fail(message: str, errors: Optional[dict[str, Any]] = None, status: int = 400):
    payload = {"success": False, "message": message}
    if errors:
        payload["errors"] = errors
    return Response(payload, status=status)
