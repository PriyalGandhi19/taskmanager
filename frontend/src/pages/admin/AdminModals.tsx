import type { Dispatch, SetStateAction } from "react";
import { Formik, Form } from "formik";
import Modal from "../../components/Modal";
import StatusChips from "../../components/StatusChips";
import type { Task, TaskPriority, TaskStatus, TaskComment } from "../../api/tasks";
import type { UserRow } from "./useAdminDashboard";
import CommentsSection from "../../components/CommentsSection";
import { useAuth } from "../../store/authStore";

import { createUserSchema } from "../../validations/userSchemas";
import { adminCreateTaskSchema } from "../../validations/taskSchemas";
import { sendDocumentSchema } from "../../validations/documentSchemas";

export function CreateUserModal({
  open,
  onClose,
  newUser,
  setNewUser,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  newUser: { email: string; role: "A" | "B" };
  setNewUser: Dispatch<SetStateAction<{ email: string; role: "A" | "B" }>>;
  onSubmit: () => Promise<void>;
}) {
  return (
    <Modal open={open} title="Create User (A/B)" onClose={onClose}>
      <Formik
        enableReinitialize
        initialValues={newUser}
        validationSchema={createUserSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setNewUser(values);
          try {
            await onSubmit();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
          <Form className="form">
            <label>Email</label>
            <input
              name="email"
              value={values.email}
              onChange={(e) => {
                handleChange(e);
                setNewUser((p) => ({ ...p, email: e.target.value }));
              }}
              onBlur={handleBlur}
            />
            {touched.email && errors.email && (
              <div className="fieldErr">{errors.email}</div>
            )}

            <label>Role</label>
            <select
              name="role"
              value={values.role}
              onChange={(e) => {
                handleChange(e);
                setNewUser((p) => ({ ...p, role: e.target.value as "A" | "B" }));
              }}
              onBlur={handleBlur}
            >
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
            {touched.role && errors.role && (
              <div className="fieldErr">{errors.role}</div>
            )}

            <div className="muted small" style={{ marginTop: 8 }}>
              User will receive email verification link and then set password.
            </div>

            <button className="btn primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}

export function CreateTaskModal({
  open,
  onClose,
  taskForm,
  setTaskForm,
  usersAB,
  taskFiles,
  setTaskFiles,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;

  taskForm: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string;
    owner_id: string;
  };

  setTaskForm: Dispatch<
    SetStateAction<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      due_date: string;
      owner_id: string;
    }>
  >;

  usersAB: UserRow[];
  taskFiles: File[];
  setTaskFiles: Dispatch<SetStateAction<File[]>>;
  onSubmit: () => Promise<void>;
}) {
  return (
    <Modal open={open} title="Create Task (Assign to A/B)" onClose={onClose}>
      <Formik
        enableReinitialize
        initialValues={{
          ...taskForm,
          files: taskFiles,
        }}
        validationSchema={adminCreateTaskSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setTaskForm({
            title: values.title,
            description: values.description,
            status: values.status,
            priority: values.priority,
            due_date: values.due_date,
            owner_id: values.owner_id,
          });

          setTaskFiles(values.files || []);

          try {
            await onSubmit();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          setFieldValue,
          isSubmitting,
        }) => (
          <Form className="form">
            <label>Title</label>
            <input
              name="title"
              value={values.title}
              onChange={(e) => {
                handleChange(e);
                setTaskForm((p) => ({ ...p, title: e.target.value }));
              }}
              onBlur={handleBlur}
              placeholder="Min 3 characters"
            />
            {touched.title && errors.title && (
              <div className="fieldErr">{errors.title}</div>
            )}

            <label>Description</label>
            <textarea
              name="description"
              value={values.description}
              onChange={(e) => {
                handleChange(e);
                setTaskForm((p) => ({ ...p, description: e.target.value }));
              }}
              onBlur={handleBlur}
              placeholder="Min 5 characters"
            />
            {touched.description && errors.description && (
              <div className="fieldErr">{errors.description}</div>
            )}

            <label>Status</label>
            <StatusChips
              value={values.status}
              onChange={(s) => {
                setFieldValue("status", s);
                setTaskForm((p) => ({ ...p, status: s }));
              }}
            />
            {touched.status && errors.status && (
              <div className="fieldErr">{errors.status as string}</div>
            )}

            <label>Priority</label>
            <select
              name="priority"
              value={values.priority}
              onChange={(e) => {
                handleChange(e);
                setTaskForm((p) => ({
                  ...p,
                  priority: e.target.value as TaskPriority,
                }));
              }}
              onBlur={handleBlur}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            {touched.priority && errors.priority && (
              <div className="fieldErr">{errors.priority}</div>
            )}

            <label>Due Date</label>
            <input
              type="date"
              name="due_date"
              value={values.due_date || ""}
              onChange={(e) => {
                handleChange(e);
                setTaskForm((p) => ({ ...p, due_date: e.target.value }));
              }}
              onBlur={handleBlur}
            />
            {touched.due_date && errors.due_date && (
              <div className="fieldErr">{errors.due_date}</div>
            )}

            <label>Assign To (Owner)</label>
            <select
              name="owner_id"
              value={values.owner_id}
              onChange={(e) => {
                handleChange(e);
                setTaskForm((p) => ({ ...p, owner_id: e.target.value }));
              }}
              onBlur={handleBlur}
            >
              <option value="">-- Select user --</option>
              {usersAB.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email} ({u.role})
                </option>
              ))}
            </select>
            {touched.owner_id && errors.owner_id && (
              <div className="fieldErr">{errors.owner_id}</div>
            )}

            <label>Optional Attachments (PDF / DOCX / Images)</label>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,image/*"
              onChange={(e) => {
                const newFiles = Array.from(e.target.files || []);

                const merged = [...(values.files || []), ...newFiles];

                const unique = merged.filter(
                  (file, index, arr) =>
                    index ===
                    arr.findIndex((f) => f.name === file.name && f.size === file.size)
                );

                const limited = unique.slice(0, 3);

                setFieldValue("files", limited);
                setTaskFiles(limited);

                e.target.value = "";
              }}
            />
            {errors.files && (
              <div className="fieldErr">{errors.files as string}</div>
            )}

            {(values.files?.length ?? 0) > 0 && (
              <div className="muted small">
                Selected:
                <ul style={{ marginTop: 6 }}>
                  {values.files.map((f: File, idx: number) => (
                    <li
                      key={`${f.name}-${idx}`}
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <span>{f.name}</span>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          const updated = values.files.filter((_: File, i: number) => i !== idx);
                          setFieldValue("files", updated);
                          setTaskFiles(updated);
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button className="btn primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Task"}
            </button>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}

export function EditTaskModal({
  open,
  mode,
  onClose,
  editTask,
  editForm,
  setEditForm,
  onSubmit,
  comments,
  commentsLoading,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: {
  open: boolean;
  mode: "VIEW" | "COMMENT" | "EDIT";
  onClose: () => void;
  editTask: Task | null;

  editForm: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string;
  };

  setEditForm: Dispatch<
    SetStateAction<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      due_date: string;
    }>
  >;

  onSubmit: () => Promise<void>;
  comments: TaskComment[];
  commentsLoading: boolean;
  onAddComment: (text: string) => Promise<void>;
  onEditComment: (commentId: string, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}) {
  const { user } = useAuth();

  const isView = mode === "VIEW";
  const isComment = mode === "COMMENT";
  const isEdit = mode === "EDIT";

  const canEditContent = isEdit && (editTask?.can_edit_content ?? false);
  const canEditStatus = isEdit && (editTask?.can_edit_status ?? false);

  const title = isView ? "View Task" : isComment ? "Add Comment" : "Edit Task";

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="form">
        {!isComment && (
          <>
            <label>Title</label>
            <input
              value={editForm.title}
              disabled={!canEditContent}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, title: e.target.value }))
              }
            />

            <label>Description</label>
            <textarea
              value={editForm.description}
              disabled={!canEditContent}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, description: e.target.value }))
              }
            />

            <label>Status</label>
            <StatusChips
              value={editForm.status}
              disabled={!canEditStatus}
              onChange={(s) => setEditForm((p) => ({ ...p, status: s }))}
            />

            <label>Priority</label>
            <select
              value={editForm.priority}
              disabled={!canEditContent}
              onChange={(e) =>
                setEditForm((p) => ({
                  ...p,
                  priority: e.target.value as TaskPriority,
                }))
              }
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>

            <label>Due Date</label>
            <input
              type="date"
              value={editForm.due_date || ""}
              disabled={!canEditContent}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, due_date: e.target.value }))
              }
            />
          </>
        )}

        {commentsLoading ? (
          <div className="muted">Loading comments...</div>
        ) : (
          <CommentsSection
            comments={comments}
            currentUserId={user?.id}
            currentUserEmail={user?.email}
            currentUserRole={user?.role}
            onAdd={onAddComment}
            onEdit={onEditComment}
            onDelete={onDeleteComment}
          />
        )}

        {isEdit && (
          <button
            className="btn primary"
            onClick={onSubmit}
            disabled={!canEditStatus}
          >
            Save Changes
          </button>
        )}

        {isView && (
          <div className="muted small" style={{ marginTop: 10 }}>
            This is view-only.
          </div>
        )}
      </div>
    </Modal>
  );
}

export function SendDocModal({
  open,
  onClose,
  docForm,
  setDocForm,
  docFile,
  setDocFile,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  docForm: { to_email: string; subject: string; body: string };
  setDocForm: Dispatch<
    SetStateAction<{ to_email: string; subject: string; body: string }>
  >;
  docFile: File | null;
  setDocFile: (f: File | null) => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <Modal open={open} title="Send Document via Email (max 10MB)" onClose={onClose}>
      <Formik
        enableReinitialize
        initialValues={{
          ...docForm,
          file: docFile,
        }}
        validationSchema={sendDocumentSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setDocForm({
            to_email: values.to_email,
            subject: values.subject,
            body: values.body,
          });
          setDocFile(values.file || null);

          try {
            await onSubmit();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
          <Form className="form">
            <label>To Email</label>
            <input
              name="to_email"
              value={values.to_email}
              onChange={(e) => {
                handleChange(e);
                setDocForm((p) => ({ ...p, to_email: e.target.value }));
              }}
              onBlur={handleBlur}
            />
            {touched.to_email && errors.to_email && (
              <div className="fieldErr">{errors.to_email}</div>
            )}

            <label>Subject</label>
            <input
              name="subject"
              value={values.subject}
              onChange={(e) => {
                handleChange(e);
                setDocForm((p) => ({ ...p, subject: e.target.value }));
              }}
              onBlur={handleBlur}
            />
            {touched.subject && errors.subject && (
              <div className="fieldErr">{errors.subject}</div>
            )}

            <label>Message</label>
            <textarea
              name="body"
              value={values.body}
              onChange={(e) => {
                handleChange(e);
                setDocForm((p) => ({ ...p, body: e.target.value }));
              }}
              onBlur={handleBlur}
            />
            {touched.body && errors.body && (
              <div className="fieldErr">{errors.body}</div>
            )}

            <label>Document (PDF / DOCX / Images)</label>
            <input
              type="file"
              accept=".pdf,.docx,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setFieldValue("file", file);
                setDocFile(file);
              }}
            />
            {errors.file && (
              <div className="fieldErr">{errors.file as string}</div>
            )}

            {values.file && (
              <div className="muted small">Selected: {values.file.name}</div>
            )}

            <button className="btn primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Document"}
            </button>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}