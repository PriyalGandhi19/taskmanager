import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { reauthApi, logoutApi } from "../api/auth";
import { clearSessionExpiredFlag } from "../api/axios";
import { useSessionExpired } from "../hooks/useSessionExpired";

export default function SessionExpiredBanner() {
  const expired = useSessionExpired();
  const navigate = useNavigate();
  const { user, refreshToken, setAuth, clearAuth } = useAuth();

  const [dismissed, setDismissed] = useState(false);
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const visible = expired && !dismissed;

  useEffect(() => {
    if (expired) {
      setDismissed(false);
      setShowPasswordStep(false);
      setPassword("");
      setErr("");
    }
  }, [expired]);

  const onDismiss = () => {
    setDismissed(true);
    setErr("");
    setShowPasswordStep(false);
    setPassword("");
  };

  const onContinue = () => {
    setDismissed(false);
    setErr("");
    setShowPasswordStep(true);
  };

  const onLogout = async () => {
    try {
      if (refreshToken) {
        await logoutApi(refreshToken);
      }
    } catch {
      // ignore
    } finally {
      clearSessionExpiredFlag();
      clearAuth();
      navigate("/login");
    }
  };

  const onUnlock = async () => {
    if (!user?.email) {
      setErr("User session details missing. Please logout and login again.");
      return;
    }

    if (!password.trim()) {
      setErr("Password is required.");
      return;
    }

    try {
      setLoading(true);
      setErr("");

      const res = await reauthApi(user.email, password);

      if (!res.success || !res.data) {
        setErr(res.message || "Re-authentication failed");
        return;
      }

      setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
      clearSessionExpiredFlag();

      setDismissed(false);
      setShowPasswordStep(false);
      setPassword("");
      setErr("");

      window.dispatchEvent(new Event("SESSION_RESTORED_EVENT"));
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Incorrect password");
    } finally {
      setLoading(false);
    }
  };

  if (!expired) return null;

  return (
    <>
      <div className="session-top-banner">
        <span>Session expired. Your work area is locked.</span>
        <div className="session-top-actions">
          <button className="btn" onClick={onContinue}>
            Continue
          </button>
          <button className="btn" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>

      {visible && (
        <div className="session-modal-backdrop">
          <div className="session-modal" onMouseDown={(e) => e.stopPropagation()}>
            {!showPasswordStep ? (
              <>
                <h3 style={{ marginTop: 0 }}>Session expired</h3>
                <p className="muted" style={{ marginBottom: 16 }}>
                  Your session has expired. Re-enter your password to continue working,
                  or logout.
                </p>

                <div className="row">
                  <button className="btn" onClick={onDismiss}>
                    Dismiss
                  </button>
                  <button className="btn primary" onClick={onContinue}>
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>Continue session</h3>
                <p className="muted" style={{ marginBottom: 12 }}>
                  Enter your password to unlock your session.
                </p>

                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && password.trim() && !loading) {
                      onUnlock();
                    }
                  }}
                  placeholder="Password"
                  autoFocus
                />

                {err && <div className="errorBox">{err}</div>}

                <div className="row" style={{ marginTop: 14 }}>
                  <button
                    className="btn"
                    onClick={() => {
                      setShowPasswordStep(false);
                      setPassword("");
                      setErr("");
                    }}
                  >
                    Back
                  </button>

                  <button
                    className="btn primary"
                    onClick={onUnlock}
                    disabled={loading || !password.trim()}
                  >
                    {loading ? "Unlocking..." : "Unlock Session"}
                  </button>
                </div>
              </>
            )}

            <div style={{ marginTop: 16 }}>
              <button className="btn danger" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}