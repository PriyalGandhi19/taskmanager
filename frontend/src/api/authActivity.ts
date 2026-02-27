import { api } from "./axios";

export type AuthActivity = {
  id: number;
  user_id: string | null;
  email: string;
  event: "LOGIN" | "LOGOUT" | "FAILED_LOGIN";
  ip: string | null;
  user_agent: string | null;
  success: boolean;
  created_at: string;
};

type ApiResp<T> = { success: boolean; message: string; data?: T; errors?: any };

export type AuthActivityQuery = {
  limit?: number;
  page?: number;
  email?: string;
  from?: string;   // YYYY-MM-DD
  to?: string;     // YYYY-MM-DD

  // ✅ ADD THESE
  event?: "LOGIN" | "LOGOUT" | "FAILED_LOGIN" | string;
  success?: "true" | "false";
};

export type AuthActivityExportQuery = {
  email?: string;
  from?: string;
  to?: string;

  // ✅ ADD THESE
  event?: "LOGIN" | "LOGOUT" | "FAILED_LOGIN" | string;
  success?: "true" | "false";
};

export async function getAuthActivity(params?: AuthActivityQuery) {
  const res = await api.get<ApiResp<{ items: AuthActivity[]; page: number; limit: number; total: number }>>(
    "/api/admin/auth-activity",
    { params }
  );
  return res.data;
}

export async function exportAuthActivity(params?: AuthActivityExportQuery) {
  const res = await api.get("/api/admin/auth-activity/export", {
    params,
    responseType: "blob",
  });
  return res.data as Blob;
}