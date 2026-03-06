import { api } from "./axios";
import type { ApiResp } from "./types";

export type NotificationRow = {
  id: string;
  recipient_id: string;
  task_id: string | null;
  task_title?: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  actor_id?: string | null;
  actor_email?: string | null; // ✅
};

export async function getNotifications(params?: { unread_only?: boolean; limit?: number }) {
  const res = await api.get<ApiResp<{ notifications: NotificationRow[] }>>(
    "/api/notifications",
    { params } // ✅ no X-USER-ACTIVE
  );
  return res.data;
}

export async function markAllRead() {
  const res = await api.patch<ApiResp<{}>>(
    "/api/notifications/read-all",
    {},
    { headers: { "X-USER-ACTIVE": "1" } }
  );
  return res.data;
}

export async function markOneRead(id: string) {
  const res = await api.patch<ApiResp<{}>>(
    `/api/notifications/${id}/read`,
    {},
    { headers: { "X-USER-ACTIVE": "1" } }
  );
  return res.data;
}