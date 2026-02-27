import { api } from "./axios";

export type AuditLog = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  payload: any;
  created_at: string;
};

import type { ApiResp } from "./types";

export async function getAuditLogs(params?: { limit?: number; action?: string; entity?: string }) {
  const res = await api.get<ApiResp<{ logs: AuditLog[] }>>("/api/admin/audit-logs", { params });
  return res.data;
}
