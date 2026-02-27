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
} from "../api/tasks";
import type { Task, TaskStatus, TaskPriority } from "../api/tasks";
import { triggerDownload } from "../utils/download";
//import NotificationBell from "../components/NotificationBell";

export default function UserDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [openTask, setOpenTask] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "PENDING" as TaskStatus,
    priority: "MEDIUM" as TaskPriority,
    due_date: "" as string,
  });

  // optional pdf (create only)
  const [taskPdf, setTaskPdf] = useState<File | null>(null);

  // EDIT modal
  const [openEdit, setOpenEdit] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: "PENDING" as TaskStatus,
    priority: "MEDIUM" as TaskPriority,
    due_date: "" as string,
  });

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
      triggerDownload(blob, filename || "file.pdf");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Download failed");
    }
  };

  const submitCreateTask = async () => {
    setErr("");

    const title = taskForm.title.trim();
    const description = taskForm.description.trim();

    if (title.length < 3) return setErr("Title must be at least 3 characters.");
    if (description.length < 5)
      return setErr("Description must be at least 5 characters.");

    try {
      const res = await createTask({
        title,
        description,
        status: taskForm.status,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        file: taskPdf,
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
      setTaskPdf(null);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Create task failed");
    }
  };

  // STATUS update
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

  // Delete
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

  // Open Edit modal
  const openEditModal = (t: Task) => {
    setErr("");
    setEditTask(t);
    setEditForm({
      title: t.title,
      description: t.description,
      status: t.status,
      priority: (t.priority ?? "MEDIUM") as TaskPriority,
      due_date: t.due_date ? String(t.due_date).slice(0, 10) : "",
    });
    setOpenEdit(true);
  };

  // Save Edit
  const submitEdit = async () => {
    if (!editTask) return;

    const payload = editTask.can_edit_content
      ? {
          ...editForm,
          due_date: editForm.due_date || null,
        }
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
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Edit failed");
    }
  };

  return (
    <div>
      <Navbar  />

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
            {(["PENDING", "IN_PROGRESS", "COMPLETED"] as TaskStatus[]).map(
              (s) => (
                <label className="status-item" key={s}>
                  <input
                    type="checkbox"
                    checked={filter[s]}
                    onChange={() =>
                      setFilter((p) => ({ ...p, [s]: !p[s] }))
                    }
                  />
                  {s.replace("_", " ")}
                </label>
              )
            )}
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
                      {new Date(t.due_date) < new Date() &&
                        t.status !== "COMPLETED" && (
                          <span style={{ color: "#ef4444", marginLeft: 8 }}>
                            🔴 Overdue
                          </span>
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
                        <div
                          key={a.id}
                          style={{ display: "flex", gap: 10, marginTop: 4 }}
                        >
                          <span className="muted small">{a.original_name}</span>
                          <button
                            className="btn"
                            onClick={() => handleDownload(a.id, a.original_name)}
                          >
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

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => openEditModal(t)}>
                    Edit
                  </button>

                  <button
                    className="btn danger"
                    onClick={() => removeTask(t)}
                    disabled={!t.can_delete}
                  >
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
            onChange={(e) =>
              setTaskForm((p) => ({ ...p, title: e.target.value }))
            }
          />

          <label>Description</label>
          <textarea
            value={taskForm.description}
            onChange={(e) =>
              setTaskForm((p) => ({ ...p, description: e.target.value }))
            }
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

          <label>Optional PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setTaskPdf(e.target.files?.[0] || null)}
          />
          {taskPdf && <div className="muted small">Selected: {taskPdf.name}</div>}

          <button className="btn primary" onClick={submitCreateTask}>
            Create
          </button>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal open={openEdit} title="Edit Task" onClose={() => setOpenEdit(false)}>
        <div className="form">
          <label>Title</label>
          <input
            value={editForm.title}
            disabled={!(editTask?.can_edit_content ?? false)}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, title: e.target.value }))
            }
          />

          <label>Description</label>
          <textarea
            value={editForm.description}
            disabled={!(editTask?.can_edit_content ?? false)}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, description: e.target.value }))
            }
          />

          <label>Status</label>
          <StatusChips
            value={editForm.status}
            onChange={(s) => setEditForm((p) => ({ ...p, status: s }))}
            disabled={!(editTask?.can_edit_status ?? false)}
          />

          <label>Priority</label>
          <select
            value={editForm.priority}
            disabled={!(editTask?.can_edit_content ?? false)}
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
            disabled={!(editTask?.can_edit_content ?? false)}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, due_date: e.target.value }))
            }
          />

          <button className="btn primary" onClick={submitEdit}>
            Save
          </button>
        </div>
      </Modal>
    </div>
  );
}