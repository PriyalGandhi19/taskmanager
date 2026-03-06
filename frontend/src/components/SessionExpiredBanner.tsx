import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SessionExpiredBanner() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  // check flag on mount + on storage changes (multi-tab)
  useEffect(() => {
    const sync = () => setShow(localStorage.getItem("SESSION_EXPIRED") === "1");
    sync();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "SESSION_EXPIRED") sync();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!show) return null;

  return (
    <div className="errorBox" style={{ margin: "12px 16px", display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span>Session expired. Please login again.</span>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn"
          onClick={() => {
            // keep banner until login success clears it
            navigate("/login");
          }}
        >
          Login
        </button>

        <button
          className="btn"
          onClick={() => {
            // if user just wants to hide it temporarily
            localStorage.removeItem("SESSION_EXPIRED");
            setShow(false);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}