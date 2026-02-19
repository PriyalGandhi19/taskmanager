import os, secrets
from django.conf import settings

def save_task_pdf(uploaded_file) -> tuple[str, str, int]:
    """
    Returns (absolute_path, storage_name, size_bytes)
    """
    base_dir = os.path.join(settings.MEDIA_ROOT, "task_pdfs")
    os.makedirs(base_dir, exist_ok=True)

    storage_name = f"{secrets.token_hex(16)}.pdf"
    abs_path = os.path.join(base_dir, storage_name)

    with open(abs_path, "wb+") as dest:
        for chunk in uploaded_file.chunks():
            dest.write(chunk)

    return abs_path, storage_name, uploaded_file.size
