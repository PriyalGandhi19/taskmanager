import { api } from "./axios";
import type { ApiResp } from "./types";

export type Profile = {
  id: string;
  email: string;
  role: "ADMIN" | "A" | "B";
  full_name: string;
  phone: string;
  bio: string;
  notify_email: boolean;
  notify_inapp: boolean;
};

export type UpdateProfileInput = {
  full_name: string;
  phone: string;
  bio: string;
  notify_email: boolean;
  notify_inapp: boolean;
};

export type ChangePasswordInput = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export async function getMyProfile() {
  const res = await api.get<ApiResp<Profile>>("/api/auth/me/profile");
  return res.data.data!;
}

export async function updateMyProfile(payload: UpdateProfileInput) {
  const res = await api.put<ApiResp<Profile>>("/api/auth/me/profile", payload);
  return res.data.data!;
}

export async function changeMyPassword(payload: ChangePasswordInput) {
  const res = await api.put<ApiResp<{}>>("/api/auth/me/change-password", payload);
  return res.data;
}