import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env (same folder as manage.py)
load_dotenv(BASE_DIR / ".env")

# =========================
# CORE SETTINGS
# =========================

SECRET_KEY = os.getenv("SECRET_KEY", "unsafe-default-secret-key")

DEBUG = os.getenv("DEBUG", "False") == "True"

# allow: "*" or comma separated list
_raw_hosts = os.getenv("ALLOWED_HOSTS", "")
ALLOWED_HOSTS = ["*"] if _raw_hosts.strip() == "*" else [h.strip() for h in _raw_hosts.split(",") if h.strip()]

# =========================
# APPLICATIONS
# =========================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "corsheaders",

    # Your apps
    "authapp",
    "adminapp",
    "tasks",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# =========================
# DATABASE
# =========================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "postgres"),
        "USER": os.getenv("DB_USER", "postgres"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}

# =========================
# PASSWORD VALIDATION
# =========================

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# =========================
# INTERNATIONALIZATION
# =========================

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# =========================
# STATIC & MEDIA
# =========================

STATIC_URL = "static/"

MEDIA_ROOT = BASE_DIR / "media"
MEDIA_URL = "/media/"

# =========================
# REST FRAMEWORK
# =========================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
}

# =========================
# JWT CONFIG
# =========================

JWT_ACCESS_MINUTES = int(os.getenv("JWT_ACCESS_MINUTES", 15))
JWT_REFRESH_DAYS = int(os.getenv("JWT_REFRESH_DAYS", 7))

# =========================
# CORS
# =========================

CORS_ALLOW_ALL_ORIGINS = True

# =========================
# EMAIL (SMTP)
# =========================

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"

EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "Task Manager <no-reply@example.com>")

# =========================
# FRONTEND URLS + TOKENS
# =========================

FRONTEND_VERIFY_URL = os.getenv("FRONTEND_VERIFY_URL", "http://localhost:5173/verify-email")
FRONTEND_RESET_URL = os.getenv("FRONTEND_RESET_URL", "http://localhost:5173/reset-password")
FRONTEND_SET_PASSWORD_URL = os.getenv("FRONTEND_SET_PASSWORD_URL", "http://localhost:5173/set-password")

VERIFY_TOKEN_MINUTES = int(os.getenv("VERIFY_TOKEN_MINUTES", 60))
RESET_TOKEN_MINUTES = int(os.getenv("RESET_TOKEN_MINUTES", 15))
SET_PASSWORD_MINUTES = int(os.getenv("SET_PASSWORD_MINUTES", 60))

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")