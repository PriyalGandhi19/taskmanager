import type { Dispatch, SetStateAction } from "react";
import Modal from "../../components/Modal";
import StatusChips from "../../components/StatusChips";
import type { Task, TaskPriority, TaskStatus } from "../../api/tasks";
import type { UserRow } from "./useAdminDashboard";

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
      <div className="form">
        <label>Email</label>
        <input
          value={newUser.email}
          onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
        />

        <label>Role</label>
        <select
          value={newUser.role}
          onChange={(e) =>
            setNewUser((p) => ({ ...p, role: e.target.value as "A" | "B" }))
          }
        >
          <option value="A">A</option>
          <option value="B">B</option>
        </select>

        <div className="muted small" style={{ marginTop: 8 }}>
          User will receive email verification link and then set password.
        </div>

        <button className="btn primary" onClick={onSubmit}>
          Create
        </button>
      </div>
    </Modal>
  );
}

export function CreateTaskModal({
  open,
  onClose,
  taskForm,
  setTaskForm,
  usersAB,
  taskPdf,
  setTaskPdf,
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
  taskPdf: File | null;
  setTaskPdf: (f: File | null) => void;
  onSubmit: () => Promise<void>;
}) {
  const isValid =
    taskForm.title.trim().length >= 3 &&
    taskForm.description.trim().length >= 5 &&
    !!taskForm.owner_id;

  return (
    <Modal open={open} title="Create Task (Assign to A/B)" onClose={onClose}>
      <div className="form">
        <label>Title</label>
        <input
          value={taskForm.title}
          onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="Min 3 characters"
        />

        <label>Description</label>
        <textarea
          value={taskForm.description}
          onChange={(e) =>
            setTaskForm((p) => ({ ...p, description: e.target.value }))
          }
          placeholder="Min 5 characters"
        />

        <label>Status</label>
        <StatusChips
          value={taskForm.status}
          onChange={(s) => setTaskForm((p) => ({ ...p, status: s }))}
        />

        <label>Priority</label>
        <select
          value={taskForm.priority}
          onChange={(e) =>
            setTaskForm((p) => ({
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
          value={taskForm.due_date || ""}
          onChange={(e) =>
            setTaskForm((p) => ({ ...p, due_date: e.target.value }))
          }
        />

        <label>Assign To (Owner)</label>
        <select
          value={taskForm.owner_id}
          onChange={(e) =>
            setTaskForm((p) => ({ ...p, owner_id: e.target.value }))
          }
        >
          <option value="">-- Select user --</option>
          {usersAB.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email} ({u.role})
            </option>
          ))}
        </select>

        <label>Optional PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setTaskPdf(e.target.files?.[0] || null)}
        />
        {taskPdf && <div className="muted small">Selected: {taskPdf.name}</div>}

        <button className="btn primary" onClick={onSubmit} disabled={!isValid}>
          Create Task
        </button>

        {!isValid && (
          <div className="muted small" style={{ marginTop: 8 }}>
            Title ≥ 3 chars, Description ≥ 5 chars, and Owner is required.
          </div>
        )}
      </div>
    </Modal>
  );
}

export function EditTaskModal({
  open,
  onClose,
  editTask,
  editForm,
  setEditForm,
  onSubmit,
}: {
  open: boolean;
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
}) {
  const canEditContent = editTask?.can_edit_content ?? false;
  const canEditStatus = editTask?.can_edit_status ?? false;

  return (
    <Modal open={open} title="Edit Task" onClose={onClose}>
      <div className="form">
        <label>Title</label>
        <input
          value={editForm.title}
          disabled={!canEditContent}
          onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
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

        {/* ✅ Priority + Due date are "content", so lock them too if admin-created */}
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

        <button className="btn primary" onClick={onSubmit} disabled={!canEditStatus}>
          Save Changes
        </button>
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
    <Modal
      open={open}
      title="Send PDF via Email (max limit 10MB)"
      onClose={onClose}
    >
      <div className="form">
        <label>To Email</label>
        <input
          value={docForm.to_email}
          onChange={(e) =>
            setDocForm((p) => ({ ...p, to_email: e.target.value }))
          }
        />

        <label>Subject</label>
        <input
          value={docForm.subject}
          onChange={(e) => setDocForm((p) => ({ ...p, subject: e.target.value }))}
        />

        <label>Message</label>
        <textarea
          value={docForm.body}
          onChange={(e) => setDocForm((p) => ({ ...p, body: e.target.value }))}
        />

        <label>PDF File</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setDocFile(e.target.files?.[0] || null)}
        />
        {docFile && <div className="muted small">Selected: {docFile.name}</div>}

        <button className="btn primary" onClick={onSubmit}>
          Send PDF
        </button>
      </div>
    </Modal>
  );
}