import { api } from "./axios";
import type { User } from "../store/authStore";

import type { ApiResp } from "./types";

export async function listUsers() {
  const res = await api.get<ApiResp<{ users: User[] }>>("/api/admin/users");
  return res.data;
}

export async function createUser(payload: { email: string; role: "A" | "B" }) {
  const res = await api.post<ApiResp<{}>>("/api/admin/users/create", payload);
  return res.data;
}


export async function sendDocumentEmail(payload: {
  to_email: string;
  subject: string;
  body: string;
  file: File;
}) {
  const form = new FormData();
  form.append("to_email", payload.to_email);
  form.append("subject", payload.subject);
  form.append("body", payload.body);
  form.append("file", payload.file);

  const res = await api.post<ApiResp<{}>>("/api/admin/send-document", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}
