// src/api/axios.ts
import axios, { AxiosError } from "axios";
import { refreshApi } from "./auth";
import { authStorage } from "../store/authStorage";

const baseURL = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

/* ============================
   ATTACH ACCESS TOKEN
============================ */
api.interceptors.request.use((config) => {
  const token = authStorage.getAccess();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ============================
   REFRESH CONTROL
============================ */
let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

/* ============================
   RESPONSE INTERCEPTOR
============================ */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest: any = error.config;

    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing → queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((token) => {
            if (!token) return reject(error);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = authStorage.getRefresh();
        if (!refreshToken) throw error;

        // ✅ refresh
        const res = await refreshApi(refreshToken);

        // ✅ handle both shapes:
        // 1) { success, data: { access_token } }
        // 2) { access_token }
        const newAccess =
          (res as any)?.data?.access_token ||
          (res as any)?.access_token;

        const newRefresh =
          (res as any)?.data?.refresh_token ||
          (res as any)?.refresh_token;

       // console.log("REFRESH RES", res);

        if (!newAccess) throw error;

        authStorage.setAccess(newAccess);
        if (newRefresh) authStorage.setRefresh(newRefresh);

        // resolve queued requests
        pendingRequests.forEach((cb) => cb(newAccess));
        pendingRequests = [];

        // retry original
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        pendingRequests.forEach((cb) => cb(null));
        pendingRequests = [];

        authStorage.clearAll();
        window.location.assign("/login");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);