import axios, { AxiosError } from "axios";
import { refreshApi } from "./auth";

const baseURL = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

/* ============================
   TOKEN HELPERS
============================ */

function getAccess() {
  return localStorage.getItem("tm_access");
}

function getRefresh() {
  return localStorage.getItem("tm_refresh");
}

function setAccess(access: string) {
  localStorage.setItem("tm_access", access);
}

function clearAll() {
  localStorage.removeItem("tm_access");
  localStorage.removeItem("tm_refresh");
  localStorage.removeItem("tm_user");
}

/* ============================
   ATTACH ACCESS TOKEN
============================ */

api.interceptors.request.use((config) => {
  const token = getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ============================
   REFRESH CONTROL VARIABLES
============================ */

let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];
let lastRefreshAt = 0;

/* ============================
   RESPONSE INTERCEPTOR
============================ */

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest: any = error.config;

    // Only handle 401 once
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing → queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((token) => {
            if (!token) return reject(error);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = getRefresh();
        if (!refreshToken) throw error;

        /* ============================
           COOLDOWN PROTECTION
        ============================ */
        const now = Date.now();
        if (now - lastRefreshAt < 800) {
          throw error;
        }
        lastRefreshAt = now;

        const res = await refreshApi(refreshToken);
        const newAccess = res.data?.access_token;

        if (!newAccess) throw error;

        setAccess(newAccess);

        // resolve all queued requests
        pendingRequests.forEach((cb) => cb(newAccess));
        pendingRequests = [];

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);

      } catch (refreshError) {
        pendingRequests.forEach((cb) => cb(null));
        pendingRequests = [];

        clearAll(); // force logout
        window.location.href = "/login";

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
