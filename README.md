# Task Management System

A full-stack **Task Management System** built using **React + TypeScript + Vite** on the frontend and **Django REST Framework + PostgreSQL** on the backend.

The system supports authentication, role-based access, task management, file attachments, comments, notifications, audit logs, authentication activity tracking, and email-based workflows.

---

# Features

## Authentication

* Session-based authentication using cookies
* Optional JWT utilities available in backend
* Login / Logout
* Google OAuth login
* Email verification
* Forgot password / Reset password
* Password constraints enforcement

## Task Management

* Create tasks
* Update tasks
* Delete tasks
* Assign tasks
* Task status updates
* Role-based task visibility

## Comments

* Add comments
* Edit comments
* Delete comments
* Permission-based editing

## Attachments

Supports **mixed file uploads in a single request**

Allowed formats:

* PDF
* PNG
* JPG / JPEG
* Docx

Example uploads:

* 1 PDF + 1 PNG
* 2 PNG + 1 JPG
* 3 PDFs

Max size per file: **10 MB**

## Admin Features

* User creation
* Task assignment
* Audit log monitoring
* Auth activity reports
* Chart dashboards
* Document email sending

## Notifications

* Task activity notifications
* System alerts

---

# Tech Stack

## Frontend

* React
* TypeScript
* Vite
* Axios
* React Router
* Chart.js

## Backend

* Django
* Django REST Framework
* PostgreSQL
* django-cors-headers
* Simple JWT (optional)

---

# Project Structure

```
TASK-MANAGEMENT-SYSTEM/
│
├── BACKEND/
│   ├── adminapp/
│   ├── authapp/
│   ├── backend/
│   ├── sql/
│   └── tasks/
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

# Backend Architecture

The backend follows a **layered architecture** to keep the code modular and scalable.

**views**
Handles request and response logic.

**serializers**
Responsible for validation and data transformation.

**services**
Contains business logic.

**repositories**
Handles database access and queries.

**selectors**
Used for read/query shaping.

**utils**
Shared helper utilities such as:

* database utilities
* authentication helpers
* email sending
* file uploads
* security hashing

---

# Frontend Architecture

The frontend is structured for scalability and maintainability.

**pages**
Screen-level UI components.

**components**
Reusable UI blocks.

**api**
Axios request layer.

**store**
Authentication state management.

**utils**
Helper utilities such as file download functions.

---

# Roles and Access

## ADMIN

* Create users
* Create tasks
* Assign tasks
* Update tasks
* View all tasks
* View audit logs
* Export auth activity reports
* Send documents
* Edit or delete any comment

## Users (Role A / Role B)

* View assigned tasks
* Create tasks
* Update allowed task fields
* Add, edit, or delete their own comments
* Download attachments

---

# Authentication Flow

The application currently uses **session-based authentication**.

### Session Flow

1. User logs in
2. Backend creates session
3. Browser stores session cookie
4. Protected API requests automatically send the cookie
5. Backend validates the session

JWT helpers are also available and the system can be extended to support **access and refresh token authentication**.

---

# Comment API

```
GET    /api/tasks/<task_id>/comments
POST   /api/tasks/<task_id>/comments
PATCH  /api/comments/<comment_id>
DELETE /api/comments/<comment_id>
```

---

# Setup

## 1. Clone Repository

```
git clone <your-repo-url>
cd TASK-MANAGEMENT-SYSTEM
```

---

# Backend Setup

```
cd BACKEND
python -m venv venv
```

Activate virtual environment

Windows:

```
venv\Scripts\activate
```

Mac / Linux:

```
source venv/bin/activate
```

Install dependencies

```
pip install -r requirements.txt
```

Configure environment variables in:

```
BACKEND/.env
```

Example:

```
DB_NAME=
DB_USER=
DB_PASSWORD=
EMAIL_HOST=
EMAIL_PASSWORD=
GOOGLE_CLIENT_ID=
SECRET_KEY=
```

Run database schema:

```
BACKEND/sql/sql_schema.sql
```

Run server:

```
python manage.py runserver
```

---

# Frontend Setup

```
cd frontend
npm install
npm run dev
```


# License

MIT License
