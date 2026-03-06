import os
import re
from django.conf import settings
from django.utils.text import slugify

MAX_BASE_LEN = 80
ALLOWED_EXTS = {".pdf", ".docx", ".png", ".jpg", ".jpeg", ".webp"}


def _truncate(s: str, n: int) -> str:
    s = (s or "").strip()
    return s[:n].rstrip() if len(s) > n else s


def _next_available_name(base_dir: str, base: str, ext: str) -> str:
    """
    base.ext, base(1).ext, base(2).ext ...
    """
    candidate = f"{base}{ext}"
    counter = 1
    while os.path.exists(os.path.join(base_dir, candidate)):
        candidate = f"{base}({counter}){ext}"
        counter += 1
    return candidate


def save_task_attachment(uploaded_file, preferred_name: str | None = None) -> tuple[str, str, int]:
    """
    Saves to MEDIA_ROOT/task_attachments/
    Returns (absolute_path, storage_name, size_bytes)

    storage_name becomes:
      <slug>.<ext>, <slug>(1).<ext>, <slug>(2).<ext> ...
    """
    base_dir = os.path.join(settings.MEDIA_ROOT, "task_attachments")
    os.makedirs(base_dir, exist_ok=True)

    original_name = getattr(uploaded_file, "name", "document")
    original_stem, ext = os.path.splitext(original_name)
    ext = (ext or "").lower()

    if ext not in ALLOWED_EXTS:
        raise ValueError("Allowed files: PDF, DOCX, PNG, JPG/JPEG, WEBP")

    # base name comes from preferred_name OR original stem (without extension)
    base_raw = preferred_name or original_stem or "document"

    base_slug = slugify(base_raw) or "document"
    base_slug = re.sub(r"-{2,}", "-", base_slug)
    base_slug = _truncate(base_slug, MAX_BASE_LEN)

    storage_name = _next_available_name(base_dir, base_slug, ext)
    abs_path = os.path.join(base_dir, storage_name)

    with open(abs_path, "wb+") as dest:
        for chunk in uploaded_file.chunks():
            dest.write(chunk)

    size_bytes = os.path.getsize(abs_path)
    return abs_path, storage_name, size_bytes