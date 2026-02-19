import { api } from "./axios";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  owner_id: string;
  owner_email: string ; // for convenience in frontend
  created_by: string;
  created_at: string;
  updated_at: string;

  can_edit_status: boolean;
  can_edit_content: boolean;
  can_delete: boolean;

  attachments?: TaskAttachment[];
};

type ApiResp<T> = { success: boolean; message: string; data?: T; errors?: any };

export async function getTasks() {
  const res = await api.get<ApiResp<{ tasks: Task[] }>>("/api/tasks");
  return res.data;
}

export async function createTask(payload: {
  title: string;
  description: string;
  status: TaskStatus;
  owner_id?: string;
  file?: File | null;
}) {
  // ✅ easiest: always multipart (works even if file is null)
  const fd = new FormData();
  fd.append("title", payload.title);
  fd.append("description", payload.description || "");
  fd.append("status", payload.status);
  if (payload.owner_id) fd.append("owner_id", payload.owner_id);
  if (payload.file) fd.append("file", payload.file);

  const res = await api.post<ApiResp<{}>>("/api/tasks", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function updateTask(
  taskId: string,
  payload: { title: string; description: string; status: TaskStatus }
) {
  const res = await api.put<ApiResp<{}>>(`/api/tasks/${taskId}`, payload);
  return res.data;
}

export async function deleteTask(taskId: string) {
  const res = await api.delete<ApiResp<{}>>(`/api/tasks/${taskId}`);
  return res.data;
}

export type TaskAttachment = {
  id: string;
  original_name: string;
  size_bytes: number;
  content_type: string;
  download_url: string;   // "/api/attachments/<id>/download"
  created_at: string;
};

export async function downloadAttachment(attachmentId: string) {
  const res = await api.get(`/api/attachments/${attachmentId}/download`, {
    responseType: "blob",
  });
  return res.data as Blob;
}
