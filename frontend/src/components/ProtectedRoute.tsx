import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../store/authStore";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Array<"ADMIN" | "A" | "B">;
}) {
  const { user, accessToken, isHydrated } = useAuth();

  // ✅ wait till localStorage hydration
  if (!isHydrated) return <div className="muted">Loading...</div>;

  if (!user || !accessToken) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}