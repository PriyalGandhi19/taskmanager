import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";

import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./store/authStore";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import SetPassword from "./pages/SetPassword";

import AdminAuthActivityPage from "./pages/admin/AdminAuthActivityPage";

// ✅ lazy components MUST be top-level
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminAuditPage = lazy(() => import("./pages/admin/AdminAuditPage"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));

export default function App() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<div className="muted" style={{ padding: 24 }}>Loading...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Public */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/set-password" element={<SetPassword />} />

        {/* Protected */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminAuditPage />
            </ProtectedRoute>
          }
        />

        <Route
  path="/admin/auth-activity"
  element={
    <ProtectedRoute roles={["ADMIN"]}>
      <AdminAuthActivityPage />
    </ProtectedRoute>
  }
/>

        <Route
          path="/me"
          element={
            <ProtectedRoute roles={["A", "B"]}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            user?.role === "ADMIN" ? (
              <Navigate to="/admin" replace />
            ) : user?.role ? (
              <Navigate to="/me" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}