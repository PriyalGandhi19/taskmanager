import { api } from "./axios";
import type { ApiResp } from "./types";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";

export type TaskComment = {
  id: string;
  task_id: string;
  author_id: string;
  author_email: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
};

export type TaskAttachment = {
  id: string;
  original_name: string;
  size_bytes: number;
  content_type: string;
  download_url: string; // "/api/attachments/<id>/download"
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;

  owner_id: string;
  owner_email: string; // for convenience in frontend
  created_by: string;

  created_at: string;
  updated_at: string;

  can_edit_status: boolean;
  can_edit_content: boolean;
  can_delete: boolean;

  attachments?: TaskAttachment[];
  comments?: TaskComment[];
};

export async function getTasks() {
  const res = await api.get<ApiResp<{ tasks: Task[] }>>("/api/tasks");
  return res.data;
}

export async function createTask(payload: {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  owner_id?: string;
  file?: File | null;
}) {
  // ✅ easiest: always multipart (works even if file is null)
  const fd = new FormData();
  fd.append("title", payload.title);
  fd.append("description", payload.description || "");
  fd.append("status", payload.status);
  fd.append("priority", payload.priority);

  // ✅ IMPORTANT:
  // send only if present (backend should default null otherwise)
  if (payload.due_date) fd.append("due_date", payload.due_date);

  if (payload.owner_id) fd.append("owner_id", payload.owner_id);
  if (payload.file) fd.append("file", payload.file);

  const res = await api.post<ApiResp<{}>>("/api/tasks", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}

export async function updateTask(
  taskId: string,
  payload: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date?: string | null;
  }
) {
  // ✅ If UI clears date, force null so backend clears it
  const finalPayload = {
    ...payload,
    due_date: payload.due_date === "" ? null : payload.due_date ?? null,
  };

  const res = await api.put<ApiResp<{}>>(`/api/tasks/${taskId}`, finalPayload);
  return res.data;
}

export async function deleteTask(taskId: string) {
  const res = await api.delete<ApiResp<{}>>(`/api/tasks/${taskId}`);
  return res.data;
}

export async function downloadAttachment(attachmentId: string) {
  const res = await api.get(`/api/attachments/${attachmentId}/download`, {
    responseType: "blob",
  });
  return res.data as Blob;
}