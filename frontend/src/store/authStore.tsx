// src/store/authStore.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "A" | "B";

export type User = {
  id: string;
  email: string;
  role: Role;
};

type AuthContextType = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (u: User, access: string, refresh: string) => void;
  setAccess: (access: string) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const LS_ACCESS = "tm_access";
const LS_REFRESH = "tm_refresh";
const LS_USER = "tm_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // 1) Load initial auth from localStorage (first render)
  useEffect(() => {
    const a = localStorage.getItem(LS_ACCESS);
    const r = localStorage.getItem(LS_REFRESH);
    const u = localStorage.getItem(LS_USER);

    if (a && r && u) {
      setAccessToken(a);
      setRefreshToken(r);
      try {
        setUser(JSON.parse(u));
      } catch {
        setUser(null);
      }
    }
  }, []);

  // 2) ✅ Multi-tab sync: when another tab updates localStorage
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_ACCESS) setAccessToken(e.newValue);
      if (e.key === LS_REFRESH) setRefreshToken(e.newValue);

      if (e.key === LS_USER) {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }

      // If another tab cleared everything, reflect it
      if (e.key === LS_ACCESS && e.newValue === null) setAccessToken(null);
      if (e.key === LS_REFRESH && e.newValue === null) setRefreshToken(null);
      if (e.key === LS_USER && e.newValue === null) setUser(null);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setAuth = (u: User, access: string, refresh: string) => {
    setUser(u);
    setAccessToken(access);
    setRefreshToken(refresh);
    localStorage.setItem(LS_ACCESS, access);
    localStorage.setItem(LS_REFRESH, refresh);
    localStorage.setItem(LS_USER, JSON.stringify(u));
  };

  const setAccess = (access: string) => {
    setAccessToken(access);
    localStorage.setItem(LS_ACCESS, access);
  };

  const clearAuth = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    localStorage.removeItem(LS_USER);
  };

  const value = useMemo(
    () => ({ user, accessToken, refreshToken, setAuth, setAccess, clearAuth }),
    [user, accessToken, refreshToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
