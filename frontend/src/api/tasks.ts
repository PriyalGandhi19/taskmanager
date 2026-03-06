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

  // ✅ NEW: multiple attachments
  files?: File[];

  // ✅ keep backward compatibility (optional)
  file?: File | null;
}) {
  // ✅ easiest: always multipart
  const fd = new FormData();
  fd.append("title", payload.title);
  fd.append("description", payload.description || "");
  fd.append("status", payload.status);
  fd.append("priority", payload.priority);

  if (payload.due_date) fd.append("due_date", payload.due_date);
  if (payload.owner_id) fd.append("owner_id", payload.owner_id);

  // ✅ NEW: append multiple files with key "files"
  if (payload.files && payload.files.length > 0) {
    for (const f of payload.files) {
      fd.append("files", f);
    }
  }

  // ✅ fallback (if someone still passes single file)
  if (payload.file) {
    fd.append("files", payload.file); // use "files" so backend reads one path
  }

  const res = await api.post<ApiResp<{}>>("/api/tasks", fd, {
    headers: {
      "Content-Type": "multipart/form-data",
      "X-USER-ACTIVE": "1",
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
  // ✅ If UI clears date, force null so backend clears it
  const finalPayload = {
    ...payload,
    due_date: payload.due_date === "" ? null : payload.due_date ?? null,
  };

  const res = await api.put<ApiResp<{}>>(`/api/tasks/${taskId}`, finalPayload, {
    headers: { "X-USER-ACTIVE": "1" },
  });

  return res.data;
}

export async function deleteTask(taskId: string) {
  const res = await api.delete<ApiResp<{}>>(`/api/tasks/${taskId}`, {
    headers: { "X-USER-ACTIVE": "1" },
  });
  return res.data;
}

export async function downloadAttachment(attachmentId: string) {
  const res = await api.get(`/api/attachments/${attachmentId}/download`, {
    responseType: "blob",
  });
  return res.data as Blob;
}

// GET comments for a task
export async function getTaskComments(taskId: string) {
  const res = await api.get<ApiResp<{ comments: TaskComment[] }>>(
    `/api/tasks/${taskId}/comments`
  );
  return res.data;
}

// POST add comment
export async function addTaskComment(taskId: string, content: string) {
  const res = await api.post<ApiResp<{ comment: TaskComment }>>(
    `/api/tasks/${taskId}/comments`,
    { content },
    { headers: { "X-USER-ACTIVE": "1" } }
  );
  return res.data;
}

export async function updateTaskComment(commentId: string, content: string) {
  const res = await api.patch<ApiResp<{}>>(
    `/api/comments/${commentId}`,
    { content },
    { headers: { "X-USER-ACTIVE": "1" } }
  );
  return res.data;
}

export async function deleteTaskComment(commentId: string) {
  const res = await api.delete<ApiResp<{}>>(`/api/comments/${commentId}`, {
    headers: { "X-USER-ACTIVE": "1" },
  });
  return res.data;
}