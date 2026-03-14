import { api } from "./axios";
import type { ApiResp } from "./types";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";

export type TaskComment = {
  id: string;
  task_id: string;
  user_id: string;
  user_email: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type TaskAttachment = {
  id: string;
  original_name: string;
  size_bytes: number;
  content_type: string;
  download_url: string;
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
  owner_email: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  can_edit_status: boolean;
  can_edit_content: boolean;
  can_delete: boolean;
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
};

const activeHeaders = { "X-USER-ACTIVE": "1" };

export async function getTasks() {
  const res = await api.get<ApiResp<{ tasks: Task[] }>>("/api/tasks", {
    headers: activeHeaders,
  });
  return res.data;
}

export async function createTask(payload: {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  owner_id?: string;
  files?: File[];
  file?: File | null;
}) {
  const fd = new FormData();
  fd.append("title", payload.title);
  fd.append("description", payload.description || "");
  fd.append("status", payload.status);
  fd.append("priority", payload.priority);

  if (payload.due_date) fd.append("due_date", payload.due_date);
  if (payload.owner_id) fd.append("owner_id", payload.owner_id);

  if (payload.files && payload.files.length > 0) {
    for (const f of payload.files) {
      fd.append("files", f);
    }
  }

  if (payload.file) {
    fd.append("files", payload.file);
  }

  const res = await api.post<ApiResp<{}>>("/api/tasks", fd, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...activeHeaders,
    },
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
  const finalPayload = {
    ...payload,
    due_date: payload.due_date === "" ? null : payload.due_date ?? null,
  };

  const res = await api.put<ApiResp<{}>>(`/api/tasks/${taskId}`, finalPayload, {
    headers: activeHeaders,
  });

  return res.data;
}

export async function deleteTask(taskId: string) {
  const res = await api.delete<ApiResp<{}>>(`/api/tasks/${taskId}`, {
    headers: activeHeaders,
  });
  return res.data;
}

export async function downloadAttachment(attachmentId: string) {
  const res = await api.get(`/api/attachments/${attachmentId}/download`, {
    responseType: "blob",
    headers: activeHeaders,
  });
  return res.data as Blob;
}

export async function getTaskComments(taskId: string) {
  const res = await api.get<ApiResp<{ comments: TaskComment[] }>>(
    `/api/tasks/${taskId}/comments`,
    {
      headers: activeHeaders,
    }
  );
  return res.data;
}

export async function addTaskComment(taskId: string, content: string) {
  const res = await api.post<ApiResp<{ comment: TaskComment }>>(
    `/api/tasks/${taskId}/comments`,
    { content },
    { headers: activeHeaders }
  );
  return res.data;
}

export async function updateTaskComment(commentId: string, content: string) {
  const res = await api.patch<ApiResp<{}>>(
    `/api/comments/${commentId}`,
    { content },
    { headers: activeHeaders }
  );
  return res.data;
}

export async function deleteTaskComment(commentId: string) {
  const res = await api.delete<ApiResp<{}>>(`/api/comments/${commentId}`, {
    headers: activeHeaders,
  });
  return res.data;
}