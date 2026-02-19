from django.core.management.base import BaseCommand, CommandError
from backend.utils.db import fetch_one, execute
from backend.utils.security import hash_password
from backend.utils.validators import validate_email, validate_password

class Command(BaseCommand):
    help = "Create the first ADMIN user (bcrypt hashed)."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        email = options["email"]
        password = options["password"]

        errors = {}
        eerr = validate_email(email)
        perr = validate_password(password)
        if eerr: errors["email"] = eerr
        if perr: errors["password"] = perr
        if errors:
            raise CommandError(str(errors))

        email = email.strip().lower()

        existing = fetch_one("SELECT id FROM users WHERE email=%s;", [email])
        if existing:
            raise CommandError("User already exists with this email.")

        ph = hash_password(password)

        execute(
            "INSERT INTO users(email, password_hash, role) VALUES (%s, %s, 'ADMIN');",
            [email, ph],
        )

        self.stdout.write(self.style.SUCCESS(f"✅ ADMIN created: {email}"))
