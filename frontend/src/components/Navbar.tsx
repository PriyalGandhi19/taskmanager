import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { logoutApi } from "../api/auth";
import NotificationBell from "./NotificationBell";
import { useSessionExpired } from "../hooks/useSessionExpired";
import { clearSessionExpiredFlag } from "../api/axios";

import { Link } from "react-router-dom";

export default function Navbar({ rightSlot }: { rightSlot?: ReactNode }) {
  const nav = useNavigate();
  const { user, refreshToken, clearAuth } = useAuth();
  const expired = useSessionExpired();

  const onLogout = async () => {
    try {
      if (refreshToken) await logoutApi(refreshToken);
    } catch {
      // ignore
    } finally {
      clearSessionExpiredFlag();
      clearAuth();
      nav("/login");
    }
  };

  return (
    <div className="nav session-aware-nav">
      <div className="nav-left">
        <b>Task Manager</b>
        <span className="muted">|</span>
        <span className="muted">{user?.email}</span>
        <span className="badge">{user?.role}</span>
      </div>



      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
  {!expired && rightSlot}
  {!expired && <NotificationBell />}
  <Link to="/profile" className="btn" style={{ textDecoration: "none" }}>
    Profile
  </Link>
  <button className="btn session-logout-btn" onClick={onLogout}>
    Logout
  </button>
</div>
    </div>
  );
}