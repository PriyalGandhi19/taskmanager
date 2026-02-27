import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authStorage } from "./authStorage";

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
  isHydrated: boolean;            // ✅ NEW
  setAuth: (u: User, access: string, refresh: string) => void;
  setAccess: (access: string) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false); // ✅ NEW

  // 1) Load initial auth from localStorage (first render)
  useEffect(() => {
    const a = authStorage.getAccess();
    const r = authStorage.getRefresh();
    const u = authStorage.getUserRaw();

    if (a && r && u) {
      setAccessToken(a);
      setRefreshToken(r);
      try {
        setUser(JSON.parse(u));
      } catch {
        setUser(null);
      }
    }
    setIsHydrated(true); // ✅ important
  }, []);

  // 2) Multi-tab sync (works only for other tabs)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tm_access") setAccessToken(e.newValue);
      if (e.key === "tm_refresh") setRefreshToken(e.newValue);

      if (e.key === "tm_user") {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }

      if (e.key === "tm_access" && e.newValue === null) setAccessToken(null);
      if (e.key === "tm_refresh" && e.newValue === null) setRefreshToken(null);
      if (e.key === "tm_user" && e.newValue === null) setUser(null);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ✅ SAME TAB refresh update listener (storage event same tab me fire nahi hota)
  useEffect(() => {
  const onAccessUpdated = (e: any) => {
    const v = e?.detail as string | null | undefined;
    setAccessToken(v || null); // ✅ clears when null/empty
  };
  window.addEventListener("tm_access_updated", onAccessUpdated as EventListener);
  return () => window.removeEventListener("tm_access_updated", onAccessUpdated as EventListener);
}, []);

useEffect(() => {
  const onRefreshUpdated = (e: any) => {
    const v = e?.detail as string | null | undefined;
    setRefreshToken(v || null);
  };
  window.addEventListener("tm_refresh_updated", onRefreshUpdated as EventListener);
  return () => window.removeEventListener("tm_refresh_updated", onRefreshUpdated as EventListener);
}, []);

  const setAuth = (u: User, access: string, refresh: string) => {
    setUser(u);
    setAccessToken(access);
    setRefreshToken(refresh);
    authStorage.setAccess(access);
    authStorage.setRefresh(refresh);
    authStorage.setUser(u);
  };

  const setAccess = (access: string) => {
    setAccessToken(access);
    authStorage.setAccess(access);
  };

  const clearAuth = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    authStorage.clearAll();
  };

  const value = useMemo(
    () => ({ user, accessToken, refreshToken, isHydrated, setAuth, setAccess, clearAuth }),
    [user, accessToken, refreshToken, isHydrated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}