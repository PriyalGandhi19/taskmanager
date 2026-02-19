// src/pages/AdminDashboard.tsx

import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";
import StatusChips from "../components/StatusChips";
import { createUser, listUsers, sendDocumentEmail } from "../api/admin";
import { createTask, deleteTask, getTasks, updateTask } from "../api/tasks";
import type { Task, TaskStatus } from "../api/tasks";
import { getAuditLogs, type AuditLog } from "../api/audit";
import AdminCharts from "../components/AdminCharts";

type UserRow = { id: string; email: string; role: "A" | "B" | "ADMIN" };

// ---------- helpers ----------
function safeParsePayload(payload: any): any {
  if (!payload) return null;

  // already object
  if (typeof payload === "object") return payload;

  // string payload
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return { raw: payload };
    }
  }

  // fallback
  return { raw: String(payload) };
}

function shortId(id?: string | null) {
  if (!id) return "-";
  return id.length > 8 ? id.slice(0, 8) + "..." : id;
}

function fmtStatus(s?: string) {
  if (!s) return "-";
  return s.replaceAll("_", " ");
}

export default function AdminDashboard() {
  // =========================
  // DATA
  // =========================
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Modals
  const [openUser, setOpenUser] = useState(false);
  const [openTask, setOpenTask] = useState(false);
  const [openDoc, setOpenDoc] = useState(false);

  // Edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: "PENDING" as TaskStatus,
  });

  // Create user form
  const [newUser, setNewUser] = useState<{ email: string; role: "A" | "B" }>({
    email: "",
    role: "A",
  });

  // Create task form
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "PENDING" as TaskStatus,
    owner_id: "",
  });

  // Optional task PDF attachment
  const [taskPdf, setTaskPdf] = useState<File | null>(null);

  // Task filters
  const [filter, setFilter] = useState({
    PENDING: true,
    IN_PROGRESS: true,
    COMPLETED: true,
  });

  // Audit filters
  const [logLimit, setLogLimit] = useState(100);
  const [logEntity, setLogEntity] = useState<string>("");
  const [logAction, setLogAction] = useState<string>("");

  // Send document modal form
  const [docForm, setDocForm] = useState({
    to_email: "",
    subject: "Task Document",
    body: "Please find attached document for your upcoming tasks.",
  });
  const [docFile, setDocFile] = useState<File | null>(null);

  // Collapse audit logs
  const [showLogs, setShowLogs] = useState(true);

  // =========================
  // DERIVED
  // =========================
  const usersAB = useMemo(() => users.filter((u) => u.role === "A" || u.role === "B"), [users]);
  const filteredTasks = useMemo(() => tasks.filter((t) => filter[t.status]), [tasks, filter]);

  // KPI counts
  const kpiTotal = tasks.length;
  const kpiPending = tasks.filter((t) => t.status === "PENDING").length;
  const kpiInProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const kpiCompleted = tasks.filter((t) => t.status === "COMPLETED").length;

  // =========================
  // LOADERS
  // =========================
  const loadUsersAndTasks = async () => {
    const [u, t] = await Promise.all([listUsers(), getTasks()]);
    setUsers(u?.data?.users ?? []);
    setTasks(t?.data?.tasks ?? []);
  };

  const loadLogs = async () => {
    const a = await getAuditLogs({
      limit: logLimit,
      entity: logEntity || undefined,
      action: logAction || undefined,
    });
    setLogs(a?.data?.logs ?? []);
  };

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      await Promise.all([loadUsersAndTasks(), loadLogs()]);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLogs().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logLimit, logEntity, logAction]);

  // =========================
  // ACTIONS
  // =========================
  const submitCreateUser = async () => {
    setErr("");

    if (!newUser.email.trim()) {
      setErr("Email is required.");
      return;
    }

    try {
      const res = await createUser({ email: newUser.email, role: newUser.role });
      if (!res?.success) throw new Error(res?.message || "Create user failed");

      setOpenUser(false);
      setNewUser({ email: "", role: "A" });
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Create user failed");
    }
  };

  const submitCreateTask = async () => {
    setErr("");

    if (!taskForm.owner_id) {
      setErr("Choose owner (A/B) for admin-created task.");
      return;
    }

    try {
      const res = await createTask({ ...taskForm, file: taskPdf });
      if (!res.success) throw new Error(res.message);

      setOpenTask(false);
      setTaskForm({ title: "", description: "", status: "PENDING", owner_id: "" });
      setTaskPdf(null);

      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Create task failed");
    }
  };

  const quickStatus = async (task: Task, status: TaskStatus) => {
    setErr("");
    if (!task.can_edit_status) {
      setErr("You cannot change status of this task.");
      return;
    }

    try {
      await updateTask(task.id, { title: task.title, description: task.description, status });
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Update failed");
    }
  };

  const openEditModal = (t: Task) => {
    setErr("");
    setEditTask(t);
    setEditForm({ title: t.title, description: t.description, status: t.status });
    setOpenEdit(true);
  };

  const submitEditTask = async () => {
    setErr("");
    if (!editTask) return;

    const payload = editTask.can_edit_content
      ? { ...editForm }
      : { title: editTask.title, description: editTask.description, status: editForm.status };

    if (!editTask.can_edit_status) {
      setErr("You cannot update this task.");
      return;
    }

    try {
      await updateTask(editTask.id, payload);
      setOpenEdit(false);
      setEditTask(null);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Edit failed");
    }
  };

  const removeTask = async (t: Task) => {
    setErr("");
    if (!t.can_delete) {
      setErr("You cannot delete this task.");
      return;
    }
    try {
      await deleteTask(t.id);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Delete failed");
    }
  };

  const submitSendDoc = async () => {
    setErr("");

    if (!docForm.to_email.trim()) return setErr("To email is required.");
    if (!docFile) return setErr("Please select a PDF file.");
    if (!docFile.name.toLowerCase().endsWith(".pdf")) return setErr("Only PDF files are allowed.");

    try {
      const res = await sendDocumentEmail({
        to_email: docForm.to_email,
        subject: docForm.subject,
        body: docForm.body,
        file: docFile,
      });

      if (!res.success) throw new Error(res.message);

      setOpenDoc(false);
      setDocForm({ to_email: "", subject: "Task Document", body: "Please find attached document." });
      setDocFile(null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Send document failed");
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <div>
      <Navbar />

      <div className="container">
        <h2>Admin Dashboard</h2>

        {err && <div className="errorBox">{err}</div>}
        {loading && <div className="muted">Loading...</div>}

        {/* ACTION BAR */}
        <div className="row">
          <button className="btn primary" onClick={() => setOpenUser(true)}>
            + Create User
          </button>
          <button className="btn primary" onClick={() => setOpenTask(true)}>
            + Create Task
          </button>
          <button className="btn primary" onClick={() => setOpenDoc(true)}>
            Send PDF
          </button>
          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>

        <div className="dashboard">
          {/* KPI CARDS */}
          <div className="kpiGrid">
            <div className="kpiCard">
              <div className="kpiTitle">Total Tasks</div>
              <div className="kpiValue">{kpiTotal}</div>
            </div>

            <div className="kpiCard">
              <div className="kpiTitle">Pending</div>
              <div className="kpiValue">{kpiPending}</div>
            </div>

            <div className="kpiCard">
              <div className="kpiTitle">In Progress</div>
              <div className="kpiValue">{kpiInProgress}</div>
            </div>

            <div className="kpiCard">
              <div className="kpiTitle">Completed</div>
              <div className="kpiValue">{kpiCompleted}</div>
            </div>
          </div>

          {/* CHARTS ROW */}
          <div className="chartsGrid">
            <div className="card chartCard">
              <h3 style={{ marginBottom: 8 }}>Tasks by Status</h3>
              <AdminCharts tasks={tasks} mode="bar" />
            </div>

            <div className="card chartCard">
              <h3 style={{ marginBottom: 8 }}>Status Distribution</h3>
              <AdminCharts tasks={tasks} mode="donut" />
            </div>
          </div>

          {/* TASK FILTERS */}
          <div className="card">
            <h3>Task Filters</h3>
            <div className="status-row">
              {(["PENDING", "IN_PROGRESS", "COMPLETED"] as TaskStatus[]).map((s) => (
                <label className="status-item" key={s}>
                  <input checked={filter[s]} type="checkbox" onChange={() => setFilter((p) => ({ ...p, [s]: !p[s] }))} />
                  {s.replace("_", " ")}
                </label>
              ))}
            </div>
          </div>

          {/* USERS + TASKS GRID */}
          <div className="mainGrid">
            <div className="card">
              <h3>Users (A/B)</h3>
              <div className="table">
                <div className="tr head">
                  <div>Email</div>
                  <div>Role</div>
                  <div></div>
                </div>

                {usersAB.map((u) => (
                  <div className="tr" key={u.id}>
                    <div>{u.email}</div>
                    <div>{u.role}</div>
                    <div className="muted small">{u.id.slice(0, 8)}...</div>
                  </div>
                ))}

                {!loading && usersAB.length === 0 && <div className="muted">No users yet.</div>}
              </div>
            </div>

            <div className="card">
              <h3>All Tasks</h3>
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
                        status:{String(t.can_edit_status)} | content:{String(t.can_edit_content)} | del:{String(t.can_delete)}
                      </div>
                    </div>

                    <div>
                      <StatusChips value={t.status} onChange={(s) => quickStatus(t, s)} disabled={!t.can_edit_status} />
                    </div>

                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn" onClick={() => openEditModal(t)} disabled={!t.can_edit_status}>
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

          {/* AUDIT LOGS */}
          <div className="card">
            <div className="auditHeader">
              <div className="auditTitleRow">
                <h3 style={{ margin: 0 }}>Audit Logs</h3>
                <button className="btn" onClick={() => setShowLogs((p) => !p)}>
                  {showLogs ? "Hide" : "Show"}
                </button>
              </div>

              <div className="auditFilters">
                <select value={logEntity} onChange={(e) => setLogEntity(e.target.value)}>
                  <option value="">All Entities</option>
                  <option value="tasks">tasks</option>
                  <option value="users">users</option>
                </select>

                <select value={logAction} onChange={(e) => setLogAction(e.target.value)}>
                  <option value="">All Actions</option>
                  <option value="INSERT">INSERT</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>

                <select value={logLimit} onChange={(e) => setLogLimit(Number(e.target.value))}>
                  <option value={50}>Last 50</option>
                  <option value={100}>Last 100</option>
                  <option value={200}>Last 200</option>
                  <option value={500}>Last 500</option>
                </select>
              </div>
            </div>

            {showLogs && (
              <div className="auditWrap">
                <div className="table auditTable" style={{ marginTop: 10 }}>
                  <div className="tr head">
                    <div>When</div>
                    <div>Actor</div>
                    <div>Action</div>
                    <div>Details</div>
                  </div>

                  {logs.map((l) => {
                    const data = safeParsePayload(l.payload);

                    return (
                      <div className="tr" key={l.id}>
                        <div className="small muted">{new Date(l.created_at).toLocaleString()}</div>

                        <div>
                          <div>
                            <b>{l.actor_email || "System"}</b>
                          </div>
                          <div className="small muted">{l.actor_id ? shortId(l.actor_id) : ""}</div>
                        </div>

                        <div>
                          <b>{l.action}</b>
                          <div className="small muted">{l.entity}</div>
                        </div>

                        <div className="auditDetails">
                          <div className="auditMeta">entity_id: {shortId(l.entity_id)}</div>

                          {/* readable key-value layout */}
                          <div className="auditKVs">
                            <div>
                              <span>Title</span>
                              <b>{data?.title ?? "-"}</b>
                            </div>
                            <div>
                              <span>Status</span>
                              <b>{fmtStatus(data?.status)}</b>
                            </div>
                            <div>
                              <span>Owner</span>
                              <b>{shortId(data?.owner_id)}</b>
                            </div>

                            <div className="full">
                              <span>Description</span>
                              <b>{data?.description ?? "-"}</b>
                            </div>

                            <div className="full">
                              <span>Created</span>
                              <b>{data?.created_at ? new Date(data.created_at).toLocaleString() : "-"}</b>
                            </div>

                            {/* fallback if payload is raw string */}
                            {data?.raw && (
                              <div className="full">
                                <span>Raw</span>
                                <b>{String(data.raw)}</b>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {!loading && logs.length === 0 && <div className="muted">No logs found.</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      <Modal open={openUser} title="Create User (A/B)" onClose={() => setOpenUser(false)}>
        <div className="form">
          <label>Email</label>
          <input value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />

          <label>Role</label>
          <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as "A" | "B" }))}>
            <option value="A">A</option>
            <option value="B">B</option>
          </select>

          <div className="muted small" style={{ marginTop: 8 }}>
            User will receive email verification link and then set password.
          </div>

          <button className="btn primary" onClick={submitCreateUser}>
            Create
          </button>
        </div>
      </Modal>

      {/* CREATE TASK MODAL */}
      <Modal open={openTask} title="Create Task (Assign to A/B)" onClose={() => setOpenTask(false)}>
        <div className="form">
          <label>Title</label>
          <input value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} />

          <label>Description</label>
          <textarea value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))} />

          <label>Status</label>
          <StatusChips value={taskForm.status} onChange={(s) => setTaskForm((p) => ({ ...p, status: s }))} />

          <label>Assign To (Owner)</label>
          <select value={taskForm.owner_id} onChange={(e) => setTaskForm((p) => ({ ...p, owner_id: e.target.value }))}>
            <option value="">-- Select user --</option>
            {usersAB.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email} ({u.role})
              </option>
            ))}
          </select>

          <label>Optional PDF</label>
          <input type="file" accept="application/pdf" onChange={(e) => setTaskPdf(e.target.files?.[0] || null)} />
          {taskPdf && <div className="muted small">Selected: {taskPdf.name}</div>}

          <button className="btn primary" onClick={submitCreateTask}>
            Create Task
          </button>
        </div>
      </Modal>

      {/* EDIT TASK MODAL */}
      <Modal open={openEdit} title="Edit Task" onClose={() => setOpenEdit(false)}>
        <div className="form">
          <label>Title</label>
          <input value={editForm.title} disabled={!(editTask?.can_edit_content ?? false)} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />

          <label>Description</label>
          <textarea
            value={editForm.description}
            disabled={!(editTask?.can_edit_content ?? false)}
            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
          />

          <label>Status</label>
          <StatusChips value={editForm.status} disabled={!(editTask?.can_edit_status ?? false)} onChange={(s) => setEditForm((p) => ({ ...p, status: s }))} />

          <button className="btn primary" onClick={submitEditTask}>
            Save Changes
          </button>
        </div>
      </Modal>

      {/* SEND DOCUMENT MODAL */}
      <Modal open={openDoc} title="Send PDF via Email (max limit 10MB)" onClose={() => setOpenDoc(false)}>
        <div className="form">
          <label>To Email</label>
          <input value={docForm.to_email} onChange={(e) => setDocForm((p) => ({ ...p, to_email: e.target.value }))} placeholder="user@gmail.com" />

          <label>Subject</label>
          <input value={docForm.subject} onChange={(e) => setDocForm((p) => ({ ...p, subject: e.target.value }))} />

          <label>Message</label>
          <textarea value={docForm.body} onChange={(e) => setDocForm((p) => ({ ...p, body: e.target.value }))} />

          <label>PDF File</label>
          <input type="file" accept="application/pdf" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
          {docFile && <div className="muted small">Selected: {docFile.name}</div>}

          <button className="btn primary" onClick={submitSendDoc}>
            Send PDF
          </button>
        </div>
      </Modal>
    </div>
  );
}
