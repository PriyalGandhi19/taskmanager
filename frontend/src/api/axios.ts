// src/api/axios.ts
import axios, { AxiosError } from "axios";

// ============================
// OPTIONAL JWT imports (uncomment if JWT mode)
// ============================
// import { refreshApi } from "./auth";

import { authStorage } from "../store/authStorage";

const baseURL = import.meta.env.VITE_API_BASE_URL;

// ============================
// MODE SWITCH
// ============================
// ✅ SESSION MODE (cookie) recommended for idle-timeout
export const USE_JWT = false;

// 🔁 If you want JWT mode:
// 1) set USE_JWT = true
// 2) uncomment import { refreshApi } from "./auth";
// 3) uncomment JWT block in response interceptor
// export const USE_JWT = true;

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // ✅ required for Django session cookies
});

/* ============================
   REQUEST INTERCEPTOR
============================ */
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  if (USE_JWT) {
    const token = authStorage.getAccess();
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  } else {
    // ✅ SESSION MODE: NEVER send Bearer token
    if ((config.headers as any).Authorization) {
      delete (config.headers as any).Authorization;
    }
  }

  return config;
});

/* ============================
   SESSION EXPIRED (emit once)
============================ */
let sessionExpiredEmitted = false;

/* ============================
   RESPONSE INTERCEPTOR
============================ */
api.interceptors.response.use(
  (response) => {
    // ✅ LOGIN SUCCESS → clear expire flag
    if (response.config.url?.includes("/api/auth/login")) {
      sessionExpiredEmitted = false;
      localStorage.removeItem("SESSION_EXPIRED");
    }

    return response;
  },

  async (error: AxiosError<any>) => {
    // ============================
    // ✅ SESSION MODE (cookie)
    // ============================
    if (
      !USE_JWT &&
      (error.response?.status === 401 ||
        error.response?.status === 403)
    ) {
      if (!sessionExpiredEmitted) {
        sessionExpiredEmitted = true;

        // ✅ set global expired flag
        localStorage.setItem("SESSION_EXPIRED", "1");

        // optional reason (if login page wants to read it)
        sessionStorage.setItem("LOGIN_REASON", "expired");

        // clear stored auth (tokens/user)
        authStorage.clearAll();

        // ✅ trigger instant same-tab banner update
        window.dispatchEvent(new Event("SESSION_EXPIRED_EVENT"));
      }

      return Promise.reject(error);
    }

    // ==========================================================
    // 🔁 JWT MODE (OPTIONAL) - FULL REFRESH FLOW
    // Uncomment everything below when USE_JWT = true
    // ==========================================================

    /*
    const originalRequest: any = error.config;
    if (!originalRequest) return Promise.reject(error);

    let isRefreshing = false;
    let pendingRequests: Array<(token: string | null) => void> = [];

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

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

        const res = await refreshApi(refreshToken);

        const newAccess =
          (res as any)?.data?.access_token ||
          (res as any)?.access_token;

        const newRefresh =
          (res as any)?.data?.refresh_token ||
          (res as any)?.refresh_token;

        if (!newAccess) throw error;

        authStorage.setAccess(newAccess);
        if (newRefresh) authStorage.setRefresh(newRefresh);

        pendingRequests.forEach((cb) => cb(newAccess));
        pendingRequests = [];

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
    */

    return Promise.reject(error);
  }
);

export default api;