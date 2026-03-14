// src/pages/UserDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Formik, Form } from "formik";
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
import { useSessionExpired } from "../hooks/useSessionExpired";
import { userCreateTaskSchema, editTaskSchema } from "../validations/taskSchemas";

export default function UserDashboard() {
  const { user } = useAuth();
  const expired = useSessionExpired();

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

  const [taskFiles, setTaskFiles] = useState<File[]>([]);

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

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

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
    if (!expired) {
      load();
    }
  }, [expired]);

  const handleDownload = async (attId: string, filename: string) => {
    if (expired) return;

    try {
      const blob = await downloadAttachment(attId);
      triggerDownload(blob, filename || "file");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Download failed");
    }
  };

  const submitCreateTask = async () => {
    if (expired) return;

    setErr("");

    const title = taskForm.title.trim();
    const description = taskForm.description.trim();

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

  const quickStatus = async (task: Task, status: TaskStatus) => {
    if (expired) return;

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

  const removeTask = async (task: Task) => {
    if (expired) return;

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

  const loadCommentsForTask = async (taskId: string) => {
    if (expired) return;

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

  const openViewModal = async (t: Task) => {
    if (expired) return;

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
    if (expired) return;

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
    if (expired) return;

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

  const addCommentToCurrentTask = async (text: string) => {
    if (expired || !editTask) return;

    try {
      await addTaskComment(editTask.id, text);
      await loadCommentsForTask(editTask.id);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to add comment");
    }
  };

  const editCommentForCurrentTask = async (commentId: string, text: string) => {
    if (expired || !editTask) return;

    try {
      await updateTaskComment(commentId, text);
      await loadCommentsForTask(editTask.id);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to update comment");
    }
  };

  const deleteCommentForCurrentTask = async (commentId: string) => {
    if (expired || !editTask) return;

    try {
      await deleteTaskComment(commentId);
      await loadCommentsForTask(editTask.id);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to delete comment");
    }
  };

  const noopAddComment = async (_text: string): Promise<void> => {};
  const noopEditComment = async (_commentId: string, _text: string): Promise<void> => {};
  const noopDeleteComment = async (_commentId: string): Promise<void> => {};

  const submitEdit = async () => {
    if (expired || !editTask) return;

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

  const isView = modalMode === "VIEW";
  const isComment = modalMode === "COMMENT";
  const isEdit = modalMode === "EDIT";

  const canEditContent = isEdit && (editTask?.can_edit_content ?? false);
  const canEditStatus = isEdit && (editTask?.can_edit_status ?? false);

  const modalTitle = isView ? "View Task" : isComment ? "Add Comment" : "Edit Task";

  return (
    <div>
      <Navbar />

      <div className="session-page-wrap">
        <div className={`container ${expired ? "session-locked-content" : ""}`}>
          <h2>My Tasks</h2>

          {err && <div className="errorBox">{err}</div>}
          {loading && <div className="muted">Loading...</div>}

          <div className="row">
            <button
              className="btn primary"
              disabled={expired}
              onClick={() => !expired && setOpenTask(true)}
            >
              + New Task
            </button>

            <button
              className="btn"
              disabled={expired}
              onClick={() => !expired && load()}
            >
              Refresh
            </button>
          </div>

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
                    disabled={expired}
                    onChange={() =>
                      !expired && setFilter((p) => ({ ...p, [s]: !p[s] }))
                    }
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

                    {t.attachments?.length ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 600 }}>Attachments</div>
                        {t.attachments.map((a) => (
                          <div key={a.id} style={{ display: "flex", gap: 10, marginTop: 4 }}>
                            <span className="muted small">{a.original_name}</span>
                            <button
                              className="btn"
                              disabled={expired}
                              onClick={() => !expired && handleDownload(a.id, a.original_name)}
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
                      onChange={(s) => !expired && quickStatus(t, s)}
                      disabled={!t.can_edit_status || expired}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn"
                      disabled={expired}
                      onClick={() => !expired && openViewModal(t)}
                    >
                      View
                    </button>

                    <button
                      className="btn"
                      disabled={expired}
                      onClick={() => !expired && openCommentModal(t)}
                    >
                      Add Comment
                    </button>

                    <button
                      className="btn"
                      disabled={!t.can_edit_status || expired}
                      onClick={() => !expired && openEditModal(t)}
                    >
                      Edit
                    </button>

                    <button
                      className="btn danger"
                      disabled={!t.can_delete || expired}
                      onClick={() => !expired && removeTask(t)}
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

        {expired && <div className="session-content-overlay" />}
      </div>

      <Modal open={!expired && openTask} title="Create Task" onClose={() => setOpenTask(false)}>
        <Formik
          enableReinitialize
          initialValues={{
            ...taskForm,
            files: taskFiles,
          }}
          validationSchema={userCreateTaskSchema}
          onSubmit={async (values, { setSubmitting }) => {
            setTaskForm({
              title: values.title,
              description: values.description,
              status: values.status,
              priority: values.priority,
              due_date: values.due_date,
            });
            setTaskFiles(values.files || []);

            try {
              await submitCreateTask();
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
                disabled={expired}
                onChange={(e) => {
                  handleChange(e);
                  setTaskForm((p) => ({ ...p, title: e.target.value }));
                }}
                onBlur={handleBlur}
              />
              {touched.title && errors.title && (
                <div className="fieldErr">{errors.title}</div>
              )}

              <label>Description</label>
              <textarea
                name="description"
                value={values.description}
                disabled={expired}
                onChange={(e) => {
                  handleChange(e);
                  setTaskForm((p) => ({ ...p, description: e.target.value }));
                }}
                onBlur={handleBlur}
              />
              {touched.description && errors.description && (
                <div className="fieldErr">{errors.description}</div>
              )}

              <label>Status</label>
              <StatusChips
                value={values.status}
                onChange={(s) => {
                  if (expired) return;
                  setFieldValue("status", s);
                  setTaskForm((p) => ({ ...p, status: s }));
                }}
                disabled={expired}
              />
              {touched.status && errors.status && (
                <div className="fieldErr">{errors.status as string}</div>
              )}

              <label>Priority</label>
              <select
                name="priority"
                value={values.priority}
                disabled={expired}
                onChange={(e) => {
                  handleChange(e);
                  setTaskForm((p) => ({ ...p, priority: e.target.value as TaskPriority }));
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
                disabled={expired}
                onChange={(e) => {
                  handleChange(e);
                  setTaskForm((p) => ({ ...p, due_date: e.target.value }));
                }}
                onBlur={handleBlur}
              />
              {touched.due_date && errors.due_date && (
                <div className="fieldErr">{errors.due_date}</div>
              )}

              <label>Optional Attachments (PDF / DOCX / Images)</label>
              <input
                type="file"
                multiple
                disabled={expired}
                accept=".pdf,.docx,image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 3);
                  setFieldValue("files", files);
                  setTaskFiles(files);
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
                      <li key={`${f.name}-${idx}`}>{f.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                className="btn primary"
                type="submit"
                disabled={expired || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create"}
              </button>
            </Form>
          )}
        </Formik>
      </Modal>

      <Modal
        open={!expired && openEdit}
        title={modalTitle}
        onClose={() => {
          setOpenEdit(false);
          setEditTask(null);
          setComments([]);
        }}
      >
        <div className="form">
          {!isComment && !isEdit && (
            <>
              <label>Title</label>
              <input value={editForm.title} disabled />

              <label>Description</label>
              <textarea value={editForm.description} disabled />

              <label>Status</label>
              <StatusChips value={editForm.status} disabled onChange={() => {}} />

              <label>Priority</label>
              <select value={editForm.priority} disabled>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>

              <label>Due Date</label>
              <input type="date" value={editForm.due_date || ""} disabled />
            </>
          )}

          {isEdit && (
            <Formik
              enableReinitialize
              initialValues={editForm}
              validationSchema={editTaskSchema}
              onSubmit={async (values, { setSubmitting }) => {
                setEditForm(values);

                try {
                  await submitEdit();
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
                    disabled={!canEditContent || expired}
                    onChange={(e) => {
                      handleChange(e);
                      setEditForm((p) => ({ ...p, title: e.target.value }));
                    }}
                    onBlur={handleBlur}
                  />
                  {touched.title && errors.title && (
                    <div className="fieldErr">{errors.title}</div>
                  )}

                  <label>Description</label>
                  <textarea
                    name="description"
                    value={values.description}
                    disabled={!canEditContent || expired}
                    onChange={(e) => {
                      handleChange(e);
                      setEditForm((p) => ({ ...p, description: e.target.value }));
                    }}
                    onBlur={handleBlur}
                  />
                  {touched.description && errors.description && (
                    <div className="fieldErr">{errors.description}</div>
                  )}

                  <label>Status</label>
                  <StatusChips
                    value={values.status}
                    onChange={(s) => {
                      if (expired) return;
                      setFieldValue("status", s);
                      setEditForm((p) => ({ ...p, status: s }));
                    }}
                    disabled={!canEditStatus || expired}
                  />
                  {touched.status && errors.status && (
                    <div className="fieldErr">{errors.status as string}</div>
                  )}

                  <label>Priority</label>
                  <select
                    name="priority"
                    value={values.priority}
                    disabled={!canEditContent || expired}
                    onChange={(e) => {
                      handleChange(e);
                      setEditForm((p) => ({ ...p, priority: e.target.value as TaskPriority }));
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
                    disabled={!canEditContent || expired}
                    onChange={(e) => {
                      handleChange(e);
                      setEditForm((p) => ({ ...p, due_date: e.target.value }));
                    }}
                    onBlur={handleBlur}
                  />
                  {touched.due_date && errors.due_date && (
                    <div className="fieldErr">{errors.due_date}</div>
                  )}

                  <button
                    className="btn primary"
                    type="submit"
                    disabled={!canEditStatus || expired || isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </button>
                </Form>
              )}
            </Formik>
          )}

          {commentsLoading ? (
            <div className="muted">Loading comments...</div>
          ) : (
            <CommentsSection
              comments={comments}
              currentUserId={user?.id}
              currentUserEmail={user?.email}
              currentUserRole={user?.role}
              onAdd={expired ? noopAddComment : addCommentToCurrentTask}
              onEdit={expired ? noopEditComment : editCommentForCurrentTask}
              onDelete={expired ? noopDeleteComment : deleteCommentForCurrentTask}
            />
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