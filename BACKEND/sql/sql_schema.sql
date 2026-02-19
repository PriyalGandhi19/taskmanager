-- =========================
-- Task Manager Schema (Raw SQL)
-- =========================

-- UUID generator (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('ADMIN', 'A', 'B')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- TASKS
-- =========================
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

CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- =========================
-- AUDIT LOG
-- =========================
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  UUID NULL,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- REFRESH TOKENS
-- =========================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_expires ON refresh_tokens(expires_at);

-- =========================
-- TRIGGER: updated_at
-- =========================
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_users_updated_at ON users;
CREATE TRIGGER t_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS t_tasks_updated_at ON tasks;
CREATE TRIGGER t_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at();

-- =========================
-- TRIGGER: audit tasks
-- =========================
CREATE OR REPLACE FUNCTION trg_audit_tasks()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
    VALUES (NEW.created_by, 'INSERT', 'tasks', NEW.id, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
    VALUES (
      NEW.created_by, 'UPDATE', 'tasks', NEW.id,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
    VALUES (OLD.created_by, 'DELETE', 'tasks', OLD.id, to_jsonb(OLD));
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

-- =========================
-- FUNCTION: user role
-- =========================
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

-- =========================
-- PROCEDURE: create user (ADMIN only)
-- =========================
CREATE OR REPLACE PROCEDURE sp_create_user(
  p_actor_id UUID,
  p_email TEXT,
  p_password_hash TEXT,
  p_role TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE actor_role TEXT;
BEGIN
  actor_role := fn_user_role(p_actor_id);

  IF actor_role IS NULL OR actor_role <> 'ADMIN' THEN
    RAISE EXCEPTION 'Only ADMIN can create users';
  END IF;

  IF p_role NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Invalid role (allowed: A, B)';
  END IF;

  INSERT INTO users(email, password_hash, role)
  VALUES (LOWER(TRIM(p_email)), p_password_hash, p_role);

  INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
  VALUES (
    p_actor_id, 'INSERT', 'users', NULL,
    jsonb_build_object('email', LOWER(TRIM(p_email)), 'role', p_role)
  );
END;
$$;

-- =========================
-- PROCEDURE: create task
-- ADMIN can assign p_owner_id
-- A/B are forced to create for themselves
-- =========================
CREATE OR REPLACE PROCEDURE sp_create_task(
  p_actor_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_status TEXT,
  p_owner_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE actor_role TEXT;
DECLARE final_owner UUID;
BEGIN
  actor_role := fn_user_role(p_actor_id);

  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'Invalid actor';
  END IF;

  IF p_status NOT IN ('PENDING', 'IN_PROGRESS', 'COMPLETED') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  IF actor_role = 'ADMIN' THEN
    IF p_owner_id IS NULL THEN
      RAISE EXCEPTION 'owner_id is required for ADMIN';
    END IF;
    final_owner := p_owner_id;
  ELSE
    final_owner := p_actor_id;
  END IF;

  INSERT INTO tasks(title, description, status, owner_id, created_by)
  VALUES (
    TRIM(p_title),
    COALESCE(p_description, ''),
    p_status,
    final_owner,
    p_actor_id
  );
END;
$$;

-- =========================
-- PROCEDURE: update task
-- ADMIN can update any
-- A/B only own tasks
-- =========================
CREATE OR REPLACE PROCEDURE sp_update_task(
  p_actor_id UUID,
  p_task_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE actor_role TEXT;
DECLARE task_owner UUID;
BEGIN
  actor_role := fn_user_role(p_actor_id);

  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'Invalid actor';
  END IF;

  IF p_status NOT IN ('PENDING', 'IN_PROGRESS', 'COMPLETED') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT owner_id INTO task_owner
  FROM tasks
  WHERE id = p_task_id;

  IF task_owner IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF actor_role <> 'ADMIN' AND task_owner <> p_actor_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE tasks
  SET title = TRIM(p_title),
      description = COALESCE(p_description, ''),
      status = p_status
  WHERE id = p_task_id;
END;
$$;

-- =========================
-- PROCEDURE: delete task
-- ADMIN can delete any
-- A/B only own tasks
-- =========================
CREATE OR REPLACE PROCEDURE sp_delete_task(
  p_actor_id UUID,
  p_task_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE actor_role TEXT;
DECLARE task_owner UUID;
BEGIN
  actor_role := fn_user_role(p_actor_id);

  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'Invalid actor';
  END IF;

  SELECT owner_id INTO task_owner
  FROM tasks
  WHERE id = p_task_id;

  IF task_owner IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF actor_role <> 'ADMIN' AND task_owner <> p_actor_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  DELETE FROM tasks WHERE id = p_task_id;
END;
$$;

-- =========================
-- FUNCTION: get tasks for user
-- ADMIN -> all tasks
-- A/B   -> own tasks
-- =========================
CREATE OR REPLACE FUNCTION fn_get_tasks_for_user(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  owner_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE r TEXT;
BEGIN
  r := fn_user_role(p_user_id);

  IF r = 'ADMIN' THEN
    RETURN QUERY
    SELECT t.id, t.title, t.description, t.status, t.owner_id, t.created_by, t.created_at, t.updated_at
    FROM tasks t
    ORDER BY t.updated_at DESC;

  ELSE
    RETURN QUERY
    SELECT t.id, t.title, t.description, t.status, t.owner_id, t.created_by, t.created_at, t.updated_at
    FROM tasks t
    WHERE t.owner_id = p_user_id
    ORDER BY t.updated_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- =========================
-- PASSWORD RESET TOKENS
-- =========================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_sha256  TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  used          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires ON password_reset_tokens(expires_at);


ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;


CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_sha256  TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  used          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evt_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_evt_expires ON email_verification_tokens(expires_at);


CREATE OR REPLACE PROCEDURE sp_update_task(
  p_actor_id UUID,
  p_task_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE actor_role TEXT;
DECLARE task_owner UUID;
DECLARE task_creator UUID;
BEGIN
  actor_role := fn_user_role(p_actor_id);

  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'Invalid actor';
  END IF;

  IF p_status NOT IN ('PENDING', 'IN_PROGRESS', 'COMPLETED') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT owner_id, created_by INTO task_owner, task_creator
  FROM tasks
  WHERE id = p_task_id;

  IF task_owner IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- ADMIN can update anything
  IF actor_role = 'ADMIN' THEN
    UPDATE tasks
    SET title = TRIM(p_title),
        description = COALESCE(p_description, ''),
        status = p_status
    WHERE id = p_task_id;
    RETURN;
  END IF;

  -- Non-admin: must be OWNER to do anything
  IF task_owner <> p_actor_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- OWNER but not CREATOR: can change only status
  IF task_creator <> p_actor_id THEN
    UPDATE tasks
    SET status = p_status
    WHERE id = p_task_id;
    RETURN;
  END IF;

  -- OWNER + CREATOR: can edit all
  UPDATE tasks
  SET title = TRIM(p_title),
      description = COALESCE(p_description, ''),
      status = p_status
  WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_delete_task(
  p_actor_id UUID,
  p_task_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE actor_role TEXT;
DECLARE task_owner UUID;
DECLARE task_creator UUID;
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

  -- Non-admin must be OWNER
  IF task_owner <> p_actor_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Rule 1: only CREATOR can delete
  IF task_creator <> p_actor_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  DELETE FROM tasks WHERE id = p_task_id;
END;
$$;

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
  can_edit_status BOOLEAN,
  can_edit_content BOOLEAN,
  can_delete BOOLEAN
) AS $$
DECLARE r TEXT;
BEGIN
  r := fn_user_role(p_user_id);

  IF r = 'ADMIN' THEN
    RETURN QUERY
    SELECT t.id, t.title, t.description, t.status, t.owner_id, t.created_by,
           t.created_at, t.updated_at,
           TRUE, TRUE, TRUE
    FROM tasks t
    ORDER BY t.updated_at DESC;
  ELSE
    RETURN QUERY
    SELECT t.id, t.title, t.description, t.status, t.owner_id, t.created_by,
           t.created_at, t.updated_at,
           (t.owner_id = p_user_id) as can_edit_status,
           (t.created_by = p_user_id) as can_edit_content,
           (t.created_by = p_user_id) as can_delete
    FROM tasks t
    WHERE t.owner_id = p_user_id
    ORDER BY t.updated_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql;

✅ 1️⃣ USERS – Add must_set_password
ALTER TABLE users
ADD COLUMN IF NOT EXISTS must_set_password BOOLEAN NOT NULL DEFAULT TRUE;

-- Optional: set existing users to not require reset
UPDATE users SET must_set_password = FALSE WHERE role IN ('ADMIN','A','B');

✅ 2️⃣ REFRESH TOKENS – Add SHA256 Column + Index
ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS token_sha256 TEXT;

CREATE INDEX IF NOT EXISTS idx_refresh_token_sha256
ON refresh_tokens(token_sha256);

-- Optional (recommended if no duplicates guaranteed)
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_token_sha256
-- ON refresh_tokens(token_sha256);

✅ 3️⃣ SET PASSWORD TOKENS TABLE (New Table)
CREATE TABLE IF NOT EXISTS set_password_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_sha256  TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  used          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spt_user_id
ON set_password_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_spt_expires
ON set_password_tokens(expires_at);

✅ 4️⃣ UPDATED PROCEDURE – sp_create_user
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
BEGIN
  actor_role := fn_user_role(p_actor_id);

  IF actor_role IS NULL OR actor_role <> 'ADMIN' THEN
    RAISE EXCEPTION 'Only ADMIN can create users';
  END IF;

  IF p_role NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Invalid role (allowed: A, B)';
  END IF;

  INSERT INTO users(email, password_hash, role, must_set_password)
  VALUES (LOWER(TRIM(p_email)), p_password_hash, p_role, TRUE)
  RETURNING id INTO new_user_id;

  INSERT INTO audit_log(actor_id, action, entity, entity_id, payload)
  VALUES (
    p_actor_id,
    'INSERT',
    'users',
    new_user_id,
    jsonb_build_object(
      'email', LOWER(TRIM(p_email)),
      'role', p_role
    )
  );
END;
$$;

DROP TABLE IF EXISTS refresh_tokens CASCADE;

CREATE TABLE refresh_tokens (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_sha256  TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);
