import os, secrets
from django.conf import settings
from backend.utils.mailer import send_pdf_attachment

MAX_PDF_BYTES = 10 * 1024 * 1024

def send_document(to_email: str, subject: str, body: str, uploaded_file) -> None:
    if not uploaded_file:
        raise ValueError("PDF file is required")

    if not uploaded_file.name.lower().endswith(".pdf"):
        raise ValueError("Only PDF files allowed")

    if uploaded_file.size > MAX_PDF_BYTES:
        raise ValueError("PDF too large (max 10MB).")

    temp_dir = os.path.join(settings.BASE_DIR, "media", "temp")
    os.makedirs(temp_dir, exist_ok=True)

    temp_path = os.path.join(temp_dir, f"{secrets.token_hex(8)}_{uploaded_file.name}")

    try:
        with open(temp_path, "wb+") as dest:
            for chunk in uploaded_file.chunks():
                dest.write(chunk)

        send_pdf_attachment(to_email=to_email, subject=subject, body=body, pdf_path=temp_path)

    finally:
        try:
            os.remove(temp_path)
        except:
            pass