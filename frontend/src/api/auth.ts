import { api } from "./axios";
import type { User } from "../store/authStore";

type ApiResp<T> = { success: boolean; message: string; data?: T; errors?: any };

export async function loginApi(email: string, password: string) {
  const res = await api.post<ApiResp<{ access_token: string; refresh_token: string; user: User }>>(
    "/api/auth/login",
    { email, password }
  );
  return res.data;
}

export async function refreshApi(refreshToken: string) {
  const res = await api.post<ApiResp<{ access_token: string }>>("/api/auth/refresh", {
    refresh_token: refreshToken,
  });
  return res.data;
}

export async function logoutApi(refreshToken: string) {
  const res = await api.post<ApiResp<{}>>("/api/auth/logout", { refresh_token: refreshToken });
  return res.data;
}

export async function forgotPasswordApi(email: string) {
  const res = await api.post<ApiResp<{}>>("/api/auth/forgot-password", {
    email,
  });
  return res.data;
}

export async function resetPasswordApi(token: string, new_password: string) {
  const res = await api.post<ApiResp<{}>>("/api/auth/reset-password", {
    token,
    new_password,
  });
  return res.data;
}


export async function verifyEmailApi(token: string) {
  const res = await api.post<ApiResp<{}>>("/api/auth/verify-email", { token });
  return res.data;
}
