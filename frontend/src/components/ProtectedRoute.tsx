// import React from "react";
// import { Navigate } from "react-router-dom";
// import { useAuth } from "../store/authStore";

// export default function ProtectedRoute({
//   children,
//   roles,
// }: {
//   children: React.ReactNode;
//   roles?: Array<"ADMIN" | "A" | "B">;
// }) {
//   const { user, accessToken, isHydrated } = useAuth();

//   // ✅ wait till localStorage hydration
//   if (!isHydrated) return <div className="muted">Loading...</div>;

//   if (!user || !accessToken) return <Navigate to="/login" replace />;
//   if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
//   return <>{children}</>;
// }



import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { USE_JWT } from "../api/axios";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Array<"ADMIN" | "A" | "B">;
}) {
  const { user, accessToken, isHydrated } = useAuth();

  const [expired, setExpired] = useState(
    localStorage.getItem("SESSION_EXPIRED") === "1"
  );

  // ✅ instant same-tab update (works with axios SESSION_EXPIRED_EVENT)
  useEffect(() => {
    const sync = () =>
      setExpired(localStorage.getItem("SESSION_EXPIRED") === "1");

    const onExpired = () => sync();
    window.addEventListener("SESSION_EXPIRED_EVENT", onExpired);

    // ✅ multi-tab update
    const onStorage = (e: StorageEvent) => {
      if (e.key === "SESSION_EXPIRED") sync();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("SESSION_EXPIRED_EVENT", onExpired);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // ✅ wait till localStorage hydration
  if (!isHydrated) return <div className="muted">Loading...</div>;

  // ✅ If session expired => DON'T redirect (banner will show on same page)
  if (expired) return <>{children}</>;

  // ✅ SESSION MODE: only require user
  if (!USE_JWT) {
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
    return <>{children}</>;
  }

  // ✅ JWT MODE: require both user + accessToken
  if (!user || !accessToken) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;

  return <>{children}</>;
}