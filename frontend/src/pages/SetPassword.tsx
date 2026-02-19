import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import PasswordStrength from "../components/PasswordStrength";
import { api } from "../api/axios";

export default function SetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get("token") || "";

  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    setMsg("");

    if (!pw || pw.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pw !== confirmPw) {
      setErr("Passwords do not match.");
      return;
    }

    try {
      const res = await api.post("/api/auth/set-password", {
        token,
        new_password: pw,
      });

      if (!res.data?.success) throw new Error(res.data?.message);

      setMsg("Password set ✅ You can login now.");
      setTimeout(() => nav("/login"), 900);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e.message || "Failed");
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h2>Set Password</h2>

        {!token && <div className="errorBox">Invalid link.</div>}
        {err && <div className="errorBox">{err}</div>}
        {msg && <div className="muted">{msg}</div>}

        <div className="form">
          <label>New Password</label>
          <input
            type="password"
            value={pw}
            disabled={!token}
            onChange={(e) => setPw(e.target.value)}
          />

          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPw}
            disabled={!token}
            onChange={(e) => setConfirmPw(e.target.value)}
          />

          {/* ✅ match rule only shows once confirmPw has some value */}
          <PasswordStrength
            password={pw}
            confirmPassword={confirmPw}
            showMatchRule={true}
          />

          <button className="btn primary" disabled={!token} onClick={submit}>
            Set Password
          </button>

          <div style={{ marginTop: 10 }}>
            <Link to="/login">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
