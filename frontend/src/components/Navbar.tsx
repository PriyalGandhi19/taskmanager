import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { logoutApi } from "../api/auth";
import NotificationBell from "./NotificationBell";
import { useEffect, useState } from "react";

export default function Navbar({ rightSlot }: { rightSlot?: ReactNode }) {
  const nav = useNavigate();
  const { user, refreshToken, clearAuth } = useAuth();

  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const handler = () => setExpired(true);
    if (localStorage.getItem("SESSION_EXPIRED") === "1") setExpired(true);
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, []);

  const onLogout = async () => {
    try {
      if (refreshToken) await logoutApi(refreshToken);
    } catch {
      // ignore
    }
    clearAuth();
    nav("/login"); // logout pe redirect OK
  };

  return (
    <>
      {/* ✅ Navbar */}
      <div className="nav">
        <div className="nav-left">
          <b>Task Manager</b>
          <span className="muted">|</span>
          <span className="muted">{user?.email}</span>
          <span className="badge">{user?.role}</span>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {rightSlot}
          <NotificationBell />
          <button className="btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* ✅ Session expired banner below navbar (image 2 like) */}
      {expired && (
        <div className="errorBox" style={{ margin: "12px 16px" }}>
          Session expired
        </div>
      )}
    </>
  );
}