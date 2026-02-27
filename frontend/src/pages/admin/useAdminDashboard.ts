// src/pages/admin/useAdminDashboard.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { createUser, listUsers, sendDocumentEmail } from "../../api/admin";
import { getAuditLogs, type AuditLog } from "../../api/audit";
import {
  createTask,
  deleteTask,
  downloadAttachment,
  getTasks,
  updateTask,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from "../../api/tasks";
import { triggerDownload } from "../../utils/download";

export type UserRow = { id: string; email: string; role: "A" | "B" | "ADMIN" };

function safeParsePayload(payload: any): any {
  if (!payload) return null;
  if (typeof payload === "object") return payload;

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return { raw: payload };
    }
  }
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function useAdminDashboard() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

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
    priority: "MEDIUM" as TaskPriority,   // ✅ add
  due_date: "" as string,
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
     priority: "MEDIUM" as TaskPriority,   // ✅ add
  due_date: "" as string,
    owner_id: "",
  });
  const [taskPdf, setTaskPdf] = useState<File | null>(null);

  // Task status filters
  const [filter, setFilter] = useState<Record<TaskStatus, boolean>>({
    PENDING: true,
    IN_PROGRESS: true,
    COMPLETED: true,
  });

  // ✅ Search + owner filter + pagination
  const [taskQuery, setTaskQuery] = useState("");
  const [ownerFilterId, setOwnerFilterId] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

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

  const didMount = useRef(false);

  // =========================
  // DERIVED
  // =========================
  const usersAB = useMemo(() => users.filter((u) => u.role === "A" || u.role === "B"), [users]);

  const userEmailById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const u of users) m[u.id] = u.email;
    return m;
  }, [users]);

  const filteredTasks = useMemo(() => tasks.filter((t) => filter[t.status]), [tasks, filter]);

  const searchedTasks = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    return filteredTasks.filter((t) => {
      if (ownerFilterId && t.owner_id !== ownerFilterId) return false;
      if (!q) return true;

      const ownerEmail = (userEmailById[t.owner_id] || "").toLowerCase();
      const title = (t.title || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      const status = (t.status || "").toLowerCase();

      return (
        title.includes(q) ||
        desc.includes(q) ||
        ownerEmail.includes(q) ||
        status.includes(q) ||
        (t.owner_id || "").toLowerCase().includes(q)
      );
    });
  }, [filteredTasks, taskQuery, ownerFilterId, userEmailById]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(searchedTasks.length / pageSize)), [
    searchedTasks.length,
    pageSize,
  ]);

  const currentPage = useMemo(() => clamp(page, 1, pageCount), [page, pageCount]);

  const pagedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return searchedTasks.slice(start, start + pageSize);
  }, [searchedTasks, currentPage, pageSize]);

  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  useEffect(() => {
    setPage(1);
  }, [taskQuery, ownerFilterId, pageSize, filterKey]);

  // KPI optimized
  const { kpiTotal, kpiPending, kpiInProgress, kpiCompleted, completionRate } = useMemo(() => {
    let pending = 0,
      inProg = 0,
      done = 0;

    for (const t of tasks) {
      if (t.status === "PENDING") pending++;
      else if (t.status === "IN_PROGRESS") inProg++;
      else if (t.status === "COMPLETED") done++;
    }

    const total = tasks.length;
    const rate = total === 0 ? 0 : (done * 100) / total;

    return { kpiTotal: total, kpiPending: pending, kpiInProgress: inProg, kpiCompleted: done, completionRate: rate };
  }, [tasks]);

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

  const loadAll = async () => {
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
    loadAll();
    didMount.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!didMount.current) return;
    loadLogs().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logLimit, logEntity, logAction]);

  // =========================
  // DOWNLOAD
  // =========================
  const handleDownload = async (attId: string, filename: string) => {
    try {
      const blob = await downloadAttachment(attId);
      triggerDownload(blob, filename);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Download failed");
    }
  };

  // =========================
  // ACTIONS (same)
  // =========================
  const submitCreateUser = async () => {
    setErr("");
    if (!newUser.email.trim()) return setErr("Email is required.");

    try {
      const res = await createUser({ email: newUser.email, role: newUser.role });
      if (!res?.success) throw new Error(res?.message || "Create user failed");
      setOpenUser(false);
      setNewUser({ email: "", role: "A" });
      await loadAll();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Create user failed");
    }
  };

 const submitCreateTask = async () => {
  setErr("");

  const title = taskForm.title.trim();
  const description = taskForm.description.trim();

  if (title.length < 3) {
    setErr("Title must be at least 3 characters.");
    return;
  }
  if (description.length < 5) {
    setErr("Description must be at least 5 characters.");
    return;
  }
  if (!taskForm.owner_id) {
    setErr("Choose owner (A/B) for admin-created task.");
    return;
  }

  try {
    const res = await createTask({ ...taskForm, title, description, file: taskPdf });
    if (!res.success) throw new Error(res.message);

    setOpenTask(false);
    setTaskForm({ title: "", description: "", status: "PENDING", priority: "MEDIUM", due_date: "", owner_id: "" });
    setTaskPdf(null);
    await loadAll();
  } catch (e: any) {
    // ✅ backend validation message show
    const data = e?.response?.data;
    const backendMsg =
      (typeof data === "string" ? data : "") ||
      (Array.isArray(data?.title) ? data.title[0] : "") ||
      (Array.isArray(data?.description) ? data.description[0] : "") ||
      data?.message;

    setErr(backendMsg || "Create task failed");
  }
};

  const quickStatus = async (task: Task, status: TaskStatus) => {
    setErr("");
    if (!task.can_edit_status) return setErr("You cannot change status of this task.");
    try {
      await updateTask(task.id, { title: task.title, description: task.description, status , priority: (task.priority ?? "MEDIUM") as TaskPriority,
  due_date: task.due_date ? String(task.due_date).slice(0, 10) : null, });
      await loadAll();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Update failed");
    }
  };

  const openEditModal = (t: Task) => {
    setErr("");
    setEditTask(t);
    setEditForm({ title: t.title, description: t.description, status: t.status ,  priority: (t.priority ?? "MEDIUM") as TaskPriority,
  due_date: t.due_date ? String(t.due_date).slice(0, 10) : "", });
    setOpenEdit(true);
  };

  const submitEditTask = async () => {
    setErr("");
    if (!editTask) return;
    if (!editTask.can_edit_status) return setErr("You cannot update this task.");

    const payload = editTask.can_edit_content
      ? { ...editForm }
      : { title: editTask.title, description: editTask.description, status: editForm.status, priority: editForm.priority, due_date: editForm.due_date };

    try {
      await updateTask(editTask.id, payload);
      setOpenEdit(false);
      setEditTask(null);
      await loadAll();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Edit failed");
    }
  };

  const removeTask = async (t: Task) => {
    setErr("");
    if (!t.can_delete) return setErr("You cannot delete this task.");
    try {
      await deleteTask(t.id);
      await loadAll();
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

  return {
    users,
    usersAB,
    tasks,
    filteredTasks,
    searchedTasks,
    pagedTasks,
    logs,

    safeParsePayload,
    shortId,
    fmtStatus,

    userEmailById,

    kpiTotal,
    kpiPending,
    kpiInProgress,
    kpiCompleted,
    completionRate,

    loading,
    err,
    setErr,

    openUser,
    setOpenUser,
    openTask,
    setOpenTask,
    openEdit,
    setOpenEdit,
    openDoc,
    setOpenDoc,

    newUser,
    setNewUser,
    taskForm,
    setTaskForm,
    taskPdf,
    setTaskPdf,
    editTask,
    setEditTask,
    editForm,
    setEditForm,
    docForm,
    setDocForm,
    docFile,
    setDocFile,

    filter,
    setFilter,
    logLimit,
    setLogLimit,
    logEntity,
    setLogEntity,
    logAction,
    setLogAction,

    // ✅ NEW exports
    taskQuery,
    setTaskQuery,
    ownerFilterId,
    setOwnerFilterId,
    pageSize,
    setPageSize,
    page: currentPage,
    setPage,
    pageCount,

    loadAll,
    submitCreateUser,
    submitCreateTask,
    openEditModal,
    submitEditTask,
    removeTask,
    quickStatus,
    submitSendDoc,
    handleDownload,
  };
}