// src/pages/UserDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";
import StatusChips from "../components/StatusChips";
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
  downloadAttachment,
  getTaskComments,
  addTaskComment,
  updateTaskComment,
  deleteTaskComment,
} from "../api/tasks";
import type { Task, TaskStatus, TaskPriority, TaskComment } from "../api/tasks";
import { triggerDownload } from "../utils/download";
import CommentsSection from "../components/CommentsSection";
import { useAuth } from "../store/authStore";

export default function UserDashboard() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Create modal
  const [openTask, setOpenTask] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "PENDING" as TaskStatus,
    priority: "MEDIUM" as TaskPriority,
    due_date: "" as string,
  });

  // ✅ multiple attachments
  const [taskFiles, setTaskFiles] = useState<File[]>([]);

  // Shared modal: VIEW / COMMENT / EDIT
  const [openEdit, setOpenEdit] = useState(false);
  const [modalMode, setModalMode] = useState<"VIEW" | "COMMENT" | "EDIT">("VIEW");

  const [editTask, setEditTask] = useState<Task | null>(null);

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: "PENDING" as TaskStatus,
    priority: "MEDIUM" as TaskPriority,
    due_date: "" as string,
  });

  // Comments
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Filters
  const [filter, setFilter] = useState<Record<TaskStatus, boolean>>({
    PENDING: true,
    IN_PROGRESS: true,
    COMPLETED: true,
  });

  const filteredTasks = useMemo(
    () => tasks.filter((t) => filter[t.status]),
    [tasks, filter]
  );

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const t = await getTasks();
      setTasks(t.data?.tasks || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // =========================
  // ATTACHMENT DOWNLOAD
  // =========================
  const handleDownload = async (attId: string, filename: string) => {
    try {
      const blob = await downloadAttachment(attId);
      triggerDownload(blob, filename || "file");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Download failed");
    }
  };

  // =========================
  // CREATE TASK
  // =========================
  const submitCreateTask = async () => {
    setErr("");

    const title = taskForm.title.trim();
    const description = taskForm.description.trim();

    if (title.length < 3) return setErr("Title must be at least 3 characters.");
    if (description.length < 5) return setErr("Description must be at least 5 characters.");

    try {
      const res = await createTask({
        title,
        description,
        status: taskForm.status,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        files: taskFiles,
      });

      if (!res.success) throw new Error(res.message);

      setOpenTask(false);
      setTaskForm({
        title: "",
        description: "",
        status: "PENDING",
        priority: "MEDIUM",
        due_date: "",
      });
      setTaskFiles([]);

      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Create task failed");
    }
  };

  // =========================
  // STATUS update
  // =========================
  const quickStatus = async (task: Task, status: TaskStatus) => {
    if (!task.can_edit_status) {
      setErr("You cannot change status for this task.");
      return;
    }

    try {
      await updateTask(task.id, {
        title: task.title,
        description: task.description,
        status,
        priority: (task.priority ?? "MEDIUM") as TaskPriority,
        due_date: task.due_date ? String(task.due_date).slice(0, 10) : null,
      });
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Update failed");
    }
  };

  // =========================
  // Delete
  // =========================
  const removeTask = async (task: Task) => {
    if (!task.can_delete) {
      setErr("You cannot delete this task (only creator can).");
      return;
    }
    try {
      await deleteTask(task.id);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Delete failed");
    }
  };

  // =========================
  // COMMENTS loader
  // =========================
  const loadCommentsForTask = async (taskId: string) => {
    setComments([]);
    setCommentsLoading(true);
    try {
      const res = await getTaskComments(taskId);
      setComments(res.data?.comments || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  };

  // =========================
  // OPEN MODALS
  // =========================
  const openViewModal = async (t: Task) => {
    setErr("");
    setEditTask(t);
    setEditForm({
      title: t.title,
      description: t.description,
      status: t.status,
      priority: (t.priority ?? "MEDIUM") as TaskPriority,
      due_date: t.due_date ? String(t.due_date).slice(0, 10) : "",
    });

    setModalMode("VIEW");
    setOpenEdit(true);

    await loadCommentsForTask(t.id);
  };

  const openCommentModal = async (t: Task) => {
    setErr("");
    setEditTask(t);
    setEditForm({
      title: t.title,
      description: t.description,
      status: t.status,
      priority: (t.priority ?? "MEDIUM") as TaskPriority,
      due_date: t.due_date ? String(t.due_date).slice(0, 10) : "",
    });

    setModalMode("COMMENT");
    setOpenEdit(true);

    await loadCommentsForTask(t.id);
  };

  const openEditModal = async (t: Task) => {
    setErr("");
    setEditTask(t);
    setEditForm({
      title: t.title,
      description: t.description,
      status: t.status,
      priority: (t.priority ?? "MEDIUM") as TaskPriority,
      due_date: t.due_date ? String(t.due_date).slice(0, 10) : "",
    });

    setModalMode("EDIT");
    setOpenEdit(true);

    await loadCommentsForTask(t.id);
  };

  // =========================
  // ADD COMMENT
  // =========================
  const addCommentToCurrentTask = async (text: string) => {
    if (!editTask) return;
    try {
      await addTaskComment(editTask.id, text);
      await loadCommentsForTask(editTask.id);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to add comment");
    }
  };

   const editCommentForCurrentTask = async (commentId: string, text: string) => {
    if (!editTask) return;
    try {
      await updateTaskComment(commentId, text);
      await loadCommentsForTask(editTask.id);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to update comment");
    }
  };

  const deleteCommentForCurrentTask = async (commentId: string) => {
    if (!editTask) return;
    try {
      await deleteTaskComment(commentId);
      await loadCommentsForTask(editTask.id);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to delete comment");
    }
  };

  // =========================
  // SAVE EDIT
  // =========================
  const submitEdit = async () => {
    if (!editTask) return;

    const payload = editTask.can_edit_content
      ? { ...editForm, due_date: editForm.due_date || null }
      : {
          title: editTask.title,
          description: editTask.description,
          status: editForm.status,
          priority: (editTask.priority ?? "MEDIUM") as TaskPriority,
          due_date: editTask.due_date ? String(editTask.due_date).slice(0, 10) : null,
        };

    try {
      await updateTask(editTask.id, payload);

      setOpenEdit(false);
      setEditTask(null);
      setComments([]);

      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Edit failed");
    }
  };

  // UI helpers
  const isView = modalMode === "VIEW";
  const isComment = modalMode === "COMMENT";
  const isEdit = modalMode === "EDIT";

  const canEditContent = isEdit && (editTask?.can_edit_content ?? false);
  const canEditStatus = isEdit && (editTask?.can_edit_status ?? false);

  const modalTitle = isView ? "View Task" : isComment ? "Add Comment" : "Edit Task";

  return (
    <div>
      <Navbar />

      <div className="container">
        <h2>My Tasks</h2>

        {err && <div className="errorBox">{err}</div>}
        {loading && <div className="muted">Loading...</div>}

        <div className="row">
          <button className="btn primary" onClick={() => setOpenTask(true)}>
            + New Task
          </button>
          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>

        {/* KPI */}
        <div className="kpiGrid">
          <div className="kpiCard">
            <div className="kpiTitle">Total</div>
            <div className="kpiValue">{tasks.length}</div>
          </div>

          <div className="kpiCard">
            <div className="kpiTitle">Pending</div>
            <div className="kpiValue">
              {tasks.filter((t) => t.status === "PENDING").length}
            </div>
          </div>

          <div className="kpiCard">
            <div className="kpiTitle">In Progress</div>
            <div className="kpiValue">
              {tasks.filter((t) => t.status === "IN_PROGRESS").length}
            </div>
          </div>

          <div className="kpiCard">
            <div className="kpiTitle">Completed</div>
            <div className="kpiValue">
              {tasks.filter((t) => t.status === "COMPLETED").length}
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Task Filters</h3>
          <div className="status-row">
            {(["PENDING", "IN_PROGRESS", "COMPLETED"] as TaskStatus[]).map((s) => (
              <label className="status-item" key={s}>
                <input
                  type="checkbox"
                  checked={filter[s]}
                  onChange={() => setFilter((p) => ({ ...p, [s]: !p[s] }))}
                />
                {s.replace("_", " ")}
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="table">
            <div className="tr head">
              <div>Title</div>
              <div>Status</div>
              <div>Action</div>
            </div>

            {filteredTasks.map((t) => (
              <div className="tr" key={t.id}>
                <div>
                  <b>{t.title}</b>
                  <div className="muted small">{t.description}</div>

                  <div className="muted small">
                    ⭐ Priority: <b>{(t.priority ?? "MEDIUM").replace("_", " ")}</b>
                  </div>

                  {t.due_date && (
                    <div className="muted small">
                      📅 Due: {new Date(t.due_date).toLocaleDateString()}
                      {new Date(t.due_date) < new Date() && t.status !== "COMPLETED" && (
                        <span style={{ color: "#ef4444", marginLeft: 8 }}>🔴 Overdue</span>
                      )}
                    </div>
                  )}

                  {!t.can_edit_content && (
                    <div className="muted small">
                      🔒 Title/description locked (Admin created)
                    </div>
                  )}

                  {/* Attachments */}
                  {t.attachments?.length ? (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 600 }}>Attachments</div>
                      {t.attachments.map((a) => (
                        <div key={a.id} style={{ display: "flex", gap: 10, marginTop: 4 }}>
                          <span className="muted small">{a.original_name}</span>
                          <button className="btn" onClick={() => handleDownload(a.id, a.original_name)}>
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div>
                  <StatusChips
                    value={t.status}
                    onChange={(s) => quickStatus(t, s)}
                    disabled={!t.can_edit_status}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn" onClick={() => openViewModal(t)}>
                    View
                  </button>

                  <button className="btn" onClick={() => openCommentModal(t)}>
                    Add Comment
                  </button>

                  <button className="btn" onClick={() => openEditModal(t)} disabled={!t.can_edit_status}>
                    Edit
                  </button>

                  <button className="btn danger" onClick={() => removeTask(t)} disabled={!t.can_delete}>
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {!loading && filteredTasks.length === 0 && (
              <div className="muted">No tasks for selected filters.</div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      <Modal open={openTask} title="Create Task" onClose={() => setOpenTask(false)}>
        <div className="form">
          <label>Title</label>
          <input
            value={taskForm.title}
            onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
          />

          <label>Description</label>
          <textarea
            value={taskForm.description}
            onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
          />

          <label>Status</label>
          <StatusChips
            value={taskForm.status}
            onChange={(s) => setTaskForm((p) => ({ ...p, status: s }))}
          />

          <label>Priority</label>
          <select
            value={taskForm.priority}
            onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value as TaskPriority }))}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>

          <label>Due Date</label>
          <input
            type="date"
            value={taskForm.due_date || ""}
            onChange={(e) => setTaskForm((p) => ({ ...p, due_date: e.target.value }))}
          />

          <label>Optional Attachments (PDF / DOCX / Images)</label>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,image/*"
            onChange={(e) => setTaskFiles(Array.from(e.target.files || []))}
          />
          {taskFiles.length > 0 && (
            <div className="muted small">
              Selected:
              <ul style={{ marginTop: 6 }}>
                {taskFiles.map((f, idx) => (
                  <li key={idx}>{f.name}</li>
                ))}
              </ul>
            </div>
          )}

          <button className="btn primary" onClick={submitCreateTask}>
            Create
          </button>
        </div>
      </Modal>

      {/* VIEW / COMMENT / EDIT MODAL */}
      <Modal
        open={openEdit}
        title={modalTitle}
        onClose={() => {
          setOpenEdit(false);
          setEditTask(null);
          setComments([]);
        }}
      >
        <div className="form">
          {/* fields hidden in COMMENT mode */}
          {!isComment && (
            <>
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
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />

              <label>Status</label>
              <StatusChips
                value={editForm.status}
                onChange={(s) => setEditForm((p) => ({ ...p, status: s }))}
                disabled={!canEditStatus}
              />

              <label>Priority</label>
              <select
                value={editForm.priority}
                disabled={!canEditContent}
                onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value as TaskPriority }))}
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
                onChange={(e) => setEditForm((p) => ({ ...p, due_date: e.target.value }))}
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
              onAdd={addCommentToCurrentTask}
              onEdit={editCommentForCurrentTask}
              onDelete={deleteCommentForCurrentTask}
            />)}

          {/* Save only in EDIT mode */}
          {isEdit && (
            <button className="btn primary" onClick={submitEdit} disabled={!canEditStatus}>
              Save
            </button>
          )}

          {isView && (
            <div className="muted small" style={{ marginTop: 10 }}>
              This is view-only.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}