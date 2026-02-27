import { api } from "./axios";
import type { ApiResp } from "./types";

export type NotificationRow = {
  id: string;
  recipient_id: string;
  task_id: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export async function getNotifications(params?: { unread_only?: boolean; limit?: number }) {
  const res = await api.get<ApiResp<{ notifications: NotificationRow[] }>>("/api/notifications", { params });
  return res.data;
}

export async function markAllRead() {
  const res = await api.patch<ApiResp<{}>>("/api/notifications/read-all");
  return res.data;
}

export async function markOneRead(id: string) {
  const res = await api.patch<ApiResp<{}>>(`/api/notifications/${id}/read`);
  return res.data;
}