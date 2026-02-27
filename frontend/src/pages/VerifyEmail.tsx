import { useEffect, useState } from "react";
//import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmailApi } from "../api/auth";
import { useSearchParams } from "react-router-dom";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  //const nav = useNavigate();
  const token = params.get("token") || "";

  const [msg, setMsg] = useState("Verifying...");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      if (!token) {
        setErr("Invalid verification link.");
        setMsg("");
        return;
      }
      try {
        const res = await verifyEmailApi(token);
const link = res.data?.set_password_link;
if (link) window.location.href = link;
else setMsg("Email verified ✅ You can login now.");
       } catch (e: any) {
        setErr(e?.response?.data?.message || e.message || "Verification failed");
        setMsg("");
      }
    })();
  }, [token]);

  return (
    <div className="page">
      <div className="card">
        <h2>Email Verification</h2>
        {msg && <div className="muted">{msg}</div>}
        {err && <div className="errorBox">{err}</div>}
      </div>
    </div>
  );
}
