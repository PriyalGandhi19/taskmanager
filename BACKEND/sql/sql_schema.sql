-- ============================================================
-- TASK MANAGER - FINAL CONSOLIDATED SQL (LATEST)
-- PostgreSQL - Single Reference File
-- ============================================================

-- 0) EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1) USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('ADMIN', 'A', 'B')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Latest fields (kept right next to users)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_set_password BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- ============================================================
-- 2) TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'PENDING'
              CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Latest fields (kept right next to tasks)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'MEDIUM'
  CHECK (priority IN ('LOW','MEDIUM','HIGH'));

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL;

-- Indexes (latest)
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id    ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date    ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority    ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at  ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_by  ON tasks(updated_by);
CREATE INDEX IF NOT EXISTS idx_tasks_title_lower ON tasks (LOWER(title));

-- ============================================================
-- 3) AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  UUID NULL,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity_created ON audit_log(entity, created_at);

-- ============================================================
-- 4) REFRESH TOKENS (LATEST = token_sha256)
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_sha256 TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_user         ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_expires      ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_token_sha256 ON refresh_tokens(token_sha256);

-- ============================================================
-- 5) PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_sha256 TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires ON password_reset_tokens(expires_at);

-- ============================================================
-- 6) EMAIL VERIFICATION TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_sha256 TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evt_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_evt_expires ON email_verification_tokens(expires_at);

-- ============================================================
-- 7) SET PASSWORD TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS set_password_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_sha256 TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spt_user_id ON set_password_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_spt_expires ON set_password_tokens(expires_at);

-- ============================================================
-- 8) TASK ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS task_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  storage_name  TEXT NOT NULL,
  content_type  TEXT NOT NULL DEFAULT 'application/pdf',
  size_bytes    BIGINT NOT NULL DEFAULT 0,
  uploaded_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);

-- ============================================================
-- 9) TASK COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS task_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_edited  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- ============================================================
-- 10) NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id      UUID NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('ASSIGNED','STATUS','DEADLINE','COMMENT')),
  message      TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ============================================================
-- 11) TRIGGER: updated_at (reusable)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users updated_at
DROP TRIGGER IF EXISTS t_users_updated_at ON users;
CREATE TRIGGER t_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();

-- tasks updated_at
DROP TRIGGER IF EXISTS t_tasks_updated_at ON tasks;
CREATE TRIGGER t_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();

-- comments updated_at
DROP TRIGGER IF EXISTS t_task_comments_updated_at ON task_comments;
CREATE TRIGGER t_task_comments_updated_at
BEFORE UPDATE ON task_comments
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================
-- 12) TRIGGERS: Audit
-- ============================================================

