// src/api/axios.ts
import axios, { AxiosError } from "axios";

// ============================
// OPTIONAL JWT imports (uncomment if JWT mode)
// ============================
// import { refreshApi } from "./auth";

import { authStorage } from "../store/authStorage";

// const baseURL = import.meta.env.VITE_API_BASE_URL;


const baseURL = import.meta.env.VITE_API_BASE_URL || "";

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
  withCredentials: true,
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
    // SESSION MODE: never send Bearer token
    if ((config.headers as any).Authorization) {
      delete (config.headers as any).Authorization;
    }
  }

  return config;
});

/* ============================
   SESSION EXPIRED STATE
============================ */
let sessionExpiredEmitted = false;

export function clearSessionExpiredFlag() {
  sessionExpiredEmitted = false;
  localStorage.removeItem("SESSION_EXPIRED");
  sessionStorage.removeItem("LOGIN_REASON");
  window.dispatchEvent(new Event("SESSION_EXPIRED_EVENT"));
}

/* ============================
   RESPONSE INTERCEPTOR
============================ */
api.interceptors.response.use(
  (response) => {
    // login / google login / reauth success => unlock app
    if (
      response.config.url?.includes("/api/auth/login") ||
      response.config.url?.includes("/api/auth/google") ||
      response.config.url?.includes("/api/auth/reauth")
    ) {
      clearSessionExpiredFlag();
    }

    return response;
  },

  async (error: AxiosError<any>) => {
    // ============================
    // SESSION MODE (cookie)
    // ============================
    if (!USE_JWT) {
      const status = error.response?.status;
      const code = error.response?.data?.errors?.code;
      const url = error.config?.url || "";

      const isAuthEndpoint =
        url.includes("/api/auth/login") ||
        url.includes("/api/auth/google") ||
        url.includes("/api/auth/refresh") ||
        url.includes("/api/auth/logout") ||
        url.includes("/api/auth/reauth");

      const isExpired =
        !isAuthEndpoint &&
        (code === "SESSION_EXPIRED" || status === 401);

      if (isExpired) {
        if (!sessionExpiredEmitted) {
          sessionExpiredEmitted = true;

          // mark app as locked
          localStorage.setItem("SESSION_EXPIRED", "1");
          sessionStorage.setItem("LOGIN_REASON", "expired");

          // IMPORTANT:
          // do NOT clear authStorage here
          // user/email needed for re-auth + logout flow
          window.dispatchEvent(new Event("SESSION_EXPIRED_EVENT"));
        }

        return Promise.reject(error);
      }

      return Promise.reject(error);
    }

    // ==========================================================
    // JWT MODE (OPTIONAL) - FULL REFRESH FLOW
    // Uncomment and use only when USE_JWT = true
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