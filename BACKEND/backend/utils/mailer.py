from django.conf import settings
from django.core.mail import send_mail
from django.core.mail import EmailMessage
import os
import smtplib


def send_welcome_email(to_email: str):
    subject = "Welcome to Task Manager"
    body = (
        "Hi,\n\n"
        "Welcome! Your Task Manager account has been created.\n\n"
        "You can login using your email and the password provided by Admin.\n\n"
        "Thanks,\nTeam"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email], fail_silently=False)

def send_reset_password_email(to_email: str, reset_link: str, minutes: int):
    subject = "Reset your password"
    body = (
        "Hi,\n\n"
        "We received a request to reset your password.\n\n"
        f"Reset link (valid for {minutes} minutes):\n{reset_link}\n\n"
        "If you didn't request this, ignore this email.\n\n"
        "Thanks,\nTeam"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email], fail_silently=False)



def send_verification_email(to_email: str, verify_link: str, minutes: int):
    subject = "Verify your email"
    body = (
        "Hi,\n\n"
        "Welcome to Task Manager!\n\n"
        f"Please verify your email (valid for {minutes} minutes):\n{verify_link}\n\n"
        "If you didn't create this account, ignore this email.\n\n"
        "Thanks,\nTeam"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email], fail_silently=False)

def send_pdf_attachment(
    to_email: str,
    subject: str,
    body: str,
    pdf_path: str
):
    """
    Sends an email with PDF attachment
    """

    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )

    # attach pdf from server path
    email.attach_file(pdf_path)

    email.send(fail_silently=False)
    

def _smtp_send(msg: EmailMessage):
    # Gmail SMTP example
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.send_message(msg)



def send_task_assigned_email(to_email: str, task_title: str, task_desc: str, task_status: str, pdf_path: str | None = None):
    subject = f"New Task Assigned: {task_title}"

    body = f"""
Hello,

You have been assigned a new task.

Title: {task_title}
Status: {task_status}

Description:
{task_desc}

Thanks,
Task Manager
""".strip()

    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )

    # Optional PDF attachment
    if pdf_path:
        email.attach_file(pdf_path)

    email.send(fail_silently=False)

def send_set_password_email(to_email: str, link: str, minutes: int):
    subject = "Set your password"
    body = (
        "Hi,\n\n"
        "Your email has been verified.\n\n"
        f"Please set your password (valid for {minutes} minutes):\n{link}\n\n"
        "Thanks,\nTeam"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email], fail_silently=False)