-- 12.1 TASKS audit (correct UPDATE actor via updated_by)
CREATE OR REPLACE FUNCTION trg_audit_tasks()
RETURNS TRIGGER AS $$
DECLARE actor UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    actor := NEW.created_by;

    INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
    VALUES (actor, 'INSERT', 'tasks', NEW.id, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    actor := COALESCE(NEW.updated_by, NEW.created_by);

    INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
    VALUES (
      actor, 'UPDATE', 'tasks', NEW.id,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    actor := OLD.created_by;

    INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
    VALUES (actor, 'DELETE', 'tasks', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_audit_tasks ON tasks;
CREATE TRIGGER t_audit_tasks
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trg_audit_tasks();

-- 12.2 TASK COMMENTS audit
CREATE OR REPLACE FUNCTION trg_audit_task_comments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
    VALUES (NEW.user_id, 'INSERT', 'task_comments', NEW.id, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
    VALUES (
      NEW.user_id, 'UPDATE', 'task_comments', NEW.id,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
    VALUES (OLD.user_id, 'DELETE', 'task_comments', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_audit_task_comments ON task_comments;
CREATE TRIGGER t_audit_task_comments
AFTER INSERT OR UPDATE OR DELETE ON task_comments
FOR EACH ROW
EXECUTE FUNCTION trg_audit_task_comments();

-- 12.3 ATTACHMENTS audit (insert/delete)
CREATE OR REPLACE FUNCTION trg_audit_task_attachments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
    VALUES (NEW.uploaded_by, 'INSERT', 'task_attachments', NEW.id, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
    VALUES (OLD.uploaded_by, 'DELETE', 'task_attachments', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_audit_task_attachments ON task_attachments;
CREATE TRIGGER t_audit_task_attachments
AFTER INSERT OR DELETE ON task_attachments
FOR EACH ROW
EXECUTE FUNCTION trg_audit_task_attachments();

-- ============================================================
-- 13) FUNCTION: user role (active users only)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_user_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE r TEXT;
BEGIN
  SELECT role INTO r
  FROM users
  WHERE id = p_user_id AND is_active = TRUE;

  RETURN r;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 14) PROCEDURE: create user (ADMIN only) - LATEST
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_create_user(
  p_actor_id UUID,
  p_email TEXT,
  p_password_hash TEXT,
  p_role TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  actor_role TEXT;
  new_user_id UUID;
  clean_email TEXT;
BEGIN
  actor_role := fn_user_role(p_actor_id);

  IF actor_role IS NULL OR actor_role <> 'ADMIN' THEN
    RAISE EXCEPTION 'Only ADMIN can create users';
  END IF;

  IF p_role NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Invalid role (allowed: A, B)';
  END IF;

  clean_email := LOWER(TRIM(p_email));

  INSERT INTO users(email, password_hash, role, must_set_password)
  VALUES (clean_email, p_password_hash, p_role, TRUE)
  RETURNING id INTO new_user_id;

  INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
  VALUES (
    p_actor_id,
    'INSERT',
    'users',
    new_user_id,
    jsonb_build_object('email', clean_email, 'role', p_role)
  );
END;
$$;

-- ============================================================
-- 15) FUNCTION: create task (returns UUID) - LATEST
-- ============================================================
CREATE OR REPLACE FUNCTION fn_create_task(
  p_actor_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_status TEXT,
  p_owner_id UUID,
  p_due_date TIMESTAMPTZ,
  p_priority TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  actor_role TEXT;
  final_owner UUID;
  new_task_id UUID;
  final_priority TEXT;
BEGIN
  actor_role := fn_user_role(p_actor_id);
  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'Invalid actor';
  END IF;

  IF p_status NOT IN ('PENDING','IN_PROGRESS','COMPLETED') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  final_priority := COALESCE(p_priority, 'MEDIUM');
  IF final_priority NOT IN ('LOW','MEDIUM','HIGH') THEN
    RAISE EXCEPTION 'Invalid priority';
  END IF;

  IF actor_role = 'ADMIN' THEN
    IF p_owner_id IS NULL THEN
      RAISE EXCEPTION 'owner_id is required for ADMIN';
    END IF;
    final_owner := p_owner_id;
  ELSE
    final_owner := p_actor_id;
  END IF;

  INSERT INTO tasks(
    title, description, status,
    owner_id, created_by, updated_by,
    due_date, priority, completed_at
  )
  VALUES (
    TRIM(p_title),
    COALESCE(p_description,''),
    p_status,
    final_owner,
    p_actor_id,
    p_actor_id,
    p_due_date,
    final_priority,
    CASE WHEN p_status='COMPLETED' THEN NOW() ELSE NULL END
  )
  RETURNING id INTO new_task_id;

  RETURN new_task_id;
END;
$$;

-- Optional wrapper procedure if you still prefer CALL
CREATE OR REPLACE PROCEDURE sp_create_task(
  p_actor_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_status TEXT,
  p_owner_id UUID,
  p_due_date TIMESTAMPTZ,
  p_priority TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE new_id UUID;
BEGIN
  new_id := fn_create_task(p_actor_id, p_title, p_description, p_status, p_owner_id, p_due_date, p_priority);
END;
$$;

-- ============================================================
-- 16) PROCEDURE: update task (LATEST permission rules)
-- - ADMIN: can update all fields
-- - Non-admin must be OWNER
-- - OWNER but not CREATOR: only status
-- - OWNER + CREATOR: all fields
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_update_task(
  p_actor_id UUID,
  p_task_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_status TEXT,
  p_due_date TIMESTAMPTZ,
  p_priority TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  actor_role TEXT;
  task_owner UUID;
  task_creator UUID;
  final_priority TEXT;
BEGIN
  actor_role := fn_user_role(p_actor_id);
  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'Invalid actor';
  END IF;

  IF p_status NOT IN ('PENDING','IN_PROGRESS','COMPLETED') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  final_priority := COALESCE(p_priority, 'MEDIUM');
  IF final_priority NOT IN ('LOW','MEDIUM','HIGH') THEN
    RAISE EXCEPTION 'Invalid priority';
  END IF;

  SELECT owner_id, created_by INTO task_owner, task_creator
  FROM tasks
  WHERE id = p_task_id;

  IF task_owner IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- completed_at logic (keep consistent)
  -- If completed -> set if null, else keep existing time
  -- If not completed -> clear
  IF actor_role = 'ADMIN' THEN
    UPDATE tasks
    SET title = TRIM(p_title),
        description = COALESCE(p_description,''),
        status = p_status,
        due_date = p_due_date,
        priority = final_priority,
        completed_at = CASE
          WHEN p_status='COMPLETED' THEN COALESCE(completed_at, NOW())
          ELSE NULL
        END,
        updated_by = p_actor_id
    WHERE id = p_task_id;
    RETURN;
  END IF;

  IF task_owner <> p_actor_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF task_creator <> p_actor_id THEN
    UPDATE tasks
    SET status = p_status,
        completed_at = CASE
          WHEN p_status='COMPLETED' THEN COALESCE(completed_at, NOW())
          ELSE NULL
        END,
        updated_by = p_actor_id
    WHERE id = p_task_id;
    RETURN;
  END IF;

  UPDATE tasks
  SET title = TRIM(p_title),
      description = COALESCE(p_description,''),
      status = p_status,
      due_date = p_due_date,
      priority = final_priority,
      completed_at = CASE
        WHEN p_status='COMPLETED' THEN COALESCE(completed_at, NOW())
        ELSE NULL
      END,
      updated_by = p_actor_id
  WHERE id = p_task_id;
END;
$$;

-- ============================================================
-- 17) PROCEDURE: delete task (LATEST permission rules)
-- - ADMIN: can delete any
-- - Non-admin: must be OWNER + CREATOR
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_delete_task(
  p_actor_id UUID,
  p_task_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  actor_role TEXT;
  task_owner UUID;
  task_creator UUID;
BEGIN
  actor_role := fn_user_role(p_actor_id);
  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'Invalid actor';
  END IF;

  SELECT owner_id, created_by INTO task_owner, task_creator
  FROM tasks
  WHERE id = p_task_id;

  IF task_owner IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF actor_role = 'ADMIN' THEN
    DELETE FROM tasks WHERE id = p_task_id;
    RETURN;
  END IF;

  IF task_owner <> p_actor_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF task_creator <> p_actor_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  DELETE FROM tasks WHERE id = p_task_id;
END;
$$;

-- ============================================================
-- 18) FUNCTION: get tasks for user (LATEST with permission flags + new columns)
-- ============================================================
DROP FUNCTION IF EXISTS fn_get_tasks_for_user(UUID);

CREATE OR REPLACE FUNCTION fn_get_tasks_for_user(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  owner_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  priority TEXT,
  completed_at TIMESTAMPTZ,
  can_edit_status BOOLEAN,
  can_edit_content BOOLEAN,
  can_delete BOOLEAN
) AS $$
DECLARE r TEXT;
BEGIN
  r := fn_user_role(p_user_id);

  IF r = 'ADMIN' THEN
    RETURN QUERY
    SELECT
      t.id, t.title, t.description, t.status,
      t.owner_id, t.created_by,
      t.created_at, t.updated_at,
      t.due_date, t.priority, t.completed_at,
      TRUE, TRUE, TRUE
    FROM tasks t
    ORDER BY t.updated_at DESC;

  ELSE
    RETURN QUERY
    SELECT
      t.id, t.title, t.description, t.status,
      t.owner_id, t.created_by,
      t.created_at, t.updated_at,
      t.due_date, t.priority, t.completed_at,
      (t.owner_id = p_user_id) AS can_edit_status,
      (t.created_by = p_user_id) AS can_edit_content,
      (t.created_by = p_user_id) AS can_delete
    FROM tasks t
    WHERE t.owner_id = p_user_id
    ORDER BY t.updated_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 19) FUNCTION: task summary (optional)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_task_summary_for_user(p_user_id UUID)
RETURNS TABLE(
  total BIGINT,
  pending BIGINT,
  in_progress BIGINT,
  completed BIGINT,
  completion_pct NUMERIC
) AS $$
DECLARE r TEXT;
BEGIN
  r := fn_user_role(p_user_id);

  IF r = 'ADMIN' THEN
    RETURN QUERY
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE status='PENDING')::bigint AS pending,
      COUNT(*) FILTER (WHERE status='IN_PROGRESS')::bigint AS in_progress,
      COUNT(*) FILTER (WHERE status='COMPLETED')::bigint AS completed,
      CASE WHEN COUNT(*)=0 THEN 0
           ELSE ROUND((COUNT(*) FILTER (WHERE status='COMPLETED')::numeric * 100) / COUNT(*), 2)
      END AS completion_pct
    FROM tasks;

  ELSE
    RETURN QUERY
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE status='PENDING')::bigint AS pending,
      COUNT(*) FILTER (WHERE status='IN_PROGRESS')::bigint AS in_progress,
      COUNT(*) FILTER (WHERE status='COMPLETED')::bigint AS completed,
      CASE WHEN COUNT(*)=0 THEN 0
           ELSE ROUND((COUNT(*) FILTER (WHERE status='COMPLETED')::numeric * 100) / COUNT(*), 2)
      END AS completion_pct
    FROM tasks
    WHERE owner_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- AUTH ACTIVITY (LOGIN/LOGOUT REPORT)
-- =========================
CREATE TABLE IF NOT EXISTS auth_activity (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  email      TEXT NOT NULL,  -- filter fast, even if user deleted
  event      TEXT NOT NULL CHECK (event IN ('LOGIN','LOGOUT','FAILED_LOGIN')),
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  success    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_activity_email_lower ON auth_activity (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_auth_activity_created_at ON auth_activity (created_at);
CREATE INDEX IF NOT EXISTS idx_auth_activity_event ON auth_activity (event);

ALTER TABLE auth_activity
ADD COLUMN IF NOT EXISTS role TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_auth_activity_role ON auth_activity(role);