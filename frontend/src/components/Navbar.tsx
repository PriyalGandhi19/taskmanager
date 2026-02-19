import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { logoutApi } from "../api/auth";

export default function Navbar() {
  const nav = useNavigate();
  const { user, refreshToken, clearAuth } = useAuth();

  const onLogout = async () => {
    try {
      if (refreshToken) await logoutApi(refreshToken);
    } catch {
      // ignore
    }
    clearAuth();
    nav("/login");
  };

  return (
    <div className="nav">
      <div className="nav-left">
        <b>Task Manager</b>
        <span className="muted">|</span>
        <span className="muted">{user?.email}</span>
        <span className="badge">{user?.role}</span>
      </div>
      <button className="btn" onClick={onLogout}>
        Logout
      </button>
    </div>
  );
}
