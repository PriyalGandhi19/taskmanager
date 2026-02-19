import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";
import StatusChips from "../components/StatusChips";
import { createTask, deleteTask, getTasks, updateTask } from "../api/tasks";
import type { Task, TaskStatus } from "../api/tasks";

export default function UserDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [openTask, setOpenTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", status: "PENDING" as TaskStatus });

  // optional pdf (create only)
  const [taskPdf, setTaskPdf] = useState<File | null>(null);

  // EDIT modal
  const [openEdit, setOpenEdit] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", status: "PENDING" as TaskStatus });

  // Filters
  const [filter, setFilter] = useState({ PENDING: true, IN_PROGRESS: true, COMPLETED: true });
  const filteredTasks = useMemo(() => tasks.filter((t) => filter[t.status]), [tasks, filter]);

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

  const submitCreateTask = async () => {
    setErr("");
    try {
      const res = await createTask({
        title: taskForm.title,
        description: taskForm.description,
        status: taskForm.status,
        file: taskPdf,
      });

      if (!res.success) throw new Error(res.message);

      setOpenTask(false);
      setTaskForm({ title: "", description: "", status: "PENDING" });
      setTaskPdf(null);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Create task failed");
    }
  };

  // STATUS update (Rule 1)
  const quickStatus = async (task: Task, status: TaskStatus) => {
    if (!task.can_edit_status) {
      setErr("You cannot change status for this task.");
      return;
    }
    try {
      await updateTask(task.id, { title: task.title, description: task.description, status });
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Update failed");
    }
  };

  // Delete (Rule 1)
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

  // Open Edit modal (title/desc edit only if can_edit_content)
  const openEditModal = (t: Task) => {
    setErr("");
    setEditTask(t);
    setEditForm({ title: t.title, description: t.description, status: t.status });
    setOpenEdit(true);
  };

  // Save Edit
  const submitEdit = async () => {
    if (!editTask) return;

    // Rule 1: if cannot edit content, only status change should be allowed
    const finalPayload =
      editTask.can_edit_content
        ? { ...editForm }
        : { title: editTask.title, description: editTask.description, status: editForm.status };

    try {
      await updateTask(editTask.id, finalPayload);
      setOpenEdit(false);
      setEditTask(null);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Edit failed");
    }
  };

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

        <div className="card">
          <h3>Task Filters</h3>
          <div className="status-row">
            {(["PENDING", "IN_PROGRESS", "COMPLETED"] as TaskStatus[]).map((s) => (
              <label className="status-item" key={s}>
                <input type="checkbox" checked={filter[s]} onChange={() => setFilter((p) => ({ ...p, [s]: !p[s] }))} />
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

                  {!t.can_edit_content && (
                    <div className="muted small">🔒 Title/description locked (Admin created)</div>
                  )}
                </div>

                <div>
                  <StatusChips
                    value={t.status}
                    onChange={(s) => quickStatus(t, s)}
                    disabled={!t.can_edit_status} // ✅ THIS is why earlier you could not change!
                  />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => openEditModal(t)}>
                    Edit
                  </button>

                  <button className="btn danger" onClick={() => removeTask(t)} disabled={!t.can_delete}>
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {!loading && filteredTasks.length === 0 && <div className="muted">No tasks for selected filters.</div>}
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      <Modal open={openTask} title="Create Task" onClose={() => setOpenTask(false)}>
        <div className="form">
          <label>Title</label>
          <input value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} />

          <label>Description</label>
          <textarea value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))} />

          <label>Status</label>
          <StatusChips value={taskForm.status} onChange={(s) => setTaskForm((p) => ({ ...p, status: s }))} />

          <label>Optional PDF</label>
          <input type="file" accept="application/pdf" onChange={(e) => setTaskPdf(e.target.files?.[0] || null)} />
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
            onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
          />

          <label>Description</label>
          <textarea
            value={editForm.description}
            disabled={!(editTask?.can_edit_content ?? false)}
            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
          />

          <label>Status</label>
          <StatusChips
            value={editForm.status}
            onChange={(s) => setEditForm((p) => ({ ...p, status: s }))}
            disabled={!(editTask?.can_edit_status ?? false)}
          />

          <button className="btn primary" onClick={submitEdit}>
            Save
          </button>
        </div>
      </Modal>
    </div>
  );
}
